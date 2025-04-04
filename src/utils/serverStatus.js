import axios from 'axios';

// Get the API URL based on environment
let API_URL;
try {
  // Always use port 3001 for the API server in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = 'http://localhost:3001/api';
  } else {
    API_URL = `${window.location.protocol}//${window.location.hostname}/api`;
  }
} catch (err) {
  // Fallback in case window is not defined or another error occurs
  API_URL = 'http://localhost:3001/api';
}

/**
 * Check if the API server is running
 * @returns {Promise<boolean>} True if server is running, false otherwise
 */
export const checkServerStatus = async () => {
  try {
    // First try the root API endpoint which should always exist
    try {
      const response = await axios.get(API_URL, { 
        timeout: 3000, // More generous timeout
        // Any success or error response from the server means it's running
        validateStatus: (status) => status >= 200 && status < 500
      });
      
      console.log('API server is available:', response.status);
      return true;
    } catch (initialError) {
      // If that fails, try the health check endpoint
      console.log('Failed to reach API root, trying health-check endpoint...');
      const healthResponse = await axios.get(`${API_URL}/health-check`, { 
        timeout: 2000,
        validateStatus: (status) => status === 200 || status === 404 
      });
      
      // Got a response from health check
      console.log('API server health check response:', healthResponse.status);
      return true;
    }
  } catch (error) {
    console.warn('API server is not available:', error.message);
    // Try one last attempt with a different URL format
    try {
      console.log('Trying alternative API URL format...');
      const altURL = 'http://localhost:3001/api';
      const response = await axios.get(altURL, { timeout: 2000 });
      console.log('Alternative API URL is available');
      return true;
    } catch (altError) {
      console.warn('All API server checks failed');
      return false;
    }
  }
};

/**
 * Creates a mock email service for local development when API server is unavailable
 * @returns {Object} Mock email service functions
 */
export const createMockEmailService = () => {
  console.log('Using secure mock email service (DEVELOPMENT MODE)');
  
  return {
    sendRegistrationVerificationEmail: async (email, code) => {
      // Keep a log with a placeholder for the code
      console.log(`[MOCK] Verification email would be sent to ${email} with code: ****** (check alert)`);
      
      // Store the code securely in localStorage
      try {
        localStorage.setItem(`verification_code_${email}`, code);
        
        // Show a more developer-friendly message
        alert(`[MOCK EMAIL SERVICE]\n\nVerification code for ${email} is:\n\n${code}\n\nThis message only appears in development when the email server is down.`);
        
        // Return detailed response
        return { 
          success: true, 
          mockResponse: true,
          message: 'Mock verification code generated successfully',
          code: code // Include the code in development only
        };
      } catch (e) {
        console.warn('Unable to store verification code in localStorage:', e);
        return { 
          success: false, 
          mockResponse: true,
          error: 'Failed to store verification code'
        };
      }
    },
    
    sendVerificationEmail: async (email, code) => {
      return this.sendRegistrationVerificationEmail(email, code);
    },
    
    // Add other email service functions as needed
    sendPasswordResetEmail: async (email, code) => {
      // Security: Don't log the actual code
      console.log(`[MOCK] Password reset email sent to ${email}`);
      
      // Store the code securely in localStorage
      try {
        localStorage.setItem(`reset_code_${email}`, code);
        
        // Show a more secure message
        alert(`Password reset email simulation complete. Please enter the code sent to ${email}.\n\nNote: In a development environment, you can find the code in your browser's developer console by running: localStorage.getItem("reset_code_${email}")`);
      } catch (e) {
        console.warn('Unable to store reset code in localStorage:', e);
      }
      
      return { success: true, mockResponse: true };
    }
  };
}; 