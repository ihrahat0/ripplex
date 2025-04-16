import axios from 'axios';
import { toast } from 'react-hot-toast';

// Deposcan service URL
const DEPOSCAN_URL = process.env.REACT_APP_DEPOSCAN_URL || 'http://localhost:4000';

// State for checking if the deposit scanner is running
let isRunning = false;
let lastCheckTime = null;

/**
 * Start the deposit checker service
 * @returns {Promise<boolean>} Success status
 */
export const startDepositChecker = async () => {
  if (isRunning) {
    console.log('Deposit checker already running');
    return false;
  }
  
  try {
    // Signal the deposcan service to start checking deposits
    const response = await axios.post(`${DEPOSCAN_URL}/api/start-checking`);
    
    if (response.data.success) {
      isRunning = true;
      console.log('Deposit checking started via deposcan service');
      
      if (typeof toast !== 'undefined') {
        toast.success('Deposit checking started');
      }
      
      return true;
    } else {
      console.error('Failed to start deposit checking:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error starting deposit checker:', error);
    return false;
  }
};

/**
 * Stop the deposit checker service
 * @returns {Promise<boolean>} Success status
 */
export const stopDepositChecker = async () => {
  if (!isRunning) {
    console.log('Deposit checker not running');
    return false;
  }
  
  try {
    // Signal the deposcan service to stop checking deposits
    const response = await axios.post(`${DEPOSCAN_URL}/api/stop-checking`);
    
    if (response.data.success) {
      isRunning = false;
      console.log('Deposit checking stopped via deposcan service');
      
      if (typeof toast !== 'undefined') {
        toast.success('Deposit checking stopped');
      }
      
      return true;
    } else {
      console.error('Failed to stop deposit checking:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('Error stopping deposit checker:', error);
    return false;
  }
};

/**
 * Check the status of the deposit checker
 * @returns {Promise<Object>} Status object
 */
export const getCheckerStatus = async () => {
  try {
    const response = await axios.get(`${DEPOSCAN_URL}/api/check-status`);
    
    // Update local state to match service state
    isRunning = response.data.isRunning;
    lastCheckTime = response.data.lastCheckTime;
    
    return response.data;
  } catch (error) {
    console.error('Error getting checker status:', error);
    return {
      isRunning,
      lastCheckTime,
      error: 'Failed to connect to deposcan service'
    };
  }
};

/**
 * Trigger an immediate check for new deposits
 * @returns {Promise<Object>} Check results
 */
export const runDepositCheck = async () => {
  try {
    const response = await axios.post(`${DEPOSCAN_URL}/api/run-check-now`);
    return response.data;
  } catch (error) {
    console.error('Error running deposit check:', error);
    return {
      success: false,
      error: 'Failed to connect to deposcan service'
    };
  }
};

/**
 * Check deposits for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Check results
 */
export const checkUserDeposits = async (userId) => {
  try {
    const response = await axios.post(`${DEPOSCAN_URL}/api/check-user-deposits`, { userId });
    return response.data;
  } catch (error) {
    console.error(`Error checking deposits for user ${userId}:`, error);
    return {
      success: false,
      error: 'Failed to connect to deposcan service'
    };
  }
}; 