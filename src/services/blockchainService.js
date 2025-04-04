import axios from 'axios';
import { ethers } from 'ethers';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  setDoc,
  increment
} from 'firebase/firestore';
import { SUPPORTED_CHAINS } from './walletService';
import { processRealTimeDeposit } from './depositService';

// Blockchain configuration for different networks
export const CHAINS = {
  ethereum: { 
    name: 'Ethereum', 
    symbol: 'ETH',
    scanApi: 'https://api.etherscan.io/api',
    scanUrl: 'https://etherscan.io',
    apiKey: 'VVZQW84IDVZ5CR8ZGK7ER1WBVYQH9D8RI1',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
  },
  bsc: { 
    name: 'BSC', 
    symbol: 'BNB',
    scanApi: 'https://api.bscscan.com/api',
    scanUrl: 'https://bscscan.com',
    apiKey: 'AKXNRYA5WTQIVT8MI75JW2C9QU26M46PN6',
    rpcUrl: 'https://bsc-dataseed.binance.org',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    scanApi: 'https://api.polygonscan.com/api',
    scanUrl: 'https://polygonscan.com',
    apiKey: 'X8G6YQ1KHUTFB9ZSB3I52GREXQ1PC5AVZ9',
    rpcUrl: 'https://polygon-rpc.com',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    scanApi: 'https://api.arbiscan.io/api',
    scanUrl: 'https://arbiscan.io',
    apiKey: 'KQQ2T74X5JQ71IKINAQSA78MQI1DE21W8F',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    scanApi: 'https://api.basescan.org/api',
    scanUrl: 'https://basescan.org',
    apiKey: '4ING76I5K3ZRFM4R85RGW6WKK6UGP9Y1YA',
    rpcUrl: 'https://mainnet.base.org',
  },
  // Add Solana specific configuration if needed
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    scanApi: 'https://public-api.solscan.io',
    scanUrl: 'https://solscan.io',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  }
};

// Collection to track processed transactions to prevent double-funding
const PROCESSED_TX_COLLECTION = 'processedTransactions';

/**
 * Get provider for a specific blockchain
 * @param {string} chain - Chain ID
 * @returns {ethers.Provider} Provider instance
 */
const getProvider = (chain) => {
  if (!CHAINS[chain]) {
    throw new Error(`Unsupported blockchain: ${chain}`);
  }
  
  // Use JsonRpcProvider from ethers.providers for ethers v5
  return new ethers.providers.JsonRpcProvider(CHAINS[chain].rpcUrl);
};

/**
 * Check if a transaction has already been processed
 * @param {string} txHash - Transaction hash
 * @param {string} chain - Blockchain chain
 * @returns {Promise<boolean>} True if transaction was already processed
 */
export const isTransactionProcessed = async (txHash, chain) => {
  if (!txHash || !chain) return false;
  
  try {
    // Create a unique ID for this transaction
    const txId = `${chain}-${txHash}`;
    
    // Check if the transaction exists in the processed transactions collection
    const txDoc = await getDoc(doc(db, PROCESSED_TX_COLLECTION, txId));
    
    return txDoc.exists();
  } catch (error) {
    console.error('Error checking if transaction was processed:', error);
    return false;
  }
};

/**
 * Mark a transaction as processed to prevent double-funding
 * @param {string} txHash - Transaction hash
 * @param {string} chain - Blockchain chain
 * @param {string} userId - User ID
 * @param {Object} txData - Additional transaction data
 * @returns {Promise<boolean>} Success status
 */
export const markTransactionProcessed = async (txHash, chain, userId, txData = {}) => {
  if (!txHash || !chain) {
    console.warn('Cannot mark transaction as processed: missing txHash or chain');
    return false;
  }
  
  try {
    console.log(`Marking transaction ${txHash} as processed for user ${userId} on ${chain}`);
    
    // Create a unique ID for this transaction
    const txId = `${chain}-${txHash}`;
    
    // Check if already processed to prevent duplicate entries
    const existingDoc = await getDoc(doc(db, PROCESSED_TX_COLLECTION, txId));
    if (existingDoc.exists()) {
      console.log(`Transaction ${txHash} already marked as processed`);
      return true;
    }
    
    // Include more detailed information in the processed transaction record
    const processedTxData = {
      txHash,
      chain,
      userId,
      processedAt: serverTimestamp(),
      timestamp: new Date().toISOString(), // Backup timestamp
      ...txData,
      processed: true
    };
    
    // Add entry to the processed transactions collection
    await setDoc(doc(db, PROCESSED_TX_COLLECTION, txId), processedTxData);
    
    console.log(`Successfully marked transaction ${txHash} as processed`);
    return true;
  } catch (error) {
    console.error('Error marking transaction as processed:', error);
    return false;
  }
};

/**
 * Fetch transaction history for an Ethereum-compatible address
 * @param {string} address - Wallet address
 * @param {string} chain - Blockchain chain
 * @returns {Promise<Array>} Array of transactions
 */
