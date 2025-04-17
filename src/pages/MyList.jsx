import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
`;

const Card = styled.div`
  background: rgba(22, 27, 34, 0.7);
  border-radius: 10px;
  padding: 25px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
`;

const PageTitle = styled.h1`
  color: #e6edf3;
  margin: 0 0 30px 0;
  font-size: 28px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  
  i {
    color: #ff725a;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: grid;
  gap: 8px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(30, 35, 44, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
  }
  
  &:disabled {
    background: rgba(30, 35, 44, 0.5);
    color: rgba(255, 255, 255, 0.6);
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  background: rgba(30, 35, 44, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: calc(100% - 12px) center;
  padding-right: 30px;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
  }
`;

const Button = styled.button`
  background: ${props => props.$variant === 'secondary' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 114, 90, 0.15)'};
  color: ${props => props.$variant === 'secondary' ? '#fff' : '#ff725a'};
  border: 1px solid ${props => props.$variant === 'secondary' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 114, 90, 0.3)'};
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: fit-content;
  
  &:hover {
    background: ${props => props.$variant === 'secondary' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 114, 90, 0.25)'};
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  i {
    font-size: 16px;
  }
`;

const TokensTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  th {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    font-size: 14px;
  }
  
  td {
    color: #e6edf3;
    font-size: 14px;
    vertical-align: middle;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tr:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const TokenIcon = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #30363d;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e6edf3;
  font-weight: 600;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ErrorMessage = styled.div`
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.2);
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  color: #4cd964;
  background: rgba(76, 217, 100, 0.1);
  border: 1px solid rgba(76, 217, 100, 0.2);
  padding: 10px 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const LoadingSpinner = styled.div`
  border: 2px solid rgba(255, 114, 90, 0.1);
  border-top: 2px solid #ff725a;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

function MyList() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userTokens, setUserTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTokenInfo, setFetchingTokenInfo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    address: '',
    chainId: 'ethereum',
    name: '',
    symbol: '',
    logoUrl: ''
  });
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    fetchUserTokens();
  }, [currentUser, navigate]);
  
  const fetchUserTokens = async () => {
    try {
      setLoading(true);
      
      const userTokensQuery = query(collection(db, 'userTokens'), where('userId', '==', currentUser.uid));
      const userTokensSnapshot = await getDocs(userTokensQuery);
      
      const tokensList = userTokensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserTokens(tokensList);
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      setError('Failed to load your token list. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset error and success messages when user types
    setError('');
    setSuccess('');
  };
  
  const fetchTokenInfo = async () => {
    const { address, chainId } = formData;
    
    if (!address) {
      setError('Please enter a contract address');
      return;
    }
    
    try {
      setFetchingTokenInfo(true);
      setError('');
      
      // First, try the pairs endpoint
      try {
        const response = await axios.get(`/api/dexscreener/pairs/${chainId}/${address}`);
        
        const pairs = response.data?.pairs;
        if (pairs && pairs.length > 0) {
          const pair = pairs[0];
          const baseToken = pair.baseToken;
          
          setFormData(prev => ({
            ...prev,
            name: baseToken.name,
            symbol: baseToken.symbol,
            logoUrl: baseToken.logoUrl || ''
          }));
          
          return;
        }
      } catch (error) {
        console.error('Error fetching from pairs endpoint:', error);
        // Continue to next method
      }
      
      // If the first method fails, try the search endpoint
      try {
        const response = await axios.get(`/api/dexscreener/search?q=${address}`);
        
        const pairs = response.data?.pairs;
        if (pairs && pairs.length > 0) {
          // Find the pair matching our chain
          const pair = pairs.find(p => p.chainId === chainId) || pairs[0];
          const baseToken = pair.baseToken;
          
          setFormData(prev => ({
            ...prev,
            name: baseToken.name,
            symbol: baseToken.symbol,
            logoUrl: baseToken.logoUrl || ''
          }));
          
          return;
        }
      } catch (error) {
        console.error('Error fetching from search endpoint:', error);
        // Continue to next method
      }
      
      // If both methods fail, try the tokens endpoint
      try {
        const response = await axios.get(`/api/dexscreener/tokens/${address}`);
        
        const pairs = response.data?.pairs;
        if (pairs && pairs.length > 0) {
          // Find the pair matching our chain
          const pair = pairs.find(p => p.chainId === chainId) || pairs[0];
          
          // Determine which token is the one we're looking for
          const baseToken = pair.baseToken.address.toLowerCase() === address.toLowerCase() 
            ? pair.baseToken 
            : pair.quoteToken;
          
          setFormData(prev => ({
            ...prev,
            name: baseToken.name,
            symbol: baseToken.symbol,
            logoUrl: baseToken.logoUrl || ''
          }));
          
          return;
        }
      } catch (error) {
        console.error('Error fetching from tokens endpoint:', error);
      }
      
      // If all methods fail, show an error
      setError('Token not found. Please check the contract address and chain.');
      
    } catch (error) {
      console.error('Error fetching token info:', error);
      setError(`Failed to fetch token info: ${error.message}`);
    } finally {
      setFetchingTokenInfo(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { address, chainId, name, symbol } = formData;
    
    if (!address || !chainId || !name || !symbol) {
      setError('All fields are required. Please fetch token info first.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if token already exists for this user
      const existingTokenQuery = query(
        collection(db, 'userTokens'), 
        where('userId', '==', currentUser.uid),
        where('address', '==', address.toLowerCase()),
        where('chainId', '==', chainId)
      );
      
      const existingTokens = await getDocs(existingTokenQuery);
      
      if (!existingTokens.empty) {
        setError('This token is already in your list.');
        return;
      }
      
      // Add token to user's list
      const tokenData = {
        userId: currentUser.uid,
        address: address.toLowerCase(),
        chainId,
        name,
        symbol,
        logoUrl: formData.logoUrl || null,
        createdAt: serverTimestamp(),
        isActive: true
      };
      
      await addDoc(collection(db, 'userTokens'), tokenData);
      
      // Clear form and show success message
      setSuccess(`Token ${symbol} added to your list!`);
      setFormData({
        address: '',
        chainId: 'ethereum',
        name: '',
        symbol: '',
        logoUrl: ''
      });
      
      // Refresh token list
      fetchUserTokens();
      
    } catch (error) {
      console.error('Error adding token:', error);
      setError(`Failed to add token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTradeToken = async (token) => {
    // Create a unique ID for the custom token
    const customTokenId = `custom_${token.address.substring(0, 8)}`;
    
    // First fetch the current price from DexScreener
    setLoading(true);
    try {
      const response = await axios.get(`/api/dexscreener/pairs/${token.chainId}/${token.address}`);
      
      // Check if we have valid price data
      let price = 0;
      let change24h = 0;
      let volume24h = 0;
      
      if (response.data?.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];
        price = parseFloat(pair.priceUsd || 0);
        change24h = parseFloat(pair.priceChange?.h24 || 0);
        volume24h = parseFloat(pair.volume?.h24 || 0);
        
        console.log(`Got price for ${token.symbol}: $${price}`);
      } else {
        console.warn('No price data found for token:', token.symbol);
      }
      
      // Create the trading data structure expected by the Trading component
      const tradingData = {
        token: {
          id: customTokenId,
          name: token.name,
          symbol: token.symbol,
          type: 'dex',
          chainId: token.chainId,
          address: token.address,
          image: token.logoUrl || `https://coinicons-api.vercel.app/api/icon/${token.symbol.toLowerCase()}`
        },
        pairInfo: {
          symbol: `${token.symbol}/USDT`,
          baseAsset: 'USDT',
          quoteAsset: token.symbol,
          address: token.address,
          priceUsd: price.toString()
        },
        chartData: {
          lastPrice: price,
          price: price,
          change24h: change24h,
          volume24h: volume24h
        },
        isCustomToken: true
      };
      
      // Navigate to the trading page with the custom token ID and pass the data in state
      navigate(`/trading/${customTokenId}`, { 
        state: { 
          cryptoData: tradingData,
          custom: true
        } 
      });
    } catch (error) {
      console.error('Error fetching token price:', error);
      
      // Navigate anyway with default price of 0
      const tradingData = {
        token: {
          id: customTokenId,
          name: token.name,
          symbol: token.symbol,
          type: 'dex',
          chainId: token.chainId,
          address: token.address,
          image: token.logoUrl || `https://coinicons-api.vercel.app/api/icon/${token.symbol.toLowerCase()}`
        },
        pairInfo: {
          symbol: `${token.symbol}/USDT`,
          baseAsset: 'USDT',
          quoteAsset: token.symbol,
          address: token.address
        },
        chartData: {
          lastPrice: 0,
          change24h: 0,
          volume24h: 0
        },
        isCustomToken: true
      };
      
      navigate(`/trading/${customTokenId}`, { 
        state: { 
          cryptoData: tradingData,
          custom: true
        } 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteToken = async (tokenId) => {
    if (!window.confirm('Are you sure you want to remove this token from your list?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'userTokens', tokenId));
      
      setSuccess('Token removed from your list');
      
      // Refresh token list
      fetchUserTokens();
      
    } catch (error) {
      console.error('Error deleting token:', error);
      setError(`Failed to delete token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const getChainName = (chainId) => {
    if (!chainId) return 'Unknown';
    
    // Normalize chainId to lowercase string for comparison
    const normalizedChainId = String(chainId).toLowerCase();
    
    const chains = {
      'ethereum': 'Ethereum',
      'bsc': 'Binance Smart Chain',
      'polygon': 'Polygon',
      'avalanche': 'Avalanche',
      'arbitrum': 'Arbitrum',
      'fantom': 'Fantom',
      'optimism': 'Optimism',
      'cronos': 'Cronos',
      'solana': 'Solana',
      'base': 'Base',
      '1': 'Ethereum',
      '56': 'Binance Smart Chain',
      '137': 'Polygon',
      '43114': 'Avalanche',
      '42161': 'Arbitrum',
      '250': 'Fantom',
      '10': 'Optimism',
      '25': 'Cronos',
      '8453': 'Base'
    };
    
    return chains[normalizedChainId] || normalizedChainId;
  };
  
  return (
    <Container>
      <PageTitle>
        <i className="bi bi-star-fill"></i> My Token List
      </PageTitle>
      
      <Card>
        <h2 style={{ color: '#e6edf3', fontSize: '18px', marginTop: 0, marginBottom: '20px' }}>
          <i className="bi bi-plus-circle" style={{ color: '#ff725a', marginRight: '8px' }}></i> 
          Add Custom Token
        </h2>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Token Address *</Label>
            <FormRow>
              <Input 
                type="text" 
                name="address" 
                value={formData.address}
                onChange={handleChange}
                placeholder="0x... or dapp..."
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <Select
                  name="chainId"
                  value={formData.chainId}
                  onChange={handleChange}
                  required
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="bsc">Binance Smart Chain</option>
                  <option value="polygon">Polygon</option>
                  <option value="avalanche">Avalanche</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="solana">Solana</option>
                  <option value="base">Base</option>
                  <option value="fantom">Fantom</option>
                  <option value="optimism">Optimism</option>
                </Select>
                <Button 
                  type="button" 
                  onClick={fetchTokenInfo}
                  disabled={fetchingTokenInfo || !formData.address}
                  style={{ padding: '12px 16px', margin: '0' }}
                >
                  {fetchingTokenInfo ? <LoadingSpinner /> : <i className="bi bi-search"></i>}
                </Button>
              </div>
            </FormRow>
          </FormGroup>
          
          <FormRow>
            <FormGroup>
              <Label>Token Name</Label>
              <Input 
                type="text" 
                name="name" 
                value={formData.name}
                onChange={handleChange}
                placeholder="Token name will appear here"
                disabled
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label>Token Symbol</Label>
              <Input 
                type="text" 
                name="symbol" 
                value={formData.symbol}
                onChange={handleChange}
                placeholder="Symbol will appear here"
                disabled
                required
              />
            </FormGroup>
          </FormRow>
          
          <FormGroup>
            <Label>Logo URL (Optional)</Label>
            <Input 
              type="text" 
              name="logoUrl" 
              value={formData.logoUrl}
              onChange={handleChange}
              placeholder="Logo URL will appear here if available"
              disabled
            />
          </FormGroup>
          
          <Button 
            type="submit" 
            disabled={loading || !formData.name || !formData.symbol}
          >
            {loading ? <LoadingSpinner /> : <i className="bi bi-plus-circle"></i>} 
            Add Token to My List
          </Button>
        </Form>
      </Card>
      
      <Card>
        <h2 style={{ color: '#e6edf3', fontSize: '18px', marginTop: 0, marginBottom: '20px' }}>
          <i className="bi bi-list" style={{ color: '#ff725a', marginRight: '8px' }}></i> 
          My Tokens
        </h2>
        
        <TokensTable>
          <thead>
            <tr>
              <th>Token</th>
              <th>Symbol</th>
              <th>Chain</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <LoadingSpinner style={{ width: '20px', height: '20px' }} />
                    Loading your tokens...
                  </div>
                </td>
              </tr>
            ) : userTokens.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px 0' }}>
                  No tokens in your list yet. Add your first token above.
                </td>
              </tr>
            ) : (
              userTokens.map(token => (
                <tr key={token.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TokenIcon>
                        {token.logoUrl ? (
                          <img 
                            src={token.logoUrl} 
                            alt={token.symbol}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/30?text=' + token.symbol.charAt(0);
                            }}
                          />
                        ) : (
                          token.symbol.charAt(0)
                        )}
                      </TokenIcon>
                      {token.name}
                    </div>
                  </td>
                  <td>{token.symbol}</td>
                  <td>{getChainName(token.chainId)}</td>
                  <td>
                    <div style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '180px',
                      whiteSpace: 'nowrap'
                    }}>
                      {token.address}
                    </div>
                  </td>
                  <td>
                    <ActionButtons>
                      <Button 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => handleTradeToken(token)}
                      >
                        <i className="bi bi-graph-up"></i> Trade
                      </Button>
                      <Button 
                        style={{ 
                          padding: '6px 10px', 
                          fontSize: '12px',
                          background: 'rgba(255, 59, 48, 0.15)',
                          color: '#ff3b30',
                          borderColor: 'rgba(255, 59, 48, 0.3)'
                        }}
                        onClick={() => handleDeleteToken(token.id)}
                      >
                        <i className="bi bi-trash"></i> Remove
                      </Button>
                    </ActionButtons>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TokensTable>
      </Card>
    </Container>
  );
}

export default MyList;
