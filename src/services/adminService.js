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
    
    // Track recent deposits to avoid notification spam
    let recentDeposits = [];
    let notificationTimeout = null;
    
    // Function to show consolidated notification
    const showConsolidatedNotification = () => {
      const count = recentDeposits.length;
      if (count > 0) {
        // Show a single consolidated notification instead of multiple toasts
        toast.success(
          `${count} new deposit${count > 1 ? 's' : ''} received`,
          { 
            duration: 3000,
            id: 'consolidated-deposits'
          }
        );
        
        // Dispatch custom events for each deposit
        recentDeposits.forEach(deposit => {
          // Create and dispatch a custom event that the AdminLayout will listen for
          const depositEvent = new CustomEvent('deposit-received', {
            detail: deposit
          });
          window.dispatchEvent(depositEvent);
        });
        
        // Clear the queue
        recentDeposits = [];
      }
      notificationTimeout = null;
    };
    
    // Monitor all deposits
    depositsUnsubscribe = monitorAllDeposits((deposit) => {
      // Log the deposit
      console.log('Admin monitoring: New deposit detected', deposit);
      
      // Add to recent deposits queue
      if (deposit.isRealDeposit) {
        recentDeposits.push(deposit);
        
        // If we already have a timeout scheduled, don't create a new one
        if (!notificationTimeout) {
          // Schedule a consolidated notification after a short delay
          notificationTimeout = setTimeout(showConsolidatedNotification, 3000);
        }
      }
    });
    
    // Monitor wallet addresses for new deposits
    walletsUnsubscribe = monitorWalletAddresses((depositInfo) => {
      console.log('Admin monitoring: New wallet deposit detected', depositInfo);
      
      // Add to recent deposits queue
      recentDeposits.push(depositInfo);
      
      // If we already have a timeout scheduled, don't create a new one
      if (!notificationTimeout) {
        // Schedule a consolidated notification after a short delay
        notificationTimeout = setTimeout(showConsolidatedNotification, 3000);
      }
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