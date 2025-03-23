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

// RPC Endpoints for different networks
const RPC_ENDPOINTS = {
  ethereum: {
    url: 'https://eth.llamarpc.com',
    explorer: 'https://api.etherscan.io/api',
    apiKey: process.env.REACT_APP_ETHERSCAN_API_KEY || ''
  },
  bsc: {
    url: 'https://bsc-dataseed.binance.org',
    explorer: 'https://api.bscscan.com/api',
    apiKey: process.env.REACT_APP_BSCSCAN_API_KEY || ''
  },
  polygon: {
    url: 'https://polygon-rpc.com',
    explorer: 'https://api.polygonscan.com/api',
    apiKey: process.env.REACT_APP_POLYGONSCAN_API_KEY || ''
  },
  arbitrum: {
    url: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://api.arbiscan.io/api',
    apiKey: process.env.REACT_APP_ARBISCAN_API_KEY || ''
  },
  base: {
    url: 'https://mainnet.base.org',
    explorer: 'https://api.basescan.org/api',
    apiKey: process.env.REACT_APP_BASESCAN_API_KEY || ''
  },
  // Solana doesn't fit with ethers.js pattern, need separate implementation
  solana: {
    url: 'https://api.mainnet-beta.solana.com',
    explorer: 'https://public-api.solscan.io'
  }
};

// Collection to track processed transactions to prevent double-funding
const PROCESSED_TX_COLLECTION = 'processedTransactions';

/**
 * Get provider for a specific blockchain
 * @param {string} chain - Chain ID
 * @returns {ethers.JsonRpcProvider} Provider instance
 */
const getProvider = (chain) => {
  if (!RPC_ENDPOINTS[chain]) {
    throw new Error(`Unsupported blockchain: ${chain}`);
  }
  
  return new ethers.JsonRpcProvider(RPC_ENDPOINTS[chain].url);
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
  if (!txHash || !chain) return false;
  
  try {
    // Create a unique ID for this transaction
    const txId = `${chain}-${txHash}`;
    
    // Add entry to the processed transactions collection
    await setDoc(doc(db, PROCESSED_TX_COLLECTION, txId), {
      txHash,
      chain,
      userId,
      processedAt: serverTimestamp(),
      ...txData
    });
    
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
  if (!address || !chain || !RPC_ENDPOINTS[chain]) {
    return [];
  }
  
  try {
    // Use blockchain explorer API instead of direct RPC calls for better historical data
    const apiUrl = `${RPC_ENDPOINTS[chain].explorer}?module=account&action=txlist&address=${address}&sort=desc&apikey=${RPC_ENDPOINTS[chain].apiKey}`;
    
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
    const response = await axios.get(`${RPC_ENDPOINTS.solana.explorer}/account/transactions?account=${address}&limit=100`);
    
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
 * Check if transaction is a deposit to a specific address
 * @param {Object} tx - Transaction data
 * @param {string} address - Wallet address to check deposits for
 * @param {string} chain - Blockchain chain
 * @returns {Object|null} Deposit info or null if not a deposit
 */
export const getDepositInfo = (tx, address, chain) => {
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
      
      // Check if this is a deposit (i.e., if the transaction's recipient is our address)
      if (normalizedTo === normalizedAddress) {
        return {
          txHash: tx.hash,
          amount: parseFloat(ethers.formatEther(tx.value)),
          token: SUPPORTED_CHAINS[chain]?.nativeToken || chain.toUpperCase(),
          fromAddress: tx.from,
          toAddress: tx.to,
          chain,
          isDeposit: true
        };
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
        const depositInfo = getDepositInfo(tx, address, chain);
        
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