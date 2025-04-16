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