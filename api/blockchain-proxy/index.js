// Blockchain proxy API to handle CORS issues
// This is a server-side solution that will make requests to blockchain explorers
// on behalf of the client and return the results

const axios = require('axios');

// Configure blockchain APIs
const BLOCKCHAIN_APIS = {
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    scanApi: 'https://api.etherscan.io/api',
    apiKey: 'VVZQW84IDVZ5CR8ZGK7ER1WBVYQH9D8RI1'
  },
  bsc: {
    name: 'BSC',
    symbol: 'BNB',
    scanApi: 'https://api.bscscan.com/api',
    apiKey: 'AKXNRYA5WTQIVT8MI75JW2C9QU26M46PN6'
  },
  polygon: {
    name: 'Polygon',
    symbol: 'MATIC',
    scanApi: 'https://api.polygonscan.com/api',
    apiKey: 'X8G6YQ1KHUTFB9ZSB3I52GREXQ1PC5AVZ9'
  },
  arbitrum: {
    name: 'Arbitrum',
    symbol: 'ETH',
    scanApi: 'https://api.arbiscan.io/api',
    apiKey: 'KQQ2T74X5JQ71IKINAQSA78MQI1DE21W8F'
  },
  base: {
    name: 'Base',
    symbol: 'ETH',
    scanApi: 'https://api.basescan.org/api',
    apiKey: '4ING76I5K3ZRFM4R85RGW6WKK6UGP9Y1YA'
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    scanApi: 'https://public-api.solscan.io',
    rpcApi: 'https://api.mainnet-beta.solana.com',
    apiKey: ''
  }
};

/**
 * Main handler for the API
 */
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST requests for actual API calls
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { chain, address, action, apiKey } = req.body;

    // Validate required parameters
    if (!chain || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters. Chain and address are required.' 
      });
    }

    // Check if chain is supported
    if (!BLOCKCHAIN_APIS[chain]) {
      return res.status(400).json({ 
        success: false, 
        message: `Unsupported blockchain: ${chain}. Available chains are: ${Object.keys(BLOCKCHAIN_APIS).join(', ')}` 
      });
    }

    // Use appropriate API key (provided or default)
    const chainApiKey = apiKey || BLOCKCHAIN_APIS[chain].apiKey;

    // Handle different actions
    switch (action) {
      case 'fetch-transactions':
        return await fetchTransactions(res, chain, address, chainApiKey);
      case 'get-balance':
        return await getBalance(res, chain, address, chainApiKey);
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Unsupported action: ${action}. Available actions are: fetch-transactions, get-balance` 
        });
    }
  } catch (error) {
    console.error('Blockchain proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
};

/**
 * Fetch transactions for an address on a specific blockchain
 */
async function fetchTransactions(res, chain, address, apiKey) {
  try {
    console.log(`Fetching ${chain} transactions for ${address}`);

    if (chain === 'solana') {
      return await fetchSolanaTransactions(res, address);
    }

    // Handle different EVM chains with appropriate actions
    let apiUrl = `${BLOCKCHAIN_APIS[chain].scanApi}?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;
    
    // Add special handling for specific chains if needed
    if (chain === 'bsc') {
      // Ensure we're using the right endpoint for BSC
      apiUrl = `${BLOCKCHAIN_APIS[chain].scanApi}?module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;
    }
    
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 second timeout to prevent hanging requests
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      return res.status(200).json({
        success: true,
        chain: chain,
        address: address,
        transactions: response.data.result,
        count: response.data.result.length
      });
    } else if (response.data.status === '0' && response.data.message.includes('No transactions found')) {
      // No transactions is a valid response, not an error
      return res.status(200).json({
        success: true,
        chain: chain,
        address: address,
        transactions: [],
        count: 0,
        message: 'No transactions found'
      });
    }
    
    // Handle API errors but return a 200 status so client doesn't fail
    return res.status(200).json({
      success: false,
      chain: chain,
      address: address,
      message: response.data.message || 'Error retrieving transactions',
      apiResponse: response.data,
      transactions: []
    });
  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return res.status(200).json({
      success: false,
      chain: chain,
      address: address,
      message: `Error fetching transactions: ${error.message}`,
      transactions: []
    });
  }
}

/**
 * Fetch Solana transactions for an address
 */
async function fetchSolanaTransactions(res, address) {
  try {
    console.log(`Fetching Solana transactions for ${address}`);
    
    const url = `${BLOCKCHAIN_APIS.solana.scanApi}/account/transactions?account=${address}&limit=50`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      return res.status(200).json({
        success: true,
        chain: 'solana',
        address: address,
        transactions: response.data,
        count: response.data.length
      });
    }
    
    return res.status(200).json({
      success: true,
      chain: 'solana',
      address: address,
      message: 'No Solana transactions found',
      transactions: [],
      count: 0
    });
  } catch (error) {
    console.error('Error fetching Solana transactions:', error);
    return res.status(200).json({
      success: false,
      chain: 'solana',
      address: address,
      message: `Error fetching Solana transactions: ${error.message}`,
      transactions: []
    });
  }
}

/**
 * Get balance for an address on a specific blockchain
 */
async function getBalance(res, chain, address, apiKey) {
  try {
    console.log(`Getting ${chain} balance for ${address}`);
    
    if (chain === 'solana') {
      return await getSolanaBalance(res, address);
    }
    
    // For EVM chains
    const apiUrl = `${BLOCKCHAIN_APIS[chain].scanApi}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data.status === '1') {
      // Convert from wei to full unit (ETH, BNB, etc.)
      const weiBalance = response.data.result;
      const fullBalance = Number(weiBalance) / 1e18;
      
      return res.status(200).json({
        success: true,
        chain: chain,
        address: address,
        balance: fullBalance.toString(),
        weiBalance: weiBalance,
        symbol: BLOCKCHAIN_APIS[chain].symbol
      });
    }
    
    return res.status(200).json({
      success: false,
      chain: chain,
      address: address,
      message: response.data.message || 'Failed to get balance',
      balance: '0',
      weiBalance: '0',
      symbol: BLOCKCHAIN_APIS[chain].symbol
    });
  } catch (error) {
    console.error(`Error getting ${chain} balance:`, error);
    return res.status(200).json({
      success: false,
      chain: chain,
      address: address,
      message: `Error getting balance: ${error.message}`,
      balance: '0',
      weiBalance: '0',
      symbol: BLOCKCHAIN_APIS[chain].symbol
    });
  }
}

/**
 * Get Solana balance for an address
 */
async function getSolanaBalance(res, address) {
  try {
    console.log(`Getting Solana balance for ${address}`);
    
    const url = `${BLOCKCHAIN_APIS.solana.scanApi}/account/${address}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.lamports) {
      // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
      const balance = response.data.lamports / 1000000000;
      
      return res.status(200).json({
        success: true,
        chain: 'solana',
        address: address,
        balance: balance.toString(),
        lamports: response.data.lamports.toString(),
        symbol: 'SOL'
      });
    }
    
    return res.status(200).json({
      success: false,
      chain: 'solana',
      address: address,
      message: 'Failed to get Solana balance',
      balance: '0',
      lamports: '0',
      symbol: 'SOL'
    });
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    return res.status(200).json({
      success: false,
      chain: 'solana',
      address: address,
      message: `Error getting Solana balance: ${error.message}`,
      balance: '0',
      lamports: '0',
      symbol: 'SOL'
    });
  }
} 