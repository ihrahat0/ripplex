import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { makeCleanable, safeCleanup } from '../utils/cleanup';

const ChartContainer = styled.div`
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #1E2026;
`;

const LoadingContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #e6edf3;
  background: #1E2026;
`;

const ErrorContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #e6edf3;
  background: #1E2026;
  
  h3 {
    color: #ff725a;
    margin-bottom: 10px;
  }
  
  p {
    color: #8b949e;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const PriceInfo = styled.div`
  display: flex;
  flex-direction: column;
  
  .coin-name {
    font-size: 18px;
    font-weight: 500;
    color: #e6edf3;
    display: flex;
    align-items: center;
    gap: 8px;
    
    img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
  }
  
  .price {
    font-size: 24px;
    font-weight: 600;
    color: #e6edf3;
  }
  
  .change {
    font-size: 14px;
    color: ${props => props.change >= 0 ? '#0ECB81' : '#F6465D'};
    display: flex;
    align-items: center;
    gap: 5px;
  }
`;

const TimeframeSelector = styled.div`
  display: flex;
  gap: 5px;
  
  button {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #8b949e;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    &.active {
      background: rgba(255, 114, 90, 0.2);
      color: #ff725a;
    }
  }
`;

/**
 * TradingViewChart component for displaying coin price charts
 * @param {Object} props Component props
 * @param {Object} props.coin The coin object with trading details
 * @param {string} props.height Chart height (default: 400px)
 * @param {string} props.containerId Unique container ID (default: random)
 * @param {function} props.onPriceUpdate Callback when price updates
 * @returns {JSX.Element} The TradingView chart component
 */
const TradingViewChart = ({ 
  coin, 
  height = '400px',
  containerId = `tv_chart_${Math.random().toString(36).substring(2, 9)}`,
  onPriceUpdate
}) => {
  const [timeframe, setTimeframe] = useState('60'); // Default to 1 hour
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(0);
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const scriptRef = useRef(null);

  // Safely cleanup the TradingView widget
  const cleanup = () => {
    try {
      if (widgetRef.current) {
        if (typeof widgetRef.current.remove === 'function') {
          widgetRef.current.remove();
        } else if (typeof widgetRef.current.cleanup === 'function') {
          widgetRef.current.cleanup();
        }
        widgetRef.current = null;
      }
      
      // Clean container manually
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
    } catch (err) {
      console.error('Error cleaning up TradingView widget:', err);
    }
  };

  // Handle price updates and calculate change
  const handlePriceUpdate = (newPrice) => {
    if (!price) {
      setPrice(newPrice);
    } else {
      const change = ((newPrice - price) / price) * 100;
      setPriceChange(change);
      setPrice(newPrice);
    }
    
    // Propagate price update to parent component
    if (onPriceUpdate) {
      onPriceUpdate(newPrice);
    }
  };

  // Add a function to validate and correct exchange settings
  const validateExchange = (exchange) => {
    // Only allow Binance and OKX
    const validExchanges = ['BINANCE', 'OKEX'];
    const exchangeNames = {
      'BINANCE': 'Binance',
      'OKEX': 'OKX'
    };
    
    console.log("validateExchange received:", exchange, typeof exchange);
    
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

  useEffect(() => {
    if (!coin || !coin.tradingView || !coin.tradingView.enabled) {
      setError('This coin does not have TradingView integration enabled');
      setIsLoading(false);
      return;
    }
    
    // Cleanup previous widget if it exists
    cleanup();
    setIsLoading(true);
    
    // Create script element if it doesn't exist
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.id = 'tradingview-script';
    scriptRef.current = script;
    
    // Check if script already exists in document
    if (!document.getElementById('tradingview-script')) {
      document.head.appendChild(script);
    }
    
    // Initialize widget after script loads
    const initializeWidget = () => {
      if (window.TradingView) {
        try {
          // Make sure the container element exists
          const containerElement = document.getElementById(containerId);
          if (!containerElement) {
            setError(`TradingView container element with ID "${containerId}" not found`);
            setIsLoading(false);
            return;
          }
          
          // Get the TradingView symbol from the coin
          // Validate that the exchange is supported (only BINANCE or OKEX)
          console.log("Raw coin data:", coin);
          console.log("Raw tradingView data:", coin.tradingView);
          console.log("Raw exchange value:", coin.tradingView.exchange);
          console.log("Raw symbol value:", coin.tradingView.symbol);
          const validatedExchange = validateExchange(coin.tradingView.exchange);
          console.log("After validation:", validatedExchange);
          const symbol = `${validatedExchange.code}:${coin.tradingView.symbol}`;
          console.log("Final TradingView symbol:", symbol);
          
          // Create the widget
          const widget = new window.TradingView.widget({
            symbol: symbol,
            interval: timeframe,
            container_id: containerId,
            locale: 'en',
            theme: 'dark',
            autosize: true,
            timezone: 'exchange',
            style: '1', // Candlestick chart
            toolbar_bg: '#1E2026',
            enable_publishing: false,
            save_image: false,
            hide_side_toolbar: true,
            allow_symbol_change: false,
            studies: [],
            disabled_features: [
              'header_symbol_search',
              'header_screenshot',
              'header_compare',
              'header_saveload',
              'save_chart_properties_to_local_storage'
            ],
            enabled_features: ['hide_left_toolbar_by_default'],
            overrides: {
              'mainSeriesProperties.candleStyle.upColor': '#0ECB81',
              'mainSeriesProperties.candleStyle.downColor': '#F6465D',
              'mainSeriesProperties.candleStyle.wickUpColor': '#0ECB81',
              'mainSeriesProperties.candleStyle.wickDownColor': '#F6465D',
              'paneProperties.background': '#1E2026',
              'paneProperties.vertGridProperties.color': '#2A2E39',
              'paneProperties.horzGridProperties.color': '#2A2E39',
            },
            onChartReady: function() {
              try {
                setIsLoading(false);
                
                const chart = widget.chart();
                
                // Listen for price updates
                chart.onCrosshairMove(function(param) {
                  try {
                    if (param && param.price) {
                      handlePriceUpdate(param.price);
                    }
                  } catch (err) {
                    console.warn('Error in onCrosshairMove handler:', err);
                  }
                });
                
                // Get the current price
                setTimeout(() => {
                  const currentPrice = chart.crosshairPrice();
                  if (currentPrice) {
                    handlePriceUpdate(currentPrice);
                  }
                }, 1000); // Give chart a moment to initialize
                
              } catch (err) {
                console.error('Error in onChartReady handler:', err);
                setError('Error initializing chart');
                setIsLoading(false);
              }
            }
          });
          
          // Make widget cleanup-friendly
          widgetRef.current = makeCleanable(widget);
          
        } catch (err) {
          console.error('Error initializing TradingView widget:', err);
          setError('Error initializing TradingView chart');
          setIsLoading(false);
        }
      }
    };

    // If script is already loaded, initialize immediately
    if (window.TradingView) {
      initializeWidget();
    } else {
      // Otherwise wait for script to load
      script.onload = initializeWidget;
      script.onerror = () => {
        setError('Failed to load TradingView script');
        setIsLoading(false);
      };
    }

    // Cleanup function
    return safeCleanup(() => {
      cleanup();
    });
  }, [coin, timeframe, containerId]);

  if (!coin) {
    return (
      <ErrorContainer>
        <h3>Chart not available</h3>
        <p>No coin data provided</p>
      </ErrorContainer>
    );
  }

  if (!coin.tradingView || !coin.tradingView.enabled) {
    return (
      <ErrorContainer>
        <h3>TradingView Chart Not Available</h3>
        <p>This coin does not have TradingView integration enabled</p>
      </ErrorContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <h3>Error Loading Chart</h3>
        <p>{error}</p>
      </ErrorContainer>
    );
  }

  return (
    <ChartContainer style={{ height }}>
      <ChartHeader>
        <PriceInfo change={priceChange}>
          <div className="coin-name">
            {coin.logoUrl && (
              <img 
                src={coin.logoUrl} 
                alt={coin.symbol}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://via.placeholder.com/24/30363d/FFFFFF?text=${coin.symbol.charAt(0)}`;
                }}
              />
            )}
            {coin.name} ({coin.symbol})
          </div>
          
          {price ? (
            <div className="price">
              ${typeof price === 'number' ? price.toFixed(2) : price}
            </div>
          ) : (
            <div className="price">Loading...</div>
          )}
          
          {priceChange !== 0 && (
            <div className="change">
              <i className={`bi bi-arrow-${priceChange >= 0 ? 'up' : 'down'}`}></i>
              {Math.abs(priceChange).toFixed(2)}%
            </div>
          )}
        </PriceInfo>
        
        <TimeframeSelector>
          <button 
            className={timeframe === '1' ? 'active' : ''} 
            onClick={() => setTimeframe('1')}
          >
            1m
          </button>
          <button 
            className={timeframe === '5' ? 'active' : ''} 
            onClick={() => setTimeframe('5')}
          >
            5m
          </button>
          <button 
            className={timeframe === '15' ? 'active' : ''} 
            onClick={() => setTimeframe('15')}
          >
            15m
          </button>
          <button 
            className={timeframe === '60' ? 'active' : ''} 
            onClick={() => setTimeframe('60')}
          >
            1h
          </button>
          <button 
            className={timeframe === '240' ? 'active' : ''} 
            onClick={() => setTimeframe('240')}
          >
            4h
          </button>
          <button 
            className={timeframe === 'D' ? 'active' : ''} 
            onClick={() => setTimeframe('D')}
          >
            1d
          </button>
          <button 
            className={timeframe === 'W' ? 'active' : ''} 
            onClick={() => setTimeframe('W')}
          >
            1w
          </button>
        </TimeframeSelector>
      </ChartHeader>
      
      {isLoading ? (
        <LoadingContainer>
          <div style={{ 
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 114, 90, 0.1)',
            borderTopColor: '#ff725a',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '15px' }}>Loading chart...</p>
        </LoadingContainer>
      ) : (
        <div 
          id={containerId}
          ref={containerRef}
          style={{ height: 'calc(100% - 80px)' }}
        />
      )}
    </ChartContainer>
  );
};

export default TradingViewChart; 