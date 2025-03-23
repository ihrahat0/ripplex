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
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { referralService } from './referralService';
import { isTransactionProcessed, markTransactionProcessed } from './blockchainService';

const MASTER_WALLETS = {
  ethereum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  bsc: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  polygon: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  arbitrum: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  base: '0x4F54cF379B087C8c800B73c958F5dE6225C46F5d',
  solana: 'DxXnPZvjgc8QdHYzx4BGwvKCs9GbxdkwVZSUvzKVPktr'
};

export const monitorDeposits = (userId, onDepositDetected) => {
  // Set up real-time listener for pending deposits
  const pendingDepositsQuery = query(
    collection(db, 'pendingDeposits'),
    where('userId', '==', userId)
  );

  return onSnapshot(pendingDepositsQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const deposit = change.doc.data();
        await processDeposit(deposit, userId, onDepositDetected);
      }
    });
  });
};

export const processDeposit = async (deposit, userId, onDepositDetected) => {
  try {
    const { amount, token, chain, txHash } = deposit;

    // 1. Record the transaction
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

    // 2. Update user's balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`balances.${token}`]: increment(amount)
    });

    // 3. Process referral commission (10%)
    await referralService.processReferralCommission(userId, amount);

    // 4. Remove from pending deposits
    await updateDoc(doc(db, 'pendingDeposits', deposit.id), {
      status: 'completed',
      processedAt: serverTimestamp()
    });

    // 5. Notify the UI
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

  } catch (error) {
    console.error('Error processing deposit:', error);
    if (onDepositDetected) {
      onDepositDetected({
        type: 'error',
        message: 'Error processing deposit. Please contact support.',
        error
      });
    }
  }
};

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

export const getDepositAddress = (chain) => {
  return MASTER_WALLETS[chain];
};

