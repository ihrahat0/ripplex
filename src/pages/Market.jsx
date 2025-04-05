import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import CryptoPrices from '../components/CryptoPrices';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0B0B0F 0%, #121218 100%);
  padding: 20px;
`;

const MarketCard = styled.div`
  background: rgba(0, 0, 0, 0.8);
  border-radius: 16px;
  width: 100%;
  overflow: hidden;
  position: relative;
  margin-top: 60px;
  padding: 20px;
`;

const Market = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchFilter, setSearchFilter] = useState('');
  
  // Extract search parameter from URL when component mounts or URL changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchParam = queryParams.get('search');
    if (searchParam) {
      const decoded = decodeURIComponent(searchParam);
      console.log('Market page search param:', decoded);
      
      // Special handling for TRON/TRX
      if (decoded.toUpperCase() === 'TRON' || decoded.toUpperCase() === 'TRX') {
        console.log('Special handling for TRON/TRX search');
        setSearchFilter('TRX'); // Set to the symbol which is more likely to match
      } else {
        setSearchFilter(decoded);
      }
    } else {
      setSearchFilter('');
    }
  }, [location.search]);

  return (
    <Container>
      <MarketCard>
        <CryptoPrices 
          searchFilter={searchFilter} 
          onClearSearch={() => navigate('/market')}
        />
      </MarketCard>
    </Container>
  );
};

export default Market;