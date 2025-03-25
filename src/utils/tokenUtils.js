import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Cache duration in milliseconds (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;

/**
 * Get the appropriate logo URL for a token
 * @param {Object} token - Token object
 * @returns {string} The URL for the token logo
 */
export const getTokenLogo = (token) => {
  // Return logo URL if it exists
  if (token.logoUrl) return token.logoUrl;
  
  // Use CMC ID for CEX tokens
  if (token.type === 'cex' && token.cmcId) {
    return `https://s2.coinmarketcap.com/static/img/coins/64x64/${token.cmcId}.png`;
  }
  
  // Fallback to placeholder
  return `https://via.placeholder.com/32?text=${token.symbol?.[0] || 'X'}`;
};

/**
 * Get token data from cache or Firestore
 * @param {string} symbol - Token symbol
 * @returns {Promise<Object|null>} Token data or null
 */
export const getTokenData = async (symbol) => {
  // First check localStorage cache
  const cachedTokens = localStorage.getItem('cachedTokens');
  if (cachedTokens) {
    const tokens = JSON.parse(cachedTokens);
    const token = tokens.find(t => t.symbol === symbol);
    if (token) return token;
  }
  
  // If not found in cache, fetch from Firestore
  try {
    const q = query(collection(db, 'tokens'), where('symbol', '==', symbol));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching token ${symbol}:`, error);
    return null;
  }
};

/**
 * Fetch all tokens with caching
 * @param {boolean} forceRefresh - Whether to bypass cache and fetch from Firestore
 * @returns {Promise<Array>} Array of tokens
 */
export const getAllTokens = async (forceRefresh = false) => {
  // Check if we have fresh cached data
  const now = Date.now();
  const cachedTokens = localStorage.getItem('cachedTokens');
  const cachedTimestamp = parseInt(localStorage.getItem('cachedTokensTimestamp') || '0');
  
  // Use cache if it's fresh and we're not forcing a refresh
  if (!forceRefresh && cachedTokens && (now - cachedTimestamp < CACHE_DURATION)) {
    return JSON.parse(cachedTokens);
  }
  
  // Otherwise fetch from Firestore
  try {
    const tokensSnapshot = await getDocs(collection(db, 'tokens'));
    const tokensData = tokensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Update cache
    localStorage.setItem('cachedTokens', JSON.stringify(tokensData));
    localStorage.setItem('cachedTokensTimestamp', now.toString());
    
    return tokensData;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    
    // Return cached data even if expired in case of error
    if (cachedTokens) {
      return JSON.parse(cachedTokens);
    }
    
    return [];
  }
};

/**
 * Check if the cache is fresh or needs refreshing
 * @returns {boolean} Whether the token cache is fresh
 */
export const isTokenCacheFresh = () => {
  const now = Date.now();
  const cachedTimestamp = parseInt(localStorage.getItem('cachedTokensTimestamp') || '0');
  return (now - cachedTimestamp < CACHE_DURATION);
};

/**
 * Get tokens grouped by category
 * @param {boolean} forceRefresh - Whether to bypass cache
 * @returns {Promise<Object>} Object with category keys and token arrays
 */
export const getTokensByCategory = async (forceRefresh = false) => {
  const tokens = await getAllTokens(forceRefresh);
  
  // Group tokens by category
  return tokens.reduce((acc, token) => {
    const category = token.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(token);
    return acc;
  }, {});
}; 