export const validateDeposit = (amount, token, chain) => {
  // Add validation logic here
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
 * Monitor all deposits across all users in real-time for admin panel
 * @param {Function} onDepositDetected - Callback function when a deposit is detected
 * @returns {Function} Unsubscribe function
 */
export const monitorAllDeposits = (onDepositDetected) => {
  // Set up real-time listener for all transactions of type 'deposit'
  const depositsQuery = query(
    collection(db, 'transactions'),
    where('type', '==', 'deposit'),
    orderBy('timestamp', 'desc'),
    limit(100) // Limit to last 100 deposits for performance
  );

  return onSnapshot(depositsQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
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
};

/**
 * Monitor wallet addresses for deposits across all blockchains
 * This simulates blockchain monitoring but in a real app would connect to blockchain nodes
 * @param {Function} onWalletDeposit - Callback when a deposit is detected to a wallet
 * @returns {Function} Unsubscribe function
 */
export const monitorWalletAddresses = (onWalletDeposit) => {
  // Set up a real-time listener on the walletAddresses collection
  // In a real application, this would be replaced with actual blockchain listeners
  const walletsQuery = query(
    collection(db, 'walletAddresses')
  );
  
  return onSnapshot(walletsQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'modified') {
        const walletData = change.doc.data();
        const userId = change.doc.id;
        
        // Get the user data to check their current balances
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const processedDeposits = userData.processedDeposits || {};
        
        // Check each wallet address for new deposits
        Object.entries(walletData.wallets || {}).forEach(async ([chain, address]) => {
          // In a real app, this would verify balance changes from the blockchain
          // For simulation, we'll just generate random deposits occasionally
          if (Math.random() < 0.05) { // 5% chance to simulate a deposit
            // Determine which token got deposited based on chain
            const token = getDefaultTokenForChain(chain);
            const amount = (Math.random() * 0.5 + 0.1).toFixed(6);
            
            // Generate a unique transaction hash
            const txHash = `tx-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
            
            // Check if this transaction has already been processed
            const alreadyProcessed = await isTransactionProcessed(txHash, chain);
            if (alreadyProcessed) {
              console.log(`Skipping already processed transaction ${txHash} for user ${userId}`);
              return;
            }
            
            // Process the deposit
            const processResult = await processRealTimeDeposit(userId, {
              amount: parseFloat(amount),
              token,
              chain,
              txHash,
              fromAddress: generateRandomAddress(chain),
              toAddress: address,
              isRealDeposit: true
            });
            
            // Notify the caller only if successfully processed
            if (processResult && onWalletDeposit) {
              onWalletDeposit({
                userId,
                amount,
                token,
                chain,
                address,
                txHash
              });
            }
          }
        });
      }
    });
  });
};

/**
 * Process a deposit detected from real-time wallet monitoring
 * @param {string} userId - User ID
 * @param {Object} depositData - Deposit data
 * @returns {Promise<boolean>} Success status
 */
export const processRealTimeDeposit = async (userId, depositData) => {
  try {
    const { amount, token, chain, txHash, fromAddress, toAddress, isRealDeposit } = depositData;
    
    console.log(`Processing deposit: ${amount} ${token} for user ${userId} on ${chain}`);
    
    // Check if this transaction has already been processed to prevent double-funding
    if (txHash) {
      const alreadyProcessed = await isTransactionProcessed(txHash, chain);
      if (alreadyProcessed) {
        console.log(`Skipping already processed transaction ${txHash} for user ${userId}`);
        return false;
      }
    }
    
    // Get the current user data and balances
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error(`User ${userId} does not exist`);
      return false;
    }
    
    const userData = userDoc.data();
    const currentBalances = userData.balances || {};
    const currentTokenBalance = currentBalances[token] || 0;
    
    console.log(`Current ${token} balance for user ${userId}: ${currentTokenBalance}`);
    
    // Calculate new balance
    const newBalance = currentTokenBalance + parseFloat(amount);
    
    // 1. Record the transaction
    await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'deposit',
      amount,
      token,
      chain,
      txHash,
      fromAddress: fromAddress || 'Unknown',
      toAddress: toAddress || MASTER_WALLETS[chain],
      status: 'completed',
      timestamp: serverTimestamp(),
      masterWallet: MASTER_WALLETS[chain],
      isRealDeposit: isRealDeposit || true,
      confirmations: Math.floor(Math.random() * 30) + 5, // Random number of confirmations
      balanceBefore: currentTokenBalance,
      balanceAfter: newBalance
    });
    
    // 2. Update user's balance - use set with merge rather than increment
    await updateDoc(userRef, {
      [`balances.${token}`]: newBalance,
      lastDepositAt: serverTimestamp()
    });
    
    console.log(`Updated ${token} balance for user ${userId}: ${currentTokenBalance} -> ${newBalance}`);
    
    // 3. Process referral commission if applicable
    await referralService.processReferralCommission(userId, amount);
    
    // 4. Mark this transaction as processed to prevent double-funding
    if (txHash) {
      await markTransactionProcessed(txHash, chain, userId, {
        amount,
        token,
        processedAt: serverTimestamp()
      });
    }
    
    // 5. Double-check that the balance was updated correctly
    const updatedUserDoc = await getDoc(userRef);
    if (updatedUserDoc.exists()) {
      const updatedBalances = updatedUserDoc.data().balances || {};
      const updatedTokenBalance = updatedBalances[token] || 0;
      console.log(`Verified ${token} balance after update: ${updatedTokenBalance}`);
      
      if (Math.abs(updatedTokenBalance - newBalance) > 0.0001) {
        console.warn(`Balance verification failed! Expected: ${newBalance}, Actual: ${updatedTokenBalance}`);
      }
    }
    
    // 6. Dispatch an event to notify components about the new deposit
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('newDeposit', { 
        detail: { 
          userId, 
          amount, 
          token,
          balanceBefore: currentTokenBalance,
          balanceAfter: newBalance 
        } 
      });
      window.dispatchEvent(event);
    }
    
    console.log(`Successfully processed deposit: ${amount} ${token} for user ${userId} on ${chain}`);
    return true;
  } catch (error) {
    console.error('Error processing real-time deposit:', error);
    return false;
  }
};

/**
 * Get default token for a blockchain
 * @param {string} chain - Blockchain chain ID
 * @returns {string} Default token symbol
 */
const getDefaultTokenForChain = (chain) => {
  const tokens = {
    ethereum: 'ETH',
    bsc: 'BNB',
    polygon: 'MATIC',
    arbitrum: 'ARB',
    base: 'ETH',
    solana: 'SOL'
  };
  
  return tokens[chain] || 'USDT';
};

/**
 * Generate a random blockchain address for simulation
 * @param {string} chain - Blockchain chain
 * @returns {string} Random address
 */
const generateRandomAddress = (chain) => {
  if (chain === 'solana') {
    // Random Solana-style address
    return [...Array(44)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  } else {
    // Random EVM-style address
    return '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }
} 