import axios from 'axios';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { CHAINS } from './blockchainService';
import { processRealTimeDeposit } from './depositService';
import { 
  isTransactionProcessed, 
  markTransactionProcessed,
  calculateTokenAmount 
} from './blockchainService';
import { ethers } from 'ethers';

// Interval in milliseconds (2 minutes)
const CHECK_INTERVAL = 2 * 60 * 1000;

let isRunning = false;
let checkerIntervalId = null;

/**
 * Start the deposit checker service
 * @returns {boolean} Success status
 */
export const startDepositChecker = () => {
  if (isRunning) {
    console.log('Deposit checker already running');
    return false;
  }
  
  // Run immediately, then every CHECK_INTERVAL
  runDepositCheck();
  
  checkerIntervalId = setInterval(runDepositCheck, CHECK_INTERVAL);
  isRunning = true;
  
  console.log(`Deposit checker started, running every ${CHECK_INTERVAL / 1000} seconds`);
  return true;
};

/**
 * Stop the deposit checker service
 * @returns {boolean} Success status
 */
export const stopDepositChecker = () => {
  if (!isRunning) {
    console.log('Deposit checker not running');
    return false;
  }
  
  clearInterval(checkerIntervalId);
  isRunning = false;
  
  console.log('Deposit checker stopped');
  return true;
};

/**
 * Check for new deposits for all users across all chains
 */
const runDepositCheck = async () => {
  try {
    console.log(`Running deposit check at ${new Date().toLocaleString()}`);
    
    // Get all users with wallet addresses
    const walletAddressesSnapshot = await getDocs(collection(db, 'walletAddresses'));
    
    if (walletAddressesSnapshot.empty) {
      console.log('No wallet addresses found');
      return;
    }
    
    console.log(`Found ${walletAddressesSnapshot.size} users with wallet addresses`);
    
    // Process each user's wallets
    const checkPromises = walletAddressesSnapshot.docs.map(async (doc) => {
      const userId = doc.id;
      const walletData = doc.data();
      
      return checkUserDeposits(userId, walletData.wallets || {});
    });
    
    // Wait for all checks to complete
    const results = await Promise.all(checkPromises);
    
    // Summarize results
    const totalDeposits = results.reduce((sum, result) => sum + result.depositsFound, 0);
    console.log(`Deposit check completed: found ${totalDeposits} new deposits`);
  } catch (error) {
    console.error('Error running deposit check:', error);
  }
};

/**
 * Check deposits for a specific user
 * @param {string} userId - User ID
 * @param {Object} wallets - User's wallet addresses by chain
 * @returns {Object} Check results
 */
const checkUserDeposits = async (userId, wallets) => {
  let depositsFound = 0;
  
  try {
    // Check each chain for the user
    for (const [chain, address] of Object.entries(wallets)) {
      if (!CHAINS[chain]) {
        console.log(`Skipping unsupported chain: ${chain}`);
        continue;
      }
      
      try {
        const chainDeposits = await checkChainDeposits(userId, chain, address);
        depositsFound += chainDeposits;
      } catch (chainError) {
        console.error(`Error checking ${chain} deposits for user ${userId}:`, chainError);
      }
    }
    
    return { userId, depositsFound };
  } catch (error) {
    console.error(`Error checking deposits for user ${userId}:`, error);
    return { userId, depositsFound, error: error.message };
  }
};

/**
 * Check deposits for a specific chain and address
 * @param {string} userId - User ID
 * @param {string} chain - Blockchain chain
 * @param {string} address - Wallet address
 * @returns {number} Number of deposits found and processed
 */
const checkChainDeposits = async (userId, chain, address) => {
  let depositsFound = 0;
  
  try {
    // Get transactions from blockchain explorer API
    const transactions = await fetchTransactions(chain, address);
    
    if (!transactions || transactions.length === 0) {
      return 0;
    }
    
    console.log(`Found ${transactions.length} transactions for ${chain} address ${address}`);
    
    // Process each transaction
    for (const tx of transactions) {
      const depositInfo = await processTransaction(userId, chain, address, tx);
      
      if (depositInfo) {
        depositsFound++;
      }
    }
    
    return depositsFound;
  } catch (error) {
    console.error(`Error checking ${chain} deposits for address ${address}:`, error);
    return 0;
  }
};

/**
 * Fetch transactions from blockchain explorer API
 * @param {string} chain - Blockchain chain
 * @param {string} address - Wallet address
 * @returns {Array} Transactions
 */
