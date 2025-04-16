import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { referralService } from './referralService';
import axios from 'axios';

const DEPOSCAN_URL = process.env.REACT_APP_DEPOSCAN_URL || 'http://localhost:4000';

// Master wallet addresses for each chain
const MASTER_WALLETS = {
  ethereum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  bsc: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  polygon: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  arbitrum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  base: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  solana: 'DxXnPZvjgc8QdHYzx4BGwvKCs9GbxdkwVZSUvzKVPktr'
};

/**
 * Monitor deposits for a specific user
 * @param {string} userId - User ID
 * @param {Function} onDepositDetected - Callback when deposit is detected
 * @returns {Function} Unsubscribe function
 */
export const monitorDeposits = (userId, onDepositDetected) => {
  // Set up real-time listener for transactions of type 'deposit' for this user
  const depositsQuery = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('type', '==', 'deposit')
  );

  return onSnapshot(depositsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const deposit = {
          id: change.doc.id,
          ...change.doc.data()
        };
        
        if (onDepositDetected) {
          onDepositDetected(deposit);
        }
      }
    });
  });
};

/**
 * Process a pending deposit
 * @param {Object} deposit - Deposit data
 * @param {string} userId - User ID
 * @param {Function} onDepositDetected - Callback when deposit is processed
 * @returns {Promise<boolean>} Success status
 */
export const processDeposit = async (deposit, userId, onDepositDetected) => {
  try {
    const { amount, token, chain, txHash } = deposit;

    // Record the transaction
    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'deposit',
      amount,
      token,
      chain,
      txHash,
      status: 'completed',
      timestamp: serverTimestamp(),
      masterWallet: MASTER_WALLETS[chain]
    });

    // Update user's balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`balances.${token}`]: increment(amount)
    });

    // Process referral commission
    await referralService.processReferralCommission(userId, amount);

    // If pending deposit has an ID, update its status
    if (deposit.id) {
    await updateDoc(doc(db, 'pendingDeposits', deposit.id), {
      status: 'completed',
      processedAt: serverTimestamp()
    });
    }

    // Notify the UI
    if (onDepositDetected) {
      onDepositDetected({
        type: 'success',
        message: `Successfully deposited ${amount} ${token}`,
        details: {
          amount,
          token,
          chain,
          txHash
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Error processing deposit:', error);
    if (onDepositDetected) {
      onDepositDetected({
        type: 'error',
        message: 'Error processing deposit. Please contact support.',
        error
      });
    }
    return false;
  }
};

/**
 * Create a pending deposit
 * @param {string} userId - User ID
 * @param {Object} depositData - Deposit data
 * @returns {Promise<boolean>} Success status
 */
export const createPendingDeposit = async (userId, depositData) => {
  try {
    const { amount, token, chain, txHash } = depositData;

    // Create pending deposit
    await addDoc(collection(db, 'pendingDeposits'), {
      userId,
      amount,
      token,
      chain,
      txHash,
      status: 'pending',
      createdAt: serverTimestamp(),
      masterWallet: MASTER_WALLETS[chain]
    });

    return true;
  } catch (error) {
    console.error('Error creating pending deposit:', error);
    return false;
  }
};

/**
 * Get deposit address for a chain
 * @param {string} chain - Chain identifier
 * @returns {string} Deposit address
 */
export const getDepositAddress = (chain) => {
  return MASTER_WALLETS[chain];
};

/**
 * Validate deposit parameters
 * @param {number} amount - Deposit amount
 * @param {string} token - Token symbol
 * @param {string} chain - Chain identifier
 * @returns {Object} Validation result
 */
export const validateDeposit = (amount, token, chain) => {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }

  if (!token) {
    return { valid: false, error: 'Token not specified' };
  }

  if (!chain || !MASTER_WALLETS[chain]) {
    return { valid: false, error: 'Invalid chain' };
  }

  return { valid: true };
};

/**
 * Monitor all deposits in real-time
 * @param {Function} onDepositDetected - Callback for new deposits
 * @returns {Function} Unsubscribe function
 */
export const monitorAllDeposits = (onDepositDetected) => {
  // Connect to deposcan WebSocket for real-time updates
  try {
  // Set up real-time listener for all transactions of type 'deposit'
  const depositsQuery = query(
    collection(db, 'transactions'),
      where('type', '==', 'deposit')
  );

    return onSnapshot(depositsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const deposit = {
          id: change.doc.id,
          ...change.doc.data()
        };
        
        // Notify the admin UI
        if (onDepositDetected) {
          onDepositDetected(deposit);
        }
      }
    });
  });
  } catch (error) {
    console.error('Error monitoring deposits:', error);
    return () => {}; // Return empty function as unsubscribe
  }
};

