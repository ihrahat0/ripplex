import styled from 'styled-components';

// Trading mode indicator components
export const TradingModeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(0, 0, 0, 0.5);
  }
`;

export const TradingModeIcon = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$mode === 'futures' ? '#F7931A' : '#0ECB81'};
`;

export const TradingModeLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 500;
`;

export const TradingModeChange = styled.span`
  font-size: 12px;
  opacity: 0.7;
  text-decoration: underline;
`;

// Leverage control components
export const LeverageContainer = styled.div`
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 10px;
`;

export const LeverageLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 14px;
  color: var(--text);
`;

export const LeverageSlider = styled.input`
  width: 100%;
  margin: 10px 0;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 5px;
  background: ${props => `linear-gradient(90deg, #F7931A 0%, #F7931A ${props.value / 40 * 100}%, rgba(255, 255, 255, 0.2) ${props.value / 40 * 100}%)`};
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #F7931A;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(247, 147, 26, 0.5);
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #F7931A;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(247, 147, 26, 0.5);
    border: none;
  }
`;

export const LeverageBubbles = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
`;

export const LeverageBubble = styled.div`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  background: ${props => props.active ? '#F7931A' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.active ? '#fff' : 'rgba(255, 255, 255, 0.7)'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#F7931A' : 'rgba(255, 255, 255, 0.2)'};
    transform: scale(1.1);
  }
`;

// Login prompt components
export const LoginPrompt = styled.div`
  text-align: center;
  padding: 40px;
  background: var(--bg2);
  border-radius: 8px;
  margin: 20px 0;

  h3 {
    color: var(--text);
    margin-bottom: 16px;
  }

  p {
    color: var(--onsurface);
    margin-bottom: 24px;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
`;

export const StyledButton = styled.button`
  padding: 12px 24px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;

  &:first-child {
    background: var(--primary);
    color: white;

    &:hover {
      background: var(--primary-dark);
    }
  }

  &:last-child {
    background: transparent;
    border: 1px solid var(--primary);
    color: var(--primary);

    &:hover {
      background: var(--primary);
      color: white;
    }
  }
`;

export const StatusMessage = styled.div`
  color: ${props => props.error ? '#F6465D' : '#0ECB81'};
  padding: 8px;
  text-align: center;
  background: ${props => props.error ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)'};
  border-radius: 4px;
  margin-bottom: 16px;
`;

// Order book components
export const OrderBookArrow = styled.span`
  color: ${props => props.$direction === 'up' ? '#0ECB81' : '#F6465D'};
  margin-right: 4px;
  font-size: 14px;
`;

export const OrderBookFlag = styled.span`
  color: #F0B90B;
  margin-left: 4px;
  font-size: 12px;
`;

export const OrderBookRatio = styled.div`
  display: flex;
  align-items: center;
  height: 28px;
  background: linear-gradient(
    to right,
    rgba(14, 203, 129, 0.2) ${props => props.$buyPercent}%,
    rgba(246, 70, 93, 0.2) ${props => props.$buyPercent}%
  );
  margin-top: 8px;
  border-radius: 4px;
  overflow: hidden;
`;

export const RatioIndicator = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 0 8px;
  align-items: center;
`;

// Debug and chart components
export const DebugContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  color: #fff;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
`;

export const DebugTitle = styled.div`
  font-weight: bold;
  margin-bottom: 8px;
  color: #f7931a;
`;

export const ChartPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  margin-bottom: 20px;
`;

export const OrderBookContainer = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  margin-top: 20px;
`;

export const OrderBookHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 15px;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 500;
`; 