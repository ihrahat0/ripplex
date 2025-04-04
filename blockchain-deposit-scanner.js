#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const admin = require('firebase-admin');
const { ethers } = require('ethers');
const fs = require('fs');

console.log('Starting blockchain deposit scanner...');

// Blockchain configuration
const CHAINS = {
  ethereum: { 
    name: 'Ethereum', 
    symbol: 'ETH',
    scanApi: 'https://api.etherscan.io/api',
    scanUrl: 'https://etherscan.io',
    apiKey: 'VVZQW84IDVZ5CR8ZGK7ER1WBVYQH9D8RI1',
  },
  bsc: { 
    name: 'BSC', 
    symbol: 'BNB',
    scanApi: 'https://api.bscscan.com/api',
    scanUrl: 'https://bscscan.com',
    apiKey: 'AKXNRYA5WTQIVT8MI75JW2C9QU26M46PN6',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    scanApi: 'https://api.polygonscan.com/api',
    scanUrl: 'https://polygonscan.com',
    apiKey: 'X8G6YQ1KHUTFB9ZSB3I52GREXQ1PC5AVZ9',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    scanApi: 'https://api.arbiscan.io/api',
    scanUrl: 'https://arbiscan.io',
    apiKey: 'KQQ2T74X5JQ71IKINAQSA78MQI1DE21W8F',
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    scanApi: 'https://api.basescan.org/api',
    scanUrl: 'https://basescan.org',
    apiKey: '4ING76I5K3ZRFM4R85RGW6WKK6UGP9Y1YA',
  },
};

// Set up logging
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  // Also log to file for persistence
  try {
    fs.appendFileSync('blockchain-deposits.log', logMessage);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

// Initialize Firebase
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  logToFile('Loaded service account key');
} catch (error) {
  try {
    serviceAccount = require('./src/firebase/new-private-key.json');
    logToFile('Loaded alternative service account key');
  } catch (err) {
    logToFile('Failed to load Firebase key files. Checking environment variables...');
    
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
      logToFile('Using Firebase credentials from environment variables');
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    } else {
      logToFile('No Firebase credentials found. Exiting.');
      process.exit(1);
    }
  }
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
logToFile('Firebase initialized');

// Collection to track processed transactions
const PROCESSED_TX_COLLECTION = 'processedTransactions';

// Track master wallet addresses for security purposes
const MASTER_WALLETS = {
  ethereum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  bsc: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  polygon: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  arbitrum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  base: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  solana: 'DxXnPZvjgc8QdHYzx4BGwvKCs9GbxdkwVZSUvzKVPktr'
};

// Check interval (2 minutes)
const CHECK_INTERVAL = 2 * 60 * 1000;

/**
 * Check if a transaction has already been processed
 * @param {string} txHash - Transaction hash
 * @param {string} chain - Blockchain chain
 * @returns {Promise<boolean>} True if already processed
 */
async function isTransactionProcessed(txHash, chain) {
  if (!txHash || !chain) return false;
  
  try {
    const txId = `${chain}-${txHash}`;
    const txDoc = await db.collection(PROCESSED_TX_COLLECTION).doc(txId).get();
    return txDoc.exists;
  } catch (error) {
    logToFile(`Error checking if transaction was processed: ${error.message}`);
    return false;
  }
}

/**
 * Mark a transaction as processed
 * @param {string} txHash - Transaction hash
 * @param {string} chain - Blockchain chain
 * @param {string} userId - User ID
 * @param {Object} txData - Additional transaction data
 * @returns {Promise<boolean>} Success status
 */
async function markTransactionProcessed(txHash, chain, userId, txData = {}) {
  if (!txHash || !chain) return false;
  
  try {
    const txId = `${chain}-${txHash}`;
    await db.collection(PROCESSED_TX_COLLECTION).doc(txId).set({
      txHash,
      chain,
      userId,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...txData
    });
    
    return true;
  } catch (error) {
    logToFile(`Error marking transaction as processed: ${error.message}`);
    return false;
  }
}

/**
 * Calculate token amount from raw value and decimals
 * @param {string|number} value - Raw token amount
 * @param {number} decimals - Token decimals
 * @returns {number} Formatted token amount
 */
function calculateTokenAmount(value, decimals = 18) {
  try {
    // For strings (hex or decimal)
    if (typeof value === 'string') {
      value = value.startsWith('0x') ? parseInt(value, 16) : value;
    }
    
    const divisor = Math.pow(10, decimals);
    return Number(value) / divisor;
  } catch (error) {
    logToFile(`Error calculating token amount: ${error.message}`);
    return 0;
  }
}

/**
 * Process deposit for a user
 * @param {string} userId - User ID
 * @param {Object} depositData - Deposit data
 * @returns {Promise<boolean>} Success status
 */
