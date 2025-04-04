import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import TradingViewChart from '../components/TradingViewChart';
import axios from 'axios';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
`;

const BackButton = styled.button`
  background: rgba(255, 114, 90, 0.1);
  color: #ff725a;
  border: 1px solid rgba(255, 114, 90, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  
  &:hover {
    background: rgba(255, 114, 90, 0.2);
  }
`;

const CoinHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  
  img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-right: 20px;
  }
`;

const CoinTitle = styled.div`
  h1 {
    margin: 0 0 5px 0;
    color: #e6edf3;
    font-size: 32px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .symbol {
    color: #8b949e;
    font-size: 16px;
  }
`;

const PriceSection = styled.div`
  margin-left: auto;
  text-align: right;
  
  .price {
    font-size: 28px;
    font-weight: 600;
    color: #e6edf3;
  }
  
  .price-change {
    font-size: 16px;
    color: ${props => props.$change >= 0 ? '#0ECB81' : '#F6465D'};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
  }
`;

const DetailSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 30px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartSection = styled.div`
  background: rgba(22, 27, 34, 0.5);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  height: 500px;
`;

const InfoCard = styled.div`
  background: rgba(22, 27, 34, 0.5);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoTitle = styled.h2`
  color: #e6edf3;
  font-size: 18px;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  
  .label {
    color: #8b949e;
    font-size: 14px;
  }
  
  .value {
    color: #e6edf3;
    font-size: 14px;
    font-weight: 500;
  }
`;

const DescriptionCard = styled.div`
  background: rgba(22, 27, 34, 0.5);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 30px;
  
  h2 {
    color: #e6edf3;
    font-size: 18px;
    margin: 0 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  p {
    color: #8b949e;
    line-height: 1.6;
    margin: 0;
  }
`;

const StatusBadge = styled.span`
  background: ${props => props.$active ? 'rgba(76, 217, 100, 0.1)' : 'rgba(255, 59, 48, 0.1)'};
  color: ${props => props.$active ? '#4cd964' : '#ff3b30'};
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid rgba(255, 114, 90, 0.1);
    border-top-color: #ff725a;
    animation: spin 1s linear infinite;
  }
  
  p {
    margin-top: 15px;
    color: #8b949e;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const RefreshButton = styled.button`
  background: rgba(255, 114, 90, 0.1);
  color: #ff725a;
  border: 1px solid rgba(255, 114, 90, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  margin-left: 15px;
  
  &:hover {
    background: rgba(255, 114, 90, 0.2);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  i {
    font-size: 18px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  &.refreshing i {
    animation: spin 1s linear infinite;
  }
`;

// Add exchange validation helper
const validateExchange = (exchange) => {
  // Only allow Binance and OKX
  const validExchanges = ['BINANCE', 'OKEX'];
  const exchangeNames = {
    'BINANCE': 'Binance',
    'OKEX': 'OKX'
  };
  
  console.log("validateExchange in CoinDetail received:", exchange, typeof exchange);
  
  // Handle null/undefined exchange
  if (!exchange) {
    console.warn("Exchange is null or undefined, defaulting to BINANCE");
    return {
      code: 'BINANCE',
      name: 'Binance'
    };
  }
  
  // Normalize the exchange name
  const normalizedExchange = exchange.toString().toUpperCase();
  console.log("Normalized exchange:", normalizedExchange);
  
  // Check if it's valid
  if (validExchanges.includes(normalizedExchange)) {
    console.log(`Using validated exchange: ${normalizedExchange}`);
    return {
      code: normalizedExchange,
      name: exchangeNames[normalizedExchange]
    };
  }
  
  // Default to Binance if not valid
  console.warn(`Exchange ${exchange} is not supported. Using BINANCE instead.`);
  return {
    code: 'BINANCE',
    name: 'Binance'
  };
};

const CoinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coin, setCoin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    const fetchCoinDetails = async () => {
      try {
        setLoading(true);
        
        const coinDoc = await getDoc(doc(db, 'coins', id));
        
        if (!coinDoc.exists()) {
          setError('Coin not found');
          setLoading(false);
          return;
        }
        
        const coinData = {
          id: coinDoc.id,
          ...coinDoc.data()
        };
        
        console.log('Fetched coin data:', coinData);
        setCoin(coinData);
        
        // Set initial price if available
        if (coinData.price) {
          setCurrentPrice(coinData.price);
        }
        
      } catch (err) {
        console.error('Error fetching coin details:', err);
        setError(`Failed to load coin details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCoinDetails();
  }, [id]);
  
  const handlePriceUpdate = (price) => {
    if (price && price !== currentPrice) {
      setCurrentPrice(price);
    }
  };
  
  const goBack = () => {
    navigate(-1);
  };
  
  const refreshPrice = async () => {
    if (refreshing || !coin?.tradingView?.enabled) return;
    
    setRefreshing(true);
    
    try {
      // Get validated exchange
      const validatedExchange = validateExchange(coin.tradingView.exchange);
      console.log("Refreshing price using exchange:", validatedExchange);
      
      // Try to get fresh price from TradingView or exchange API
      if (validatedExchange.code === 'BINANCE') {
        try {
          const response = await axios.get(
            `https://api.binance.com/api/v3/ticker/price?symbol=${coin.tradingView.symbol}`,
            { timeout: 5000 }
          );
          
          if (response.data && response.data.price) {
            const newPrice = parseFloat(response.data.price);
            setCurrentPrice(newPrice);
            console.log(`Updated price for ${coin.symbol} from Binance: ${newPrice}`);
          }
        } catch (error) {
          console.error('Error fetching price from Binance:', error);
        }
      } else if (validatedExchange.code === 'OKEX') {
        try {
          const response = await axios.get(
            `https://www.okx.com/api/v5/market/ticker?instId=${coin.tradingView.symbol}`,
            { timeout: 5000 }
          );
          
          if (response.data && response.data.data && response.data.data[0] && response.data.data[0].last) {
            const newPrice = parseFloat(response.data.data[0].last);
            setCurrentPrice(newPrice);
            console.log(`Updated price for ${coin.symbol} from OKX: ${newPrice}`);
          }
        } catch (error) {
          console.error('Error fetching price from OKX:', error);
        }
      }
    } catch (error) {
      console.error('Error refreshing price:', error);
    } finally {
      // Add slight delay to make refresh button animation visible
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  };
  
  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <div className="spinner"></div>
          <p>Loading coin details...</p>
        </LoadingContainer>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <BackButton onClick={goBack}>
          <i className="bi bi-arrow-left"></i> Back
        </BackButton>
        <div style={{ 
          background: 'rgba(255, 59, 48, 0.1)', 
          color: '#ff3b30', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Error</h2>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </Container>
    );
  }
  
  if (!coin) {
    return (
      <Container>
        <BackButton onClick={goBack}>
          <i className="bi bi-arrow-left"></i> Back
        </BackButton>
        <div style={{ 
          background: 'rgba(255, 59, 48, 0.1)', 
          color: '#ff3b30', 
          padding: '20px', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 10px 0' }}>Coin Not Found</h2>
          <p style={{ margin: 0 }}>The requested coin could not be found.</p>
        </div>
      </Container>
    );
  }
  
  return (
    <Container>
      <BackButton onClick={goBack}>
        <i className="bi bi-arrow-left"></i> Back
      </BackButton>
      
      <CoinHeader>
        {coin.logoUrl ? (
          <img 
            src={coin.logoUrl} 
            alt={coin.name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://via.placeholder.com/60/30363d/FFFFFF?text=${coin.symbol.charAt(0)}`;
            }}
          />
        ) : (
          <div style={{ 
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#30363d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e6edf3',
            fontSize: '24px',
            fontWeight: '600',
            marginRight: '20px'
          }}>
            {coin.symbol.charAt(0)}
          </div>
        )}
        
        <CoinTitle>
          <h1>
            {coin.name}
            <StatusBadge $active={coin.isActive}>
              {coin.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
          </h1>
          <div className="symbol">{coin.symbol}</div>
        </CoinTitle>
        
        {currentPrice && (
          <PriceSection $change={0}>
            <div className="price">
              ${parseFloat(currentPrice).toFixed(2)}
              <RefreshButton 
                onClick={refreshPrice} 
                disabled={refreshing || !coin.tradingView?.enabled}
                className={refreshing ? 'refreshing' : ''}
                title="Refresh price"
              >
                <i className="bi bi-arrow-repeat"></i>
              </RefreshButton>
            </div>
            {/* Price change would be added here if we had historical data */}
          </PriceSection>
        )}
      </CoinHeader>
      
      <DetailSection>
        <ChartSection>
          {coin.tradingView && coin.tradingView.enabled ? (
            <TradingViewChart 
              coin={coin} 
              height="100%" 
              onPriceUpdate={handlePriceUpdate}
            />
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#8b949e',
              padding: '20px',
              textAlign: 'center'
            }}>
              <i className="bi bi-bar-chart" style={{ fontSize: '40px', marginBottom: '15px', color: '#ff725a' }}></i>
              <h3 style={{ margin: '0 0 10px 0', color: '#e6edf3' }}>Chart Not Available</h3>
              <p>TradingView integration is not enabled for this coin.</p>
            </div>
          )}
        </ChartSection>
        
        <div>
          <InfoCard>
            <InfoTitle>Coin Information</InfoTitle>
            <InfoRow>
              <span className="label">Symbol</span>
              <span className="value">{coin.symbol}</span>
            </InfoRow>
            <InfoRow>
              <span className="label">Type</span>
              <span className="value">{coin.type === 'cex' ? 'Centralized Exchange' : 'Decentralized Exchange'}</span>
            </InfoRow>
            <InfoRow>
              <span className="label">Category</span>
              <span className="value" style={{ 
                background: 'rgba(255, 114, 90, 0.1)',
                color: '#ff725a',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {coin.category.charAt(0).toUpperCase() + coin.category.slice(1).replace('_', ' ')}
              </span>
            </InfoRow>
            {coin.type === 'dex' && (
              <>
                <InfoRow>
                  <span className="label">Blockchain</span>
                  <span className="value">{coin.chainId}</span>
                </InfoRow>
                <InfoRow>
                  <span className="label">Contract Address</span>
                  <span className="value" style={{ 
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {coin.address}
                  </span>
                </InfoRow>
              </>
            )}
            
            <InfoRow>
              <span className="label">TradingView</span>
              <span className="value">
                {coin.tradingView && coin.tradingView.enabled ? (
                  <span style={{ color: '#4cd964' }}>Enabled</span>
                ) : (
                  <span style={{ color: '#ff3b30' }}>Disabled</span>
                )}
              </span>
            </InfoRow>
            
            {coin.tradingView && coin.tradingView.enabled && (
              <>
                <InfoRow>
                  <span className="label">Chart Symbol</span>
                  <span className="value">
                    {(() => {
                      const validatedExchange = validateExchange(coin.tradingView.exchange);
                      return `${validatedExchange.name} (${coin.tradingView.symbol})`;
                    })()}
                  </span>
                </InfoRow>
                <InfoRow>
                  <span className="label">Price Source</span>
                  <span className="value">{coin.priceSource || 'TradingView'}</span>
                </InfoRow>
              </>
            )}
            
          </InfoCard>
        </div>
      </DetailSection>
      
      <DescriptionCard>
        <h2>About {coin.name}</h2>
        <p>
          {coin.description || `${coin.name} (${coin.symbol}) is a ${coin.type === 'cex' ? 'centralized' : 'decentralized'} 
          exchange cryptocurrency in the ${coin.category.replace('_', ' ')} category.`}
        </p>
      </DescriptionCard>
    </Container>
  );
};

export default CoinDetail; 