import React, { useEffect, useState } from 'react';

// This is a reference implementation showing where to add the sessionStorage check
// in the Trading.jsx component's initialization logic

const TradingInitialization = () => {
  const [cryptoId, setCryptoId] = useState(null);
  const [location, setLocation] = useState(null);
  const [cryptoData, setCryptoData] = useState(null);
  const [marketPrice, setMarketPrice] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [orderBook, setOrderBook] = useState(null);

  useEffect(() => {
    // Only run this initialization once on mount
    const initializeCryptoData = async () => {
      try {
        const params = getSearchParams();
        
        // First priority: Handle custom token from URL parameters
        if (params.symbol && params.address && params.chain && params.custom === 'true') {
          // Custom token handling logic
          // ...existing code...
          
          // Set up cleanup for the interval
          return;
        }
        
        // Second priority: Check for state data from navigation (clicking from list)
        if (location && location.state && location.state.cryptoData) {
          console.log('Using crypto data from navigation state:', location.state.cryptoData);
          setCryptoData(location.state.cryptoData);
          
          // Initialize price from the provided data
          if (location.state.cryptoData.chartData?.lastPrice) {
            const price = parseFloat(location.state.cryptoData.chartData.lastPrice);
            if (!isNaN(price) && price > 0) {
              console.log('Setting price from navigation state:', price);
              setMarketPrice(price);
              setCurrentPrice(price);
              setLastPrice(price);
              setOrderBook(generateOrderBook(price));
            }
          }
          return;
        }
        
        // Third priority: Check sessionStorage for data from search
        if (cryptoId) {
          try {
            // Check sessionStorage for data from search results
            const storedData = sessionStorage.getItem(`trading_data_${cryptoId}`);
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              console.log('Using crypto data from sessionStorage:', parsedData);
              setCryptoData(parsedData);
              
              // Initialize price from the stored data
              if (parsedData.chartData?.lastPrice) {
                const price = parseFloat(parsedData.chartData.lastPrice);
                if (!isNaN(price) && price > 0) {
                  console.log('Setting price from sessionStorage:', price);
                  setMarketPrice(price);
                  setCurrentPrice(price);
                  setLastPrice(price);
                  setOrderBook(generateOrderBook(price));
                }
              }
              return; // Skip the rest of the initialization since we have data
            }
          } catch (error) {
            console.error('Error checking sessionStorage:', error);
            // Continue with normal initialization
          }
          
          // If we get here, we need to fetch data from the database
          console.log('No state or sessionStorage data, fetching from database...');
          
          // Existing database fetch logic...
        }
      } catch (error) {
        console.error('Error initializing crypto data:', error);
      }
    };
    
    initializeCryptoData();
    
    // Cleanup function to clear custom token intervals
    return () => {
      if (window.customTokenInterval) {
        console.log('Cleaning up custom token interval on unmount');
        clearInterval(window.customTokenInterval);
        window.customTokenInterval = null;
      }
    };
  }, [cryptoId, location]);

  return (
    <div>
      {/* Rest of the component code would go here */}
    </div>
  );
};

export default TradingInitialization; 