// Trading setup utility functions
const DEFAULT_ORDER_TYPE = 'market'; // 'market' or 'limit'
const DEFAULT_ORDER_MODE = 'buy'; // 'buy' or 'sell'
const DEFAULT_LEVERAGE = 10; // Leverage value
const DEFAULT_PRICE = 0; // Default price

// Symbol mapping for different exchanges
const SYMBOL_MAPPING = {
  BTC: {
    binance: 'BTCUSDT',
    dex: 'BTC/USDT',
    coinId: 'bitcoin'
  },
  ETH: {
    binance: 'ETHUSDT',
    dex: 'ETH/USDT',
    coinId: 'ethereum'
  },
  SOL: {
    binance: 'SOLUSDT',
    dex: 'SOL/USDT',
    coinId: 'solana'
  },
  XRP: {
    binance: 'XRPUSDT',
    dex: 'XRP/USDT',
    coinId: 'ripple'
  }
};

// Calculate profit and loss for a position
const calculatePnL = (position, currentMarketPrice) => {
  if (!position || !position.entryPrice || !currentMarketPrice) return 0;
  
  const entryPrice = parseFloat(position.entryPrice);
  const marketPrice = parseFloat(currentMarketPrice);
  const quantity = parseFloat(position.quantity || 0);
  const leverage = parseFloat(position.leverage || 1);
  
  if (isNaN(entryPrice) || isNaN(marketPrice) || isNaN(quantity) || isNaN(leverage)) return 0;
  
  // For long positions, profit is made when price increases
  // For short positions, profit is made when price decreases
  let pnlPercentage;
  if (position.type === 'long') {
    pnlPercentage = ((marketPrice - entryPrice) / entryPrice) * 100 * leverage;
  } else { // short
    pnlPercentage = ((entryPrice - marketPrice) / entryPrice) * 100 * leverage;
  }
  
  // Calculate actual PnL in USD
  const pnlValue = (quantity * entryPrice) * (pnlPercentage / 100);
  
  return pnlValue;
};

// Calculate liquidation price based on position
const calculateLiquidationPrice = (position) => {
  if (!position || !position.type || !position.entryPrice || !position.leverage) {
    return 0;
  }
  
  const entryPrice = parseFloat(position.entryPrice);
  const leverage = parseFloat(position.leverage);
  const maintenanceMargin = 0.05; // 5% maintenance margin
  
  if (isNaN(entryPrice) || isNaN(leverage) || leverage <= 0) {
    return 0;
  }
  
  // Different calculation for long vs short positions
  if (position.type === 'long') {
    // For longs, liquidation happens when price drops
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
  } else {
    // For shorts, liquidation happens when price rises
    return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
  }
};

// Format price with appropriate decimal places
const formatPrice = (price, decimals = 2) => {
  if (price === undefined || price === null || isNaN(price)) return '0.00';
  
  // Convert to number if it's a string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Determine appropriate decimal places based on price magnitude
  let decimalPlaces = decimals;
  if (Math.abs(numPrice) < 0.1) decimalPlaces = 6;
  else if (Math.abs(numPrice) < 1) decimalPlaces = 4;
  
  return numPrice.toFixed(decimalPlaces);
};

// Initialize the trading state
const initTradingState = () => {
  return {
    orderType: DEFAULT_ORDER_TYPE,
    orderMode: DEFAULT_ORDER_MODE,
    leverage: DEFAULT_LEVERAGE,
    quantity: '',
    limitPrice: '',
    marketPrice: DEFAULT_PRICE,
    stopLoss: '',
    takeProfit: '',
    loading: false,
    error: null
  };
};

// Detect extreme market movements
const isExtremeMarketMovement = (oldPrice, newPrice, symbol = 'BTC') => {
  if (!oldPrice || !newPrice || isNaN(oldPrice) || isNaN(newPrice)) return false;
  
  // Convert to numbers
  const oldPriceNum = typeof oldPrice === 'string' ? parseFloat(oldPrice) : oldPrice;
  const newPriceNum = typeof newPrice === 'string' ? parseFloat(newPrice) : newPrice;
  
  // Calculate percentage change
  const percentChange = Math.abs((newPriceNum - oldPriceNum) / oldPriceNum * 100);
  
  // Thresholds for different assets
  let threshold = 2.0; // Default: 2% for most assets
  
  // Adjust threshold based on asset volatility
  if (symbol.includes('BTC') || symbol === 'BTC') {
    threshold = 1.5; // Bitcoin is relatively less volatile
  } else if (symbol.includes('ETH') || symbol === 'ETH') {
    threshold = 2.0; // Ethereum
  } else if (symbol.includes('SOL') || symbol === 'SOL' || 
             symbol.includes('AVAX') || symbol === 'AVAX') {
    threshold = 3.5; // More volatile assets
  } else if (symbol.includes('DOGE') || symbol === 'DOGE' || 
             symbol.includes('SHIB') || symbol === 'SHIB') {
    threshold = 5.0; // Meme coins - very volatile
  }
  
  return percentChange > threshold;
};

// Export all functions and constants
export {
  DEFAULT_ORDER_TYPE,
  DEFAULT_ORDER_MODE,
  DEFAULT_LEVERAGE,
  DEFAULT_PRICE,
  SYMBOL_MAPPING,
  calculatePnL,
  calculateLiquidationPrice,
  formatPrice,
  initTradingState,
  isExtremeMarketMovement
};