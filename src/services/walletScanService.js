import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Supported chains for wallet scanning
const SUPPORTED_CHAINS = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io/tx/',
  },
  bsc: {
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    explorer: 'https://bscscan.com/tx/',
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com/tx/',
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io/tx/',
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    explorer: 'https://basescan.org/tx/',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    explorer: 'https://solscan.io/tx/',
  }
};

// The deposcan service handles all actual wallet scanning
const DEPOSCAN_URL = process.env.REACT_APP_DEPOSCAN_URL || 'http://localhost:4000';

/**
 * Simplified wallet scanning that forwards to the deposcan service
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Scan status
 */
export const scanUserWallet = async (userId) => {
  try {
    // Make a request to the deposcan service to trigger a wallet scan
    const response = await axios.post(`${DEPOSCAN_URL}/api/scan-wallet`, { userId });
    
    // Return the response from the deposcan service
    return response.data;
  } catch (error) {
    console.error('Error calling deposcan service:', error);
    return { 
      success: false, 
      error: 'Failed to connect to deposit scanning service'
    };
  }
};

/**
 * Get wallet token balances from deposcan service
 * @param {string} walletAddress - Wallet address
 * @param {string} chain - Chain identifier
 * @returns {Promise<Object>} Wallet balances
 */
export const getWalletTokenBalances = async (walletAddress, chain) => {
  try {
    if (!walletAddress || !chain) {
      return { success: false, error: 'Missing wallet address or chain' };
    }
    
    // Request balances from deposcan service
    const response = await axios.get(`${DEPOSCAN_URL}/api/balances`, {
      params: { address: walletAddress, chain }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching wallet balances: ${error.message}`);
    return { 
      success: false, 
      error: 'Failed to fetch wallet balances' 
    };
  }
};

/**
 * Scan all wallets for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Scan results
 */
export const scanAllUserWallets = async (userId) => {
  try {
    // Trigger a scan for this user through the deposcan service
    const response = await axios.post(`${DEPOSCAN_URL}/api/scan-user`, { userId });
    return response.data;
  } catch (error) {
    console.error(`Error scanning user wallets: ${error.message}`);
    return { 
      success: false, 
      error: 'Failed to scan user wallets' 
    };
  }
};

/**
 * Scan all wallets in the system
 * @returns {Promise<Object>} Scan results
 */
export const scanAllWallets = async () => {
  try {
    // Request a complete scan from the deposcan service
    const response = await axios.post(`${DEPOSCAN_URL}/api/scan-all`);
    return response.data;
  } catch (error) {
    console.error(`Error scanning all wallets: ${error.message}`);
    return { 
      success: false, 
      error: 'Failed to scan all wallets' 
    };
  }
};

/**
 * Get current scanning status
 * @returns {Promise<Object>} Scan status
 */
export const getScanStatus = async () => {
  try {
    const response = await axios.get(`${DEPOSCAN_URL}/api/status`);
    return response.data;
  } catch (error) {
    console.error(`Error getting scan status: ${error.message}`);
    return {
      scanning: false,
      error: 'Failed to get scan status'
    };
  }
};

/**
 * Scan wallets for a specific user by email
 * @param {string} email - User email
 * @returns {Promise<Object>} Scan results
 */
export const scanWalletsByEmail = async (email) => {
  try {
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    
    // Request a scan for this email through the deposcan service
    const response = await axios.post(`${DEPOSCAN_URL}/api/scan-by-email`, { email });
    return response.data;
  } catch (error) {
    console.error(`Error scanning wallets by email: ${error.message}`);
  return {
      success: false, 
      error: 'Failed to scan wallets by email' 
    };
  }
}; 