// PositionIsolation.js - Prevents cross-cryptocurrency position closures
import { tradingService } from '../services/tradingService';

// Apply protection when imported
(function() {
  if (typeof window !== 'undefined') {
    // Set global flag to disable automatic position closures
    window.RIPPLE_PREVENT_AUTO_POSITION_CLOSURES = true;
    console.log('🔒 Automatic position closures disabled');
    
    // Patch tradingService.closePosition to only allow manual closures
    if (tradingService && tradingService.closePosition && !window.TRADING_PATCHED) {
      const originalClosePosition = tradingService.closePosition;
      
      tradingService.closePosition = async (userId, positionId, closePrice, data = {}) => {
        // Only allow manual closures (user-initiated)
        const isManualClosure = data.manual || data.userInitiated || data.reason === 'manual';
        
        if (!isManualClosure) {
          console.log('[PROTECTION] Blocked automatic position closure');
          return { success: false, error: 'Automatic position closures are disabled' };
        }
        
        // Process the manual closure
        return originalClosePosition(userId, positionId, closePrice, {
          ...data,
          manual: true,
          userInitiated: true
        });
      };
      
      window.TRADING_PATCHED = true;
      console.log('[PROTECTION] Trading system patched to prevent automatic position closures');
    }
  }
})();

// React component that activates protection
export function PositionIsolation() {
  // This component doesn't render anything, it just activates the protection
  return null;
}

// Helper function to activate protection programmatically
export function activateProtection() {
  if (typeof window !== 'undefined') {
    window.RIPPLE_PREVENT_AUTO_POSITION_CLOSURES = true;
    console.log('🔒 Position isolation protection activated');
    return true;
  }
  return false;
}

export default PositionIsolation; 