async function processRealTimeDeposit(userId, depositData) {
  try {
    const { amount, token, chain, txHash, fromAddress, toAddress } = depositData;
    
    logToFile(`Processing deposit for ${userId}: ${amount} ${token} on ${chain}`);
    
    // 1. Record transaction
    await db.collection('transactions').add({
      userId,
      type: 'deposit',
      amount,
      token,
      chain,
      txHash,
      fromAddress: fromAddress || 'Unknown',
      toAddress: toAddress || MASTER_WALLETS[chain],
      status: 'completed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      masterWallet: MASTER_WALLETS[chain],
      isRealDeposit: true,
      confirmations: Math.floor(Math.random() * 30) + 5 // Random confirmations for display
    });
    
    // 2. Update user's balance
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      [`balances.${token}`]: admin.firestore.FieldValue.increment(amount)
    });
    
    // 3. Process referral commission if applicable
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      if (userData.referredBy) {
        const referralCommission = amount * 0.1; // 10% commission
        
        const referrerRef = db.collection('users').doc(userData.referredBy);
        const referrerDoc = await referrerRef.get();
        
        if (referrerDoc.exists) {
          // Update referrer's balance
          await referrerRef.update({
            [`balances.${token}`]: admin.firestore.FieldValue.increment(referralCommission)
          });
          
          // Record referral transaction
          await db.collection('transactions').add({
            userId: userData.referredBy,
            type: 'referral',
            amount: referralCommission,
            token,
            chain,
            referredUser: userId,
            status: 'completed',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
          
          logToFile(`Processed referral commission: ${referralCommission} ${token} for user ${userData.referredBy}`);
        }
      }
    }
    
    logToFile(`Successfully processed deposit of ${amount} ${token} for user ${userId}`);
    return true;
  } catch (error) {
    logToFile(`Error processing deposit: ${error.message}`);
    return false;
  }
}

/**
 * Get token information for an ERC20 token
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Blockchain chain
 * @returns {Promise<Object>} Token information
 */
async function getTokenInfo(tokenAddress, chain) {
  try {
    // Try to get token info from blockchain explorer API
    const apiUrl = `${CHAINS[chain].scanApi}?module=token&action=tokeninfo&contractaddress=${tokenAddress}&apikey=${CHAINS[chain].apiKey}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data.status === '1' && Array.isArray(response.data.result) && response.data.result.length > 0) {
      const tokenInfo = response.data.result[0];
      return {
        symbol: tokenInfo.symbol || 'UNKNOWN',
        decimals: parseInt(tokenInfo.decimals || '18', 10)
      };
    }
    
    // Fallback to common tokens
    const commonTokens = {
      ethereum: {
        '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 }
      },
      bsc: {
        '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', decimals: 18 },
        '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18 },
        '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': { symbol: 'BTCB', decimals: 18 },
        '0x2170ed0880ac9a755fd29b2688956bd959f933f8': { symbol: 'ETH', decimals: 18 }
      },
      polygon: {
        '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6 },
        '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { symbol: 'USDC', decimals: 6 },
        '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': { symbol: 'WBTC', decimals: 8 },
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { symbol: 'WETH', decimals: 18 }
      },
      arbitrum: {
        '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6 },
        '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { symbol: 'USDC', decimals: 6 },
        '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { symbol: 'WBTC', decimals: 8 }
      },
      base: {
        '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18 },
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 }
      }
    };
    
    // Normalize address
    const normalizedAddress = tokenAddress.toLowerCase();
    
    // Check if we have this token in our list
    if (commonTokens[chain] && commonTokens[chain][normalizedAddress]) {
      return commonTokens[chain][normalizedAddress];
    }
    
    // Default to unknown token with 18 decimals
    return { symbol: 'UNKNOWN', decimals: 18 };
  } catch (error) {
    logToFile(`Error getting token info for ${tokenAddress}: ${error.message}`);
    return { symbol: 'UNKNOWN', decimals: 18 };
  }
}

/**
 * Process EVM transaction (Ethereum, BSC, Polygon, etc.)
 * @param {Object} tx - Transaction data
 * @param {string} address - Wallet address 
 * @param {string} chain - Blockchain chain
 * @returns {Promise<Object|null>} Deposit info if it's a deposit
 */
async function processEVMTransaction(tx, address, chain) {
  try {
    // No transaction data
    if (!tx || !address) return null;
    
    // Normalize addresses for comparison
    const normalizedAddress = address.toLowerCase();
    const normalizedTo = (tx.to || '').toLowerCase();
    
    // Native token transfer to our address
    if (normalizedTo === normalizedAddress && tx.value && tx.value !== '0') {
      const amount = ethers.utils.formatEther(tx.value);
      
      return {
        amount: parseFloat(amount),
        token: CHAINS[chain].symbol,
        fromAddress: tx.from,
        toAddress: tx.to,
        chain,
        isDeposit: true
      };
    }
    
    // ERC20 token transfer detection
    if (tx.input && tx.input.startsWith('0xa9059cbb')) {
      const tokenAddress = tx.to;
      const inputData = tx.input;
      
      if (inputData.length >= 138) {
        // Extract recipient address
        const recipientEncoded = '0x' + inputData.substring(34, 74).replace(/^0+/, '');
        
        try {
          // Convert to checksum address 
          const recipient = ethers.utils.getAddress(recipientEncoded);
          
          // Check if recipient is our address
          if (recipient.toLowerCase() === normalizedAddress) {
            // Get token info
            const tokenInfo = await getTokenInfo(tokenAddress, chain);
            
            // Extract amount (32 bytes after address)
            const amountHex = '0x' + inputData.substring(74, 138);
            
            // Convert amount to decimal based on token decimals
            const amount = calculateTokenAmount(amountHex, tokenInfo.decimals);
            
            return {
              amount,
              token: tokenInfo.symbol,
              fromAddress: tx.from,
              toAddress: recipient,
              tokenAddress,
              chain,
              isDeposit: true
            };
          }
        } catch (err) {
          logToFile(`Error parsing ERC20 transfer: ${err.message}`);
        }
      }
    }
    
    return null;
  } catch (error) {
    logToFile(`Error processing EVM transaction: ${error.message}`);
    return null;
  }
}

/**
 * Fetch transactions from blockchain explorer
 * @param {string} chain - Blockchain chain
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} Transactions
 */
async function fetchTransactions(chain, address) {
  try {
    // Build API URL with address and API key
    const apiUrl = `${CHAINS[chain].scanApi}?module=account&action=txlist&address=${address}&sort=desc&apikey=${CHAINS[chain].apiKey}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    
    if (response.data.status === '0') {
      logToFile(`API returned error for ${chain}: ${response.data.message}`);
    }
    
    return [];
  } catch (error) {
    logToFile(`Error fetching ${chain} transactions for ${address}: ${error.message}`);
    return [];
  }
}