/**
 * Monitor wallet addresses for new deposits using Infura
 * @param {Function} onDepositDetected - Callback for new deposits
 * @param {Function} statusCallback - Callback for status updates
 * @returns {Function} Unsubscribe function
 */
export const monitorWalletAddresses = (onDepositDetected, statusCallback) => {
  try {
    // Set up Infura connection for each chain
    const infuraProjectId = process.env.REACT_APP_INFURA_PROJECT_ID;
    if (!infuraProjectId) {
      console.error('Missing Infura project ID');
      if (statusCallback) {
        statusCallback({
          type: 'error',
          message: 'Missing Infura project ID - blockchain monitoring disabled'
        });
      }
      throw new Error('Infura project ID is required for blockchain monitoring');
    }

    // Get all master wallet addresses to monitor
    const addressesToMonitor = Object.values(MASTER_WALLETS);
    console.log('Monitoring deposit addresses:', addressesToMonitor);
    
    if (statusCallback) {
      statusCallback({
        type: 'connecting',
        message: 'Connecting to blockchain networks...'
      });
    }

    // Import Web3 and related libraries dynamically to avoid bundling issues
    const setupBlockchainListeners = async () => {
      try {
        // Import Web3 dynamically
        const { default: Web3 } = await import('web3');
        
        // Set up providers for different chains
        const providers = {
          ethereum: new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${infuraProjectId}`),
          bsc: new Web3.providers.WebsocketProvider('wss://bsc-ws-node.nariox.org:443'),
          polygon: new Web3.providers.WebsocketProvider(`wss://polygon-mainnet.infura.io/ws/v3/${infuraProjectId}`),
          arbitrum: new Web3.providers.WebsocketProvider(`wss://arbitrum-mainnet.infura.io/ws/v3/${infuraProjectId}`),
          base: new Web3.providers.WebsocketProvider(`wss://base-mainnet.infura.io/ws/v3/${infuraProjectId}`),
        };
        
        // Create Web3 instances for each chain
        const web3Instances = {};
        const subscriptions = [];
        const connectedChains = [];
        
        // Set up listeners for each chain
        for (const [chain, provider] of Object.entries(providers)) {
          if (!MASTER_WALLETS[chain]) continue;
          
          try {
            console.log(`Setting up deposit monitor for ${chain}`);
            
            // Add connection handlers
            provider.on('connect', () => {
              console.log(`Connected to ${chain} blockchain`);
              connectedChains.push(chain);
              
              if (statusCallback) {
                statusCallback({
                  type: 'connected',
                  message: `Connected to ${chain}`,
                  chains: connectedChains
                });
              }
            });
            
            provider.on('error', (error) => {
              console.error(`Error with ${chain} connection:`, error);
              
              if (statusCallback) {
                statusCallback({
                  type: 'warning',
                  message: `Connection issue with ${chain}: ${error.message}`,
                  chain
                });
              }
            });
            
            provider.on('end', () => {
              console.log(`Connection to ${chain} ended`);
              
              if (statusCallback) {
                statusCallback({
                  type: 'warning',
                  message: `Connection to ${chain} ended, attempting to reconnect`,
                  chain
        });
      }
    });
            
            const web3 = new Web3(provider);
            web3Instances[chain] = web3;
            
            // Subscribe to pending transactions
            const subscription = web3.eth.subscribe('pendingTransactions', (err, txHash) => {
              if (err) {
                console.error(`Error subscribing to ${chain} transactions:`, err);
                return;
              }
              
              // Get transaction details
              web3.eth.getTransaction(txHash).then(async (tx) => {
                if (!tx) return;
                
                // Check if transaction is to our deposit address
                if (tx.to && tx.to.toLowerCase() === MASTER_WALLETS[chain].toLowerCase()) {
                  console.log(`Detected deposit on ${chain}:`, txHash);
                  
                  // Get token from transaction if it's a token transfer
                  let token = '';
                  let amount = 0;
                  
                  // Check if it's a native token transfer
                  if (!tx.input || tx.input === '0x') {
                    // Native token transfer (ETH, BNB, MATIC, etc.)
                    token = chain === 'ethereum' ? 'ETH' : 
                           chain === 'bsc' ? 'BNB' : 
                           chain === 'polygon' ? 'MATIC' :
                           chain === 'arbitrum' ? 'ETH' :
                           chain === 'base' ? 'ETH' : 'Unknown';
                    
                    amount = web3.utils.fromWei(tx.value, 'ether');
                  } else {
                    // Likely a token transfer, try to decode
                    // For simplicity, we're just detecting ERC20 transfers here
                    // In a real implementation, you'd need to decode the transaction input
                    token = 'ERC20'; // This would be determined by decoding the transaction input
                    amount = 0; // This would be determined by decoding the transaction input
                  }
                  
                  // Create deposit record
                  const deposit = {
                    id: txHash,
                    transactionHash: txHash,
                    fromAddress: tx.from,
                    toAddress: tx.to,
                    token,
                    amount,
                    chain,
                    network: chain,
                    status: 'pending',
                    timestamp: new Date(),
                    isRealDeposit: true,
                    direction: 'IN'
                  };
                  
                  // Store in Firestore for processing
                  try {
                    const depositRef = await addDoc(collection(db, 'pendingDeposits'), {
                      ...deposit,
                      createdAt: serverTimestamp()
                    });
                    
                    deposit.id = depositRef.id;
                    
                    // Notify listeners
                    if (onDepositDetected) {
                      onDepositDetected(deposit);
                    }
                  } catch (error) {
                    console.error('Error storing deposit:', error);
                  }
                }
              }).catch(err => {
                console.error(`Error getting transaction on ${chain}:`, err);
              });
            });
            
            subscriptions.push({ chain, subscription });
          } catch (error) {
            console.error(`Error setting up ${chain} listener:`, error);
          }
        }
        
        // Also set up a listener for Firestore pending deposits as a backup
        const pendingDepositsQuery = query(
          collection(db, 'pendingDeposits'),
          where('status', '==', 'pending')
        );

        const firestoreUnsubscribe = onSnapshot(pendingDepositsQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const deposit = {
                id: change.doc.id,
                ...change.doc.data()
              };
              
              // Only notify if it wasn't already detected by blockchain monitoring
              if (!deposit.isRealDeposit && onDepositDetected) {
                onDepositDetected(deposit);
              }
            }
          });
        });
        
        // Return unsubscribe function that cleans up all subscriptions
        return () => {
          console.log('Unsubscribing from all blockchain monitors');
          subscriptions.forEach(({ chain, subscription }) => {
            try {
              subscription.unsubscribe((error, success) => {
                if (success) {
                  console.log(`Unsubscribed from ${chain} successfully`);
                }
                if (error) {
                  console.error(`Error unsubscribing from ${chain}:`, error);
                }
              });
            } catch (e) {
              console.error(`Error during unsubscribe from ${chain}:`, e);
            }
          });
          
          // Also unsubscribe from Firestore
          firestoreUnsubscribe();
        };
      } catch (error) {
        console.error('Error setting up blockchain monitors:', error);
        
        if (statusCallback) {
          statusCallback({
            type: 'error',
            message: `Failed to initialize blockchain monitoring: ${error.message}`
          });
        }
        
        return () => {}; // Return empty function as unsubscribe
      }
    };

    // Start the monitoring and return unsubscribe function
    const unsubscribePromise = setupBlockchainListeners();
    
    // Return a function that calls the unsubscribe when it resolves
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  } catch (error) {
    console.error('Error monitoring wallet addresses:', error);
    
    if (statusCallback) {
      statusCallback({
        type: 'error',
        message: `Blockchain monitoring error: ${error.message}`
      });
    }
    
    return () => {}; // Return empty function as unsubscribe
  }
}; 