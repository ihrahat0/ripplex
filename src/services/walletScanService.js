import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Supported chains for wallet scanning
const SUPPORTED_CHAINS = {
  ethereum: {
    name: 'Ethereum',
    apiKey: process.env.REACT_APP_ETHERSCAN_API_KEY || '',
    scanApi: 'https://api.etherscan.io/api',
    explorer: 'https://etherscan.io/tx/',
    symbol: 'ETH',
    decimals: 18
  },
  bsc: {
    name: 'Binance Smart Chain',
    apiKey: process.env.REACT_APP_BSCSCAN_API_KEY || '',
    scanApi: 'https://api.bscscan.com/api',
    explorer: 'https://bscscan.com/tx/',
    symbol: 'BNB',
    decimals: 18
  },
  polygon: {
    name: 'Polygon',
    apiKey: process.env.REACT_APP_POLYGONSCAN_API_KEY || '',
    scanApi: 'https://api.polygonscan.com/api',
    explorer: 'https://polygonscan.com/tx/',
    symbol: 'MATIC',
    decimals: 18
  },
  arbitrum: {
    name: 'Arbitrum',
    apiKey: process.env.REACT_APP_ARBISCAN_API_KEY || '',
    scanApi: 'https://api.arbiscan.io/api',
    explorer: 'https://arbiscan.io/tx/',
    symbol: 'ETH',
    decimals: 18
  },
  avalanche: {
    name: 'Avalanche',
    apiKey: process.env.REACT_APP_SNOWTRACE_API_KEY || '',
    scanApi: 'https://api.snowtrace.io/api',
    explorer: 'https://snowtrace.io/tx/',
    symbol: 'AVAX',
    decimals: 18
  },
  solana: {
    name: 'Solana',
    apiKey: process.env.REACT_APP_SOLSCAN_API_KEY || '',
    scanApi: 'https://public-api.solscan.io',
    explorer: 'https://solscan.io/tx/',
    symbol: 'SOL',
    decimals: 9
  }
};

// Utility to convert token amount with decimals
const formatTokenAmount = (amount, decimals = 18) => {
  if (!amount) return 0;
  return parseFloat(amount) / Math.pow(10, decimals);
};

// Global state to track ongoing scans and avoid duplicates
let scanInProgress = false;
let lastScanTimestamp = 0;
let autoScanInterval = null;

/**
 * Scans a user wallet for new deposits
 * @param {string} userId - User ID
 * @param {string} walletAddress - Wallet address to scan
 * @param {string} chain - Chain identifier (ethereum, bsc, etc.)
 * @returns {Promise<Object>} Scan results
 */
