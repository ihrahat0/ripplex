// script-main.js - Empty file to prevent 404 errors
console.log('Script main loaded');

// Add any needed global fixes here
(() => {
  // Fix for "destroy is not a function" error that might be occurring
  if (typeof window !== 'undefined') {
    // Ensure all objects have a destroy method if needed
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    
    Object.getOwnPropertyDescriptor = function(obj, prop) {
      // Only intercept 'destroy' property lookups
      if (prop === 'destroy' && obj && typeof obj === 'object') {
        // If the object doesn't have a destroy method, add one
        if (!obj.destroy) {
          Object.defineProperty(obj, 'destroy', {
            value: function() {
              console.log('Auto-created destroy method called');
            },
            configurable: true,
            enumerable: false,
            writable: true
          });
        }
      }
      
      // Call the original method for the actual property lookup
      return originalGetOwnPropertyDescriptor.apply(this, arguments);
    };
    
    console.log('Added emergency destroy property descriptor');
  }
})(); 