export const fetchEVMTransactions = async (address, chain) => {
  if (!address || !chain || !CHAINS[chain]) {
    return [];
  }
  
  try {
    // Use blockchain explorer API instead of direct RPC calls for better historical data
    const apiUrl = `${CHAINS[chain].scanApi}?module=account&action=txlist&address=${address}&sort=desc&apikey=${CHAINS[chain].apiKey}`;
    
    const response = await axios.get(apiUrl);
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return [];
  }
};

/**
 * Fetch transaction history for a Solana address
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} Array of transactions
 */
export const fetchSolanaTransactions = async (address) => {
  if (!address) return [];
  
  try {
    const response = await axios.get(`${CHAINS.solana.scanApi}/account/transactions?account=${address}&limit=100`);
    
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
 * Get transaction details for specific chain and address
 * @param {string} chain - Blockchain chain
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} Array of transactions
 */
export const getTransactionHistory = async (chain, address) => {
  if (chain === 'solana') {
    return fetchSolanaTransactions(address);
  } else {
    return fetchEVMTransactions(address, chain);
  }
};

/**
 * Get default token for a blockchain
 * @param {string} chain - Blockchain chain ID
 * @returns {string} Default token symbol
 */
const getDefaultTokenForChain = (chain) => {
  return CHAINS[chain]?.symbol || 'USDT';
};

/**
 * Get token info for a token address
 * @param {string} tokenAddress - Token contract address
 * @param {string} chain - Blockchain chain
 * @returns {Object|null} Token info if found
 */
export const getTokenInfoForAddress = async (tokenAddress, chain) => {
  // In a production environment, you would fetch this from a token database or blockchain
  // For now, we'll use a hardcoded list of common tokens
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
    }
  };
  
  // Normalize address
  const normalizedAddress = tokenAddress.toLowerCase();
  
  // Check if we have this token in our list
  if (commonTokens[chain] && commonTokens[chain][normalizedAddress]) {
    return commonTokens[chain][normalizedAddress];
  }
  
  // If not found, try to fetch from chain explorer API in production
  // For now, return a generic token
  return { symbol: 'UNKNOWN', decimals: 18 };
};

/**
 * Check if transaction is a deposit to a specific address
 * @param {Object} tx - Transaction data
 * @param {string} address - Wallet address to check deposits for
 * @param {string} chain - Blockchain chain
 * @returns {Object|null} Deposit info or null if not a deposit
 */
