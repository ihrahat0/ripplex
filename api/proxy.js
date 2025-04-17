const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy route for DexScreener API
router.get('/dexscreener/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    const query = req.query.q || '';
    
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/${endpoint}?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from DexScreener' });
  }
});

module.exports = router; 