const fetchTransactions = async (chain, address) => {
  try {
    if (chain === 'solana') {
      return fetchSolanaTransactions(address);
    }
    
    // For EVM chains, use the explorer API
    const apiUrl = `${CHAINS[chain].scanApi}?module=account&action=txlist&address=${address}&sort=desc&apikey=${CHAINS[chain].apiKey}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    
    if (response.data.status === '0') {
      console.log(`API returned error for ${chain}: ${response.data.message}`);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return [];
  }
};

/**
 * Fetch Solana transactions
 * @param {string} address - Wallet address
 * @returns {Array} Transactions
 */
const fetchSolanaTransactions = async (address) => {
  try {
    const url = `${CHAINS.solana.scanApi}/account/transactions?account=${address}&limit=50`;
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return [];
  }
};

/**
 * Process a transaction to check if it's a deposit
 * @param {string} userId - User ID
 * @param {string} chain - Blockchain chain
 * @param {string} address - Wallet address
 * @param {Object} tx - Transaction data
 * @returns {Object|null} Deposit info if processed
 */
const processTransaction = async (userId, chain, address, tx) => {
  try {
    // Skip if transaction has no hash
    if (!tx.hash && !tx.txid && !tx.txHash && !tx.signature) {
      return null;
    }
    
    // Normalize transaction hash
    const txHash = tx.hash || tx.txid || tx.txHash || tx.signature;
    
    // Check if already processed
    const alreadyProcessed = await isTransactionProcessed(txHash, chain);
    if (alreadyProcessed) {
      return null;
    }
    
    // Check if it's a deposit
    let depositInfo = null;
    
    if (chain === 'solana') {
      depositInfo = await processSolanaTransaction(userId, tx, address);
    } else {
      depositInfo = await processEVMTransaction(userId, tx, address, chain);
    }
    
    if (!depositInfo) {
      return null;
    }
    
    // Process the deposit - this function will also update the user's balance
    await processRealTimeDeposit(userId, {
      amount: depositInfo.amount,
      token: depositInfo.token,
      chain,
      txHash,
      fromAddress: depositInfo.fromAddress,
      toAddress: address,
      isRealDeposit: true
    });
    
    // Mark transaction as processed
    await markTransactionProcessed(txHash, chain, userId, {
      amount: depositInfo.amount,
      token: depositInfo.token,
      processedAt: serverTimestamp()
    });
    
    // Trigger a custom event that UserProfile can listen for
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('newDeposit', { 
        detail: { 
          userId, 
          amount: depositInfo.amount, 
          token: depositInfo.token 
        } 
      });
      window.dispatchEvent(event);
    }
    
    console.log(`Processed deposit: ${depositInfo.amount} ${depositInfo.token} for user ${userId} on ${chain}`);
    return depositInfo;
  } catch (error) {
    console.error(`Error processing transaction for user ${userId}:`, error);
    return null;
  }
};

/**
 * Process Solana transaction
 * @param {string} userId - User ID
 * @param {Object} tx - Transaction data
 * @param {string} address - Wallet address
 * @returns {Object|null} Deposit info if it's a deposit
 */
const processSolanaTransaction = async (userId, tx, address) => {
  try {
    // If Solana transaction has tokenTransfers, process them
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      // Find transfers where this address is the destination
      const relevantTransfer = tx.tokenTransfers.find(transfer => 
        transfer.destination === address
      );
      
      if (relevantTransfer) {
        return {
          amount: parseFloat(relevantTransfer.amount),
          token: relevantTransfer.symbol || 'SOL',
          fromAddress: relevantTransfer.source || 'unknown',
          toAddress: address,
          chain: 'solana',
          isDeposit: true
        };
      }
    } else if (tx.lamportTransfers) {
      // For native SOL transfers
      const relevantTransfer = tx.lamportTransfers.find(transfer => 
        transfer.destination === address
      );
      
      if (relevantTransfer) {
        // Convert lamports to SOL (1 SOL = 1e9 lamports)
        const amount = parseFloat(relevantTransfer.amount) / 1e9;
        
        return {
          amount,
          token: 'SOL',
          fromAddress: relevantTransfer.source || 'unknown',
          toAddress: address,
          chain: 'solana',
          isDeposit: true
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing Solana transaction:', error);
    return null;
  }
};

/**
 * Process EVM transaction
 * @param {string} userId - User ID
 * @param {Object} tx - Transaction data
 * @param {string} address - Wallet address
 * @param {string} chain - Blockchain chain
 * @returns {Object|null} Deposit info if it's a deposit
 */
const processEVMTransaction = async (userId, tx, address, chain) => {
  try {
    if (!tx || !address) return null;
    
    // Normalize addresses for comparison
    const normalizedAddress = address.toLowerCase();
    const normalizedTo = (tx.to || '').toLowerCase();
    
    // Native token transfer to our address
    if (normalizedTo === normalizedAddress && tx.value && tx.value !== '0') {
      // Calculate amount in native token
      const valueInWei = tx.value;
      const amount = parseFloat(ethers.utils.formatEther(valueInWei));
      
      return {
        amount,
        token: CHAINS[chain].symbol,
        fromAddress: tx.from,
        toAddress: tx.to,
        chain,
        isDeposit: true,
        txHash: tx.hash
      };
    }
    
    // ERC20 token transfer detection
    if (tx.input && tx.input.startsWith('0xa9059cbb')) {
      const tokenAddress = tx.to;
      const inputData = tx.input;
      
      if (inputData.length >= 138) {
        // Extract recipient address (0xa9059cbb + 32 bytes padding for address)
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
            
            // Convert hex amount to decimal based on token decimals
            const amount = calculateTokenAmount(amountHex, tokenInfo.decimals);
            
            return {
              amount,
              token: tokenInfo.symbol,
              fromAddress: tx.from,
              toAddress: recipient,
              tokenAddress,
              chain,
              isDeposit: true,
              txHash: tx.hash
            };
          }
        } catch (err) {
          console.error('Error parsing ERC20 transfer:', err);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing EVM transaction:', error);
    return null;
  }
};

/**
 * Get token information for an ERC20 token address
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Blockchain chain
 * @returns {Object} Token info with symbol and decimals
 */
const getTokenInfo = async (tokenAddress, chain) => {
  try {
    // Try to get token from API first
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
    
    // Check if we have this token in our list
    const normalizedAddress = tokenAddress.toLowerCase();
    if (commonTokens[chain] && commonTokens[chain][normalizedAddress]) {
      return commonTokens[chain][normalizedAddress];
    }
    
    // Default to unknown token with 18 decimals
    return { symbol: 'UNKNOWN', decimals: 18 };
  } catch (error) {
    console.error(`Error getting token info for ${tokenAddress}:`, error);
    return { symbol: 'UNKNOWN', decimals: 18 };
  }
};

// Export the service for use in the app
export default {
  startDepositChecker,
  stopDepositChecker
}; 