export const getDepositInfo = async (tx, address, chain) => {
  if (!tx || !address) return null;
  
  try {
    // Different logic based on chain type
    if (chain === 'solana') {
      // Solana transaction check
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        // Find transfers where the destination is our address
        const relevantTransfer = tx.tokenTransfers.find(transfer => 
          transfer.destination === address
        );
        
        if (relevantTransfer) {
          return {
            txHash: tx.txHash || tx.signature,
            token: relevantTransfer.symbol || 'UNKNOWN',
            amount: parseFloat(relevantTransfer.amount),
            fromAddress: relevantTransfer.source || null,
            toAddress: address,
            chain: 'solana',
            isDeposit: true
          };
        }
      }
    } else {
      // EVM chain transaction check
      // Convert addresses to lowercase for comparison
      const normalizedAddress = address.toLowerCase();
      const normalizedTo = (tx.to || '').toLowerCase();
      
      // Check for native token transfers
      if (normalizedTo === normalizedAddress) {
        // This is a regular ETH/BNB/MATIC transfer
        // Using the formatUnits function for ethers v6 compatibility
        return {
          txHash: tx.hash,
          amount: parseFloat(ethers.utils.formatEther(tx.value || '0')),
          token: getDefaultTokenForChain(chain),
          fromAddress: tx.from,
          toAddress: tx.to,
          chain,
          isDeposit: true
        };
      }
      
      // Also check for ERC20 token transfers
      if (tx.input && tx.input.startsWith('0xa9059cbb')) {
        // This is likely an ERC20 transfer (transfer function)
        const tokenAddress = tx.to;
        
        // Parse the transaction input to get recipient and amount
        // 0xa9059cbb + 32 bytes (address) + 32 bytes (amount)
        const data = tx.input;
        
        if (data.length >= 138) {
          // Extract recipient address (remove leading zeros)
          const recipientEncoded = '0x' + data.substring(34, 74).replace(/^0+/, '');
          
          try {
            // For proper address format we need to add leading zeros if necessary
            const recipient = ethers.utils.getAddress(recipientEncoded);
            
            // Check if recipient is our address
            if (recipient.toLowerCase() === normalizedAddress) {
              // Get token info for proper decimals
              const tokenInfo = await getTokenInfoForAddress(tokenAddress, chain);
              
              // Extract amount (as hex)
              const amountHex = '0x' + data.substring(74, 138);
              
              // Convert amount to decimal based on token decimals
              const amount = calculateTokenAmount(amountHex, tokenInfo.decimals);
              
              return {
                txHash: tx.hash,
                amount,
                token: tokenInfo.symbol,
                tokenAddress,
                fromAddress: tx.from,
                toAddress: recipient,
                chain,
                isDeposit: true
              };
            }
          } catch (err) {
            console.error('Error parsing ERC20 transfer:', err);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting deposit info:', error);
    return null;
  }
};

/**
 * Process historical deposits for a given user
 * @param {string} userId - User ID
 * @param {boolean} dryRun - If true, don't process transactions, just return them
 * @returns {Promise<Array>} Array of found deposits 
 */
export const processHistoricalDeposits = async (userId, dryRun = false) => {
  try {
    console.log(`Scanning for historical deposits for user ${userId}...`);
    
    // Get user's wallet addresses
    const walletDoc = await getDoc(doc(db, 'walletAddresses', userId));
    if (!walletDoc.exists()) {
      return { success: false, message: 'No wallet addresses found for user' };
    }
    
    const walletData = walletDoc.data();
    const wallets = walletData.wallets || {};
    
    const foundDeposits = [];
    
    // Process each wallet address
    for (const [chain, address] of Object.entries(wallets)) {
      console.log(`Scanning ${chain} wallet: ${address}`);
      
      // Get transaction history for this address
      const transactions = await getTransactionHistory(chain, address);
      
      console.log(`Found ${transactions.length} transactions for ${chain}`);
      
      // Filter for deposits (transactions where tokens were received)
      for (const tx of transactions) {
        const depositInfo = await getDepositInfo(tx, address, chain);
        
        if (depositInfo && depositInfo.isDeposit) {
          // Check if this transaction has already been processed
          const alreadyProcessed = await isTransactionProcessed(depositInfo.txHash, chain);
          
          if (!alreadyProcessed) {
            foundDeposits.push({
              ...depositInfo,
              userId
            });
            
            // Process the deposit unless in dry run mode
            if (!dryRun) {
              // Process the deposit
              await processRealTimeDeposit(userId, {
                amount: depositInfo.amount,
                token: depositInfo.token,
                chain: depositInfo.chain,
                txHash: depositInfo.txHash,
                fromAddress: depositInfo.fromAddress,
                toAddress: depositInfo.toAddress,
                isRealDeposit: true
              });
              
              // Mark the transaction as processed to avoid double-funding
              await markTransactionProcessed(depositInfo.txHash, chain, userId, {
                amount: depositInfo.amount,
                token: depositInfo.token
              });
              
              console.log(`Processed historical deposit: ${depositInfo.amount} ${depositInfo.token} for user ${userId}`);
            }
          } else {
            console.log(`Skipping already processed transaction ${depositInfo.txHash}`);
          }
        }
      }
    }
    
    return {
      success: true,
      foundDeposits,
      message: `Found ${foundDeposits.length} unprocessed deposits`
    };
  } catch (error) {
    console.error('Error processing historical deposits:', error);
    return {
      success: false,
      message: `Error scanning blockchain: ${error.message}`
    };
  }
};

/**
 * Scan for all users' historical deposits
 * @param {boolean} dryRun - If true, don't process transactions, just return them
 * @returns {Promise<Object>} Results of the scan
 */
export const scanAllUsersHistoricalDeposits = async (dryRun = false) => {
  try {
    // Get all users with wallet addresses
    const walletAddressesSnapshot = await getDocs(collection(db, 'walletAddresses'));
    
    const userIds = walletAddressesSnapshot.docs.map(doc => doc.id);
    console.log(`Scanning historical deposits for ${userIds.length} users`);
    
    const results = {
      totalUsersScanned: userIds.length,
      usersWithDeposits: 0,
      totalDepositsFound: 0,
      depositsByUser: {}
    };
    
    // Process each user
    for (const userId of userIds) {
      const userResult = await processHistoricalDeposits(userId, dryRun);
      
      if (userResult.success && userResult.foundDeposits.length > 0) {
        results.usersWithDeposits++;
        results.totalDepositsFound += userResult.foundDeposits.length;
        results.depositsByUser[userId] = userResult.foundDeposits.length;
      }
    }
    
    return {
      success: true,
      results,
      message: `Found ${results.totalDepositsFound} historical deposits across ${results.usersWithDeposits} users`
    };
  } catch (error) {
    console.error('Error scanning all users for historical deposits:', error);
    return {
      success: false,
      message: `Error scanning all users: ${error.message}`
    };
  }
};

/**
 * Calculate token amount from raw value and decimals
 * @param {string|number} value - Raw token amount (as string or number)
 * @param {number} decimals - Token decimals
 * @returns {number} Formatted token amount
 */
export const calculateTokenAmount = (value, decimals = 18) => {
  try {
    // Convert to BigInt for precision
    const valueBigInt = typeof value === 'string' ? BigInt(value) : BigInt(value.toString());
    
    // Calculate divisor (10^decimals)
    const divisor = BigInt(10) ** BigInt(decimals);
    
    // Divide and convert to JavaScript number
    // This is safe for most token amounts but may lose precision for very large numbers
    return Number(valueBigInt) / Number(divisor);
  } catch (error) {
    console.error('Error calculating token amount:', error);
    return 0;
  }
}; 