export const scanUserWallet = async (userId, walletAddress, chain) => {
  if (!userId || !walletAddress || !chain) {
    console.error('Missing required parameters for wallet scan');
    return { success: false, error: 'Missing required parameters' };
  }
  
  if (!SUPPORTED_CHAINS[chain]) {
    console.error(`Unsupported chain: ${chain}`);
    return { success: false, error: 'Unsupported blockchain' };
  }
  
  try {
    console.log(`Scanning ${chain} wallet ${walletAddress} for user ${userId}`);
    
    // Track the last scanned block to avoid processing the same transactions
    // Get the last scanned block from the user's wallet data or database
    const walletRef = collection(db, 'wallets');
    const q = query(walletRef, where('userId', '==', userId), where('address', '==', walletAddress), where('chain', '==', chain));
    const walletSnap = await getDocs(q);
    
    // If wallet doesn't exist, return error
    if (walletSnap.empty) {
      console.error(`Wallet not found for user ${userId} on chain ${chain}`);
      return { success: false, error: 'Wallet not found' };
    }
    
    const walletDoc = walletSnap.docs[0];
    const walletData = walletDoc.data();
    const lastScannedBlock = walletData.lastScannedBlock || 0;
    const chainConfig = SUPPORTED_CHAINS[chain];
    
    let newDeposits = [];
    
    if (chain === 'solana') {
      // Handle Solana differently (using Solana-specific API)
      const response = await axios.get(`${chainConfig.scanApi}/account/transactions`, {
        params: {
          account: walletAddress,
          limit: 20
        }
      });
      
      if (response.data && response.data.data) {
        const transactions = response.data.data;
        
        for (const tx of transactions) {
          // Skip if already processed
          if (tx.slot <= lastScannedBlock) continue;
          
          if (tx.status === 'success') {
            // Process SOL transfers
            if (tx.lamport && tx.lamport > 0) {
              const amount = formatTokenAmount(tx.lamport, 9); // SOL has 9 decimals
              
              newDeposits.push({
                txHash: tx.txHash,
                amount,
                token: 'SOL',
                chain,
                address: walletAddress,
                timestamp: new Date(tx.blockTime * 1000),
                userId
              });
            }
            
            // Process SPL token transfers
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
              for (const transfer of tx.tokenTransfers) {
                if (transfer.destination === walletAddress) {
                  newDeposits.push({
                    txHash: tx.txHash,
                    amount: formatTokenAmount(transfer.amount, transfer.decimals),
                    token: transfer.symbol,
                    chain,
                    address: walletAddress,
                    timestamp: new Date(tx.blockTime * 1000),
                    userId
                  });
                }
              }
            }
          }
        }
        
        // Update the last scanned block
        if (transactions.length > 0) {
          const latestBlock = Math.max(...transactions.map(tx => tx.slot));
          await updateDoc(doc(db, 'wallets', walletDoc.id), {
            lastScannedBlock: latestBlock,
            lastScanned: serverTimestamp()
          });
        }
      }
    } else {
      // Handle EVM chains (Ethereum, BSC, etc.)
      const response = await axios.get(chainConfig.scanApi, {
        params: {
          module: 'account',
          action: 'txlist',
          address: walletAddress,
          startblock: lastScannedBlock + 1,
          endblock: 'latest',
          sort: 'asc',
          apikey: chainConfig.apiKey
        }
      });
      
      if (response.data && response.data.result) {
        const transactions = response.data.result;
        
        // Process native token transfers (ETH, BNB, etc.)
        for (const tx of transactions) {
          if (tx.to.toLowerCase() === walletAddress.toLowerCase() && tx.value !== '0') {
            const amount = formatTokenAmount(tx.value, chainConfig.decimals);
            
            newDeposits.push({
              txHash: tx.hash,
              amount,
              token: chainConfig.symbol,
              chain,
              address: walletAddress,
              timestamp: new Date(tx.timeStamp * 1000),
              userId
            });
          }
        }
        
        // Update the last scanned block
        if (transactions.length > 0) {
          const latestBlock = Math.max(...transactions.map(tx => parseInt(tx.blockNumber)));
          await updateDoc(doc(db, 'wallets', walletDoc.id), {
            lastScannedBlock: latestBlock,
            lastScanned: serverTimestamp()
          });
        }
      }
      
      // Also check ERC20 token transfers
      const tokenResponse = await axios.get(chainConfig.scanApi, {
        params: {
          module: 'account',
          action: 'tokentx',
          address: walletAddress,
          startblock: lastScannedBlock + 1,
          endblock: 'latest',
          sort: 'asc',
          apikey: chainConfig.apiKey
        }
      });
      
      if (tokenResponse.data && tokenResponse.data.result) {
        const tokenTransactions = tokenResponse.data.result;
        
        for (const tx of tokenTransactions) {
          if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
            const amount = formatTokenAmount(tx.value, parseInt(tx.tokenDecimal));
            
            newDeposits.push({
              txHash: tx.hash,
              amount,
              token: tx.tokenSymbol,
              chain,
              address: walletAddress,
              timestamp: new Date(tx.timeStamp * 1000),
              userId,
              contractAddress: tx.contractAddress
            });
          }
        }
        
        // Update the last scanned block
        if (tokenTransactions.length > 0) {
          const latestBlock = Math.max(...tokenTransactions.map(tx => parseInt(tx.blockNumber)));
          await updateDoc(doc(db, 'wallets', walletDoc.id), {
            lastScannedBlock: Math.max(latestBlock, walletData.lastScannedBlock || 0),
            lastScanned: serverTimestamp()
          });
        }
      }
    }
    
    // Process new deposits by adding them to the deposits collection
    if (newDeposits.length > 0) {
      console.log(`Found ${newDeposits.length} new deposits for user ${userId} on ${chain}`);
      
      for (const deposit of newDeposits) {
        // Check if this deposit already exists
        const depositsRef = collection(db, 'deposits');
        const depositQuery = query(
          depositsRef, 
          where('txHash', '==', deposit.txHash),
          where('userId', '==', userId)
        );
        const existingDeposits = await getDocs(depositQuery);
        
        if (existingDeposits.empty) {
          // Add new deposit with isRealDeposit flag explicitly set to true
          await addDoc(collection(db, 'deposits'), {
            ...deposit,
            status: 'pending',
            createdAt: serverTimestamp(),
            isRealDeposit: true,
            network: chain, // Add network field for backward compatibility
            chain: chain,   // Ensure chain field is set
            timestamp: deposit.timestamp || serverTimestamp() // Ensure timestamp is set
          });
          
          // Also create a transaction record with isRealDeposit flag
          await addDoc(collection(db, 'transactions'), {
            type: 'deposit',
            userId,
            amount: deposit.amount,
            token: deposit.token,
            chain: deposit.chain,
            network: chain, // Add network field for backward compatibility
            txHash: deposit.txHash,
            address: deposit.address,
            status: 'pending',
            timestamp: serverTimestamp(),
            isRealDeposit: true
          });
          
          // Show notification
          toast.success(`New deposit detected: ${deposit.amount} ${deposit.token}`, { 
            duration: 5000 
          });
        } else {
          console.log(`Deposit ${deposit.txHash} already exists, skipping`);
        }
      }
      
      return { success: true, newDeposits };
    } else {
      console.log(`No new deposits found for user ${userId} on ${chain}`);
      return { success: true, newDeposits: [] };
    }
  } catch (error) {
    console.error(`Error scanning wallet ${walletAddress} on ${chain}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Scans all wallets for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Scan results
 */
export const scanAllUserWallets = async (userId) => {
  if (!userId) {
    console.error('Missing userId for wallet scan');
    return { success: false, error: 'Missing userId' };
  }
  
  try {
    console.log(`Scanning all wallets for user ${userId}`);
    
    // Get all user wallets
    const walletsRef = collection(db, 'wallets');
    const q = query(walletsRef, where('userId', '==', userId));
    const walletsSnap = await getDocs(q);
    
    if (walletsSnap.empty) {
      console.log(`No wallets found for user ${userId}`);
      return { success: true, message: 'No wallets found', newDeposits: [] };
    }
    
    const wallets = walletsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${wallets.length} wallets for user ${userId}`);
    
    const results = [];
    const allNewDeposits = [];
    
    // Scan each wallet
    for (const wallet of wallets) {
      const result = await scanUserWallet(userId, wallet.address, wallet.chain);
      results.push(result);
      
      if (result.success && result.newDeposits) {
        allNewDeposits.push(...result.newDeposits);
      }
    }
    
    return { 
      success: true, 
      results, 
      newDeposits: allNewDeposits,
      totalScanned: wallets.length
    };
  } catch (error) {
    console.error(`Error scanning wallets for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Scans all wallets in the database
 * @returns {Promise<Object>} Scan results
 */
export const scanAllWallets = async () => {
  if (scanInProgress) {
    console.log('A wallet scan is already in progress');
    return { success: false, message: 'Scan already in progress' };
  }
  
  scanInProgress = true;
  
  try {
    console.log('Starting scan of all wallets');
    lastScanTimestamp = Date.now();
    
    // Get all wallets
    const walletsRef = collection(db, 'wallets');
    const walletsSnap = await getDocs(walletsRef);
    
    if (walletsSnap.empty) {
      console.log('No wallets found in database');
      return { success: true, message: 'No wallets found', newDeposits: [] };
    }
    
    const wallets = walletsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${wallets.length} wallets total`);
    
    const results = [];
    const allNewDeposits = [];
    
    // Scan each wallet
    for (const wallet of wallets) {
      if (!wallet.userId || !wallet.address || !wallet.chain) {
        console.log('Skipping wallet with missing data:', wallet.id);
        continue;
      }
      
      const result = await scanUserWallet(wallet.userId, wallet.address, wallet.chain);
      results.push(result);
      
      if (result.success && result.newDeposits) {
        allNewDeposits.push(...result.newDeposits);
      }
    }
    
    return {
      success: true,
      results,
      newDeposits: allNewDeposits,
      totalScanned: wallets.length
    };
  } catch (error) {
    console.error('Error scanning all wallets:', error);
    return { success: false, error: error.message };
  } finally {
    scanInProgress = false;
  }
};

