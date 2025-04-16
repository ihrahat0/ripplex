import axios from 'axios';
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
  setDoc
} from 'firebase/firestore';
import { SUPPORTED_CHAINS } from './walletService';

// Deposcan service URL
const DEPOSCAN_URL = process.env.REACT_APP_DEPOSCAN_URL || 'http://localhost:4000';

// Blockchain configuration for different networks
export const CHAINS = {
  ethereum: { 
    name: 'Ethereum', 
    symbol: 'ETH',
    scanUrl: 'https://etherscan.io',
    explorer: 'https://etherscan.io/tx/'
  },
  bsc: { 
    name: 'BSC', 
    symbol: 'BNB',
    scanUrl: 'https://bscscan.com',
    explorer: 'https://bscscan.com/tx/'
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    scanUrl: 'https://polygonscan.com',
    explorer: 'https://polygonscan.com/tx/'
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    scanUrl: 'https://arbiscan.io',
    explorer: 'https://arbiscan.io/tx/'
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    scanUrl: 'https://basescan.org',
    explorer: 'https://basescan.org/tx/'
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    scanUrl: 'https://solscan.io',
    explorer: 'https://solscan.io/tx/'
  }
};

// Collection to track processed transactions to prevent double-funding
const PROCESSED_TX_COLLECTION = 'processedTransactions';

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
 * Get transaction history for an address
 * @param {string} chain - Chain identifier
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} Transaction history
 */
export const getTransactionHistory = async (chain, address) => {
  try {
    const response = await axios.get(`${DEPOSCAN_URL}/api/transactions`, {
      params: { chain, address }
    });
    
    return response.data.transactions || [];
  } catch (error) {
    console.error(`Error fetching transaction history: ${error.message}`);
    return [];
  }
};

/**
 * Get token information for a contract address
 * @param {string} tokenAddress - Contract address
 * @param {string} chain - Chain identifier
 * @returns {Promise<Object>} Token information
 */
export const getTokenInfoForAddress = async (tokenAddress, chain) => {
  try {
    const response = await axios.get(`${DEPOSCAN_URL}/api/token-info`, {
      params: { tokenAddress, chain }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching token info: ${error.message}`);
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18
    };
  }
};

/**
 * Calculate token amount from raw value and decimals
 * @param {string|number} value - Raw token amount
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
    return Number(valueBigInt) / Number(divisor);
  } catch (error) {
    console.error('Error calculating token amount:', error);
    return 0;
  }
}; 