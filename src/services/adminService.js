import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { monitorAllDeposits, monitorWalletAddresses } from './depositService';
import { toast } from 'react-hot-toast';

export const adminService = {
  async makeUserAdmin(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'admin'
      });
      return true;
    } catch (error) {
      console.error('Error making user admin:', error);
      return false;
    }
  }
};

let depositsUnsubscribe = null;
let walletsUnsubscribe = null;

/**
 * Initialize admin real-time monitoring services
 * Should be called once when admin area is loaded
 */
export const initializeAdminMonitoring = () => {
  // Only initialize if we haven't already
  if (!depositsUnsubscribe && !walletsUnsubscribe) {
    console.log('Initializing admin real-time monitoring services');
    
    // Monitor all deposits
    depositsUnsubscribe = monitorAllDeposits((deposit) => {
      // Log the deposit
      console.log('Admin monitoring: New deposit detected', deposit);
      
      // Notify admin UI
      if (deposit.isRealDeposit) {
        toast.success(
          `New deposit: ${deposit.amount} ${deposit.token} for user ${deposit.userId}`,
          { duration: 5000 }
        );
      }
    });
    
    // Monitor wallet addresses for new deposits
    walletsUnsubscribe = monitorWalletAddresses((depositInfo) => {
      console.log('Admin monitoring: New wallet deposit detected', depositInfo);
      
      // Notify admin UI
      toast.success(
        `Wallet deposit: ${depositInfo.amount} ${depositInfo.token} on ${depositInfo.chain}`,
        { duration: 5000 }
      );
    });
    
    return true;
  }
  
  return false;
};

/**
 * Stop admin real-time monitoring services
 * Should be called when admin area is unloaded
 */
export const stopAdminMonitoring = () => {
  if (depositsUnsubscribe) {
    depositsUnsubscribe();
    depositsUnsubscribe = null;
  }
  
  if (walletsUnsubscribe) {
    walletsUnsubscribe();
    walletsUnsubscribe = null;
  }
  
  console.log('Admin real-time monitoring services stopped');
  return true;
};

/**
 * Check if admin monitoring is active
 * @returns {boolean} Whether monitoring is active
 */
export const isAdminMonitoringActive = () => {
  return !!depositsUnsubscribe && !!walletsUnsubscribe;
};

/**
 * Gets the monitoring status
 * @returns {Object} Monitoring status
 */
export const getMonitoringStatus = () => {
  return {
    depositsActive: !!depositsUnsubscribe,
    walletsActive: !!walletsUnsubscribe,
    active: !!depositsUnsubscribe && !!walletsUnsubscribe
  };
}; 