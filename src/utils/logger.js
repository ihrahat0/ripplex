// Custom logger to control log output
const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(...args);
    }
  },
  
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    // Always show warnings but can be disabled in production if needed
    console.warn(...args);
  },
  
  error: (...args) => {
    // Always show errors
    console.error(...args);
  }
};

export default logger; 