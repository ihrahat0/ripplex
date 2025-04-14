import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1A1A25 0%, #13131D 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(247, 147, 26, 0.15);
  position: relative;
  overflow: hidden;
  animation: ${slideIn} 0.4s ease-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #F7931A, #D4AF37);
    border-radius: 2px;
  }
`;

const Title = styled.h2`
  color: #fff;
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(90deg, #F7931A, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const OptionsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  
  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const OptionCard = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
  
  ${props => props.$selected && `
    border-color: #F7931A;
    background: rgba(247, 147, 26, 0.1);
  `}
`;

const OptionIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  background: ${props => props.$type === 'futures' 
    ? 'linear-gradient(135deg, #3E7BFA, #6149F9)' 
    : 'linear-gradient(135deg, #F7931A, #D4AF37)'};
  
  svg {
    width: 30px;
    height: 30px;
    color: #fff;
  }
`;

const OptionTitle = styled.h3`
  color: #fff;
  font-size: 18px;
  margin-bottom: 10px;
`;

const OptionDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  text-align: center;
  margin-bottom: 0;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
`;

const ContinueButton = styled.button`
  padding: 12px 30px;
  background: linear-gradient(90deg, #F7931A, #D4AF37);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: ${props => props.$disabled ? 0.6 : 1};
  pointer-events: ${props => props.$disabled ? 'none' : 'auto'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(247, 147, 26, 0.3);
  }
`;

const TradingModeModal = ({ isOpen, onClose, onSelectMode, cryptoData }) => {
  const [selectedMode, setSelectedMode] = React.useState(null);
  
  if (!isOpen) return null;
  
  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Select Trading Mode</Title>
        
        <OptionsContainer>
          <OptionCard 
            onClick={() => setSelectedMode('spot')}
            $selected={selectedMode === 'spot'}
          >
            <OptionIcon $type="spot">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </OptionIcon>
            <OptionTitle>Spot Trading</OptionTitle>
            <OptionDescription>
              Buy and sell {cryptoData?.token?.symbol || 'crypto'} at market price without leverage. Safe for beginners.
            </OptionDescription>
          </OptionCard>
          
          <OptionCard 
            onClick={() => setSelectedMode('futures')}
            $selected={selectedMode === 'futures'}
          >
            <OptionIcon $type="futures">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </OptionIcon>
            <OptionTitle>Futures Trading</OptionTitle>
            <OptionDescription>
              Trade {cryptoData?.token?.symbol || 'crypto'} with up to 40x leverage. For experienced traders.
            </OptionDescription>
          </OptionCard>
        </OptionsContainer>
        
        <ButtonContainer>
          <ContinueButton
            onClick={() => onSelectMode(selectedMode)}
            $disabled={!selectedMode}
          >
            Continue
          </ContinueButton>
        </ButtonContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default TradingModeModal; 