/**
 * Starts automatic scanning of all wallets every 5 minutes
 */
export const startAutoScan = () => {
  if (autoScanInterval) {
    console.log('Auto scan is already running');
    return false;
  }
  
  // Run an initial scan
  scanAllWallets();
  
  // Set up the interval (5 minutes)
  autoScanInterval = setInterval(() => {
    console.log('Running scheduled wallet scan');
    scanAllWallets();
  }, 5 * 60 * 1000);
  
  console.log('Automatic wallet scanning started (every 5 minutes)');
  return true;
};

/**
 * Stops automatic scanning of wallets
 */
export const stopAutoScan = () => {
  if (autoScanInterval) {
    clearInterval(autoScanInterval);
    autoScanInterval = null;
    console.log('Automatic wallet scanning stopped');
    return true;
  }
  return false;
};

/**
 * Get the status of the wallet scanning service
 * @returns {Object} Status information
 */
export const getScanStatus = () => {
  return {
    scanInProgress,
    lastScan: lastScanTimestamp ? new Date(lastScanTimestamp) : null,
    lastScanTimeAgo: lastScanTimestamp ? Math.floor((Date.now() - lastScanTimestamp) / 1000) : null,
    autoScanActive: !!autoScanInterval
  };
};

// Initialize auto scanning when the service is loaded
startAutoScan(); 