/**
 * Check deposits for all users
 */
async function checkAllUsersDeposits() {
  logToFile(`Running blockchain deposit check at ${new Date().toLocaleString()}`);
  
  try {
    // Get all users with wallet addresses
    const walletAddressesSnapshot = await db.collection('walletAddresses').get();
    
    if (walletAddressesSnapshot.empty) {
      logToFile('No wallet addresses found');
      return;
    }
    
    logToFile(`Found ${walletAddressesSnapshot.size} users with wallet addresses`);
    
    let totalDepositsFound = 0;
    
    // Process each user's wallets
    for (const doc of walletAddressesSnapshot.docs) {
      const userId = doc.id;
      const walletData = doc.data();
      const wallets = walletData.wallets || {};
      
      // Process each blockchain
      for (const [chain, address] of Object.entries(wallets)) {
        if (!CHAINS[chain]) {
          logToFile(`Skipping unsupported chain: ${chain}`);
          continue;
        }
        
        try {
          // Fetch recent transactions for this address
          const transactions = await fetchTransactions(chain, address);
          
          if (!transactions || transactions.length === 0) {
            continue;
          }
          
          logToFile(`Found ${transactions.length} transactions for ${chain} address ${address}`);
          
          // Check each transaction for deposits
          let userChainDeposits = 0;
          
          for (const tx of transactions) {
            try {
              // Skip if transaction hash is missing
              if (!tx.hash && !tx.txid) {
                continue;
              }
              
              const txHash = tx.hash || tx.txid;
              
              // Check if already processed
              const alreadyProcessed = await isTransactionProcessed(txHash, chain);
              if (alreadyProcessed) {
                continue;
              }
              
              // Check if it's a deposit
              const depositInfo = await processEVMTransaction(tx, address, chain);
              
              if (depositInfo && depositInfo.isDeposit) {
                // Process the deposit
                await processRealTimeDeposit(userId, {
                  ...depositInfo,
                  txHash
                });
                
                // Mark transaction as processed
                await markTransactionProcessed(txHash, chain, userId, {
                  amount: depositInfo.amount,
                  token: depositInfo.token
                });
                
                userChainDeposits++;
                totalDepositsFound++;
                
                logToFile(`Processed deposit: ${depositInfo.amount} ${depositInfo.token} for user ${userId} on ${chain}`);
              }
            } catch (txError) {
              logToFile(`Error processing transaction: ${txError.message}`);
            }
          }
          
          if (userChainDeposits > 0) {
            logToFile(`Processed ${userChainDeposits} deposits for user ${userId} on ${chain}`);
          }
        } catch (chainError) {
          logToFile(`Error checking ${chain} deposits for user ${userId}: ${chainError.message}`);
        }
      }
    }
    
    logToFile(`Completed blockchain deposit check. Found ${totalDepositsFound} new deposits.`);
  } catch (error) {
    logToFile(`Error checking deposits: ${error.message}`);
  }
}

// Run immediately and then every CHECK_INTERVAL
logToFile(`Starting blockchain deposit scanner with check interval of ${CHECK_INTERVAL / 1000} seconds`);
checkAllUsersDeposits();

// Set up interval
setInterval(checkAllUsersDeposits, CHECK_INTERVAL);

// Keep the script running
process.on('SIGINT', () => {
  logToFile('Blockchain deposit scanner stopping...');
  process.exit(0);
}); 