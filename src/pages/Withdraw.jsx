import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserWalletAddress, SUPPORTED_CHAINS } from '../services/walletService';
import { DEFAULT_COINS } from '../utils/constants';
import TransactionHistory from '../components/TransactionHistory';

// Import coin logos
import btcLogo from '../assets/images/coin/btc.png';
import ethLogo from '../assets/images/coin/eth.png';
import usdtLogo from '../assets/images/coin/usdt.png';
import solLogo from '../assets/images/coin/sol.png';
import bnbLogo from '../assets/images/coin/bnb.png';
import dogeLogo from '../assets/images/coin/doge.png';
import xrpLogo from '../assets/images/coin/xrp.png';
import adaLogo from '../assets/images/coin/ada.png';
import maticLogo from '../assets/images/coin/matic.png';
import dotLogo from '../assets/images/coin/dot.png';
import avaxLogo from '../assets/images/coin/avax.png';
import linkLogo from '../assets/images/coin/link.png';
import uniLogo from '../assets/images/coin/uni.png';
import atomLogo from '../assets/images/coin/atom.png';

const COIN_LOGOS = {
  BTC: btcLogo,
  ETH: ethLogo,
  USDT: usdtLogo,
  SOL: solLogo,
  BNB: bnbLogo,
  DOGE: dogeLogo,
  XRP: xrpLogo,
  ADA: adaLogo,
  MATIC: maticLogo,
  DOT: dotLogo,
  AVAX: avaxLogo,
  LINK: linkLogo,
  UNI: uniLogo,
  ATOM: atomLogo
};

// Coin full names
const COIN_NAMES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether USD',
  XRP: 'Ripple',
  BNB: 'Binance Coin',
  SOL: 'Solana',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  AVAX: 'Avalanche',
  LINK: 'Chainlink',
  UNI: 'Uniswap',
  ATOM: 'Cosmos'
};

// Define keyframes for the sunshine effect
const glowEffect = keyframes`
  0% {
    box-shadow: 0 0 30px rgba(0, 255, 157, 0.6);
  }
  50% {
    box-shadow: 0 0 80px rgba(0, 255, 157, 0.8);
  }
  100% {
    box-shadow: 0 0 30px rgba(0, 255, 157, 0.6);
  }
`;

const sunshineAnimation = keyframes`
  0% {
    background-position: 0% 50%;
    opacity: 0.5;
  }
  50% {
    background-position: 100% 50%;
    opacity: 0.8;
  }
  100% {
    background-position: 0% 50%;
    opacity: 0.5;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(0, 40, 20, 0.8), rgba(0, 20, 40, 0.8));
  position: relative;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 60px;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(0, 255, 157, 0.15) 0%,
      rgba(0, 0, 0, 0) 70%
    );
    z-index: 0;
    animation: ${sunshineAnimation} 15s infinite ease-in-out;
    pointer-events: none;
  }
  
  @media (max-width: 768px) {
    padding: 15px;
    padding-top: 40px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    padding-top: 30px;
  }
`;

const WithdrawCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.8);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  animation: ${glowEffect} 5s infinite alternate;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    border-radius: 12px;
    margin-bottom: 15px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 12px;
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    gap: 8px;
  }
`;

const WalletIcon = styled.div`
  width: 24px;
  height: 24px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

const HeaderText = styled.h2`
  color: #fff;
  font-size: 18px;
  font-weight: 500;
  margin: 0;
  flex-grow: 1;
  
  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
`;

const TabButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.$active ? '#fff' : 'rgba(255, 255, 255, 0.6)'};
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#00ff9d' : 'transparent'};
  transition: all 0.2s;
  
  &:hover {
    color: #fff;
  }
  
  @media (max-width: 768px) {
    padding: 10px 15px;
    font-size: 14px;
  }
  
  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 13px;
  }
`;

const CardContent = styled.div`
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  line-height: 1.6;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
`;

const Label = styled.label`
  display: block;
  color: #fff;
  margin-bottom: 8px;
  font-size: 14px;
  
  @media (max-width: 480px) {
    font-size: 13px;
    margin-bottom: 6px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: calc(100% - 12px) center;
  
  &:focus {
    outline: none;
    border-color: #00ff9d;
  }
  
  option {
    background: #000;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #00ff9d;
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const WithdrawButton = styled.button`
  width: 100%;
  padding: 14px;
  background: ${props => props.disabled ? 'rgba(0, 255, 157, 0.2)' : 'rgba(0, 255, 157, 0.8)'};
  border: none;
  border-radius: 8px;
  color: ${props => props.disabled ? 'rgba(255, 255, 255, 0.4)' : '#fff'};
  font-size: 16px;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background 0.2s;
  
  &:hover {
    background: ${props => props.disabled ? 'rgba(0, 255, 157, 0.2)' : 'rgba(0, 255, 157, 1)'};
  }
`;

const AvailableBalance = styled.div`
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin-top: 8px;
`;

const MaxButton = styled.button`
  background: none;
  border: none;
  color: #00ff9d;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const InfoBox = styled.div`
  background: rgba(0, 153, 255, 0.1);
  border: 1px solid rgba(0, 153, 255, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  span {
    font-size: 18px;
    color: #0099ff;
  }
`;

const InfoText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  color: #00ff9d;
  background: rgba(0, 255, 157, 0.1);
  border: 1px solid rgba(0, 255, 157, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const CoinLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
`;

const HistoryContainer = styled.div`
  margin-top: 20px;
`;

const StatusSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`;

const StatusCard = styled.div`
  flex: 1;
  min-width: 100px;
  background: var(--bg2);
  border-radius: 8px;
  padding: 12px 15px;
  text-align: center;
  border: 1px solid ${props => 
    props.$status === 'pending' ? 'rgba(247, 147, 26, 0.3)' : 
    props.$status === 'approved' ? 'rgba(3, 169, 244, 0.3)' : 
    props.$status === 'rejected' ? 'rgba(255, 59, 48, 0.3)' : 
    props.$status === 'completed' ? 'rgba(14, 203, 129, 0.3)' : 
    'var(--line)'};
  
  .status-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
    color: ${props => 
      props.$status === 'pending' ? '#F7931A' : 
      props.$status === 'approved' ? '#03A9F4' : 
      props.$status === 'rejected' ? '#F6465D' : 
      props.$status === 'completed' ? '#0ECB81' : 
      'var(--text)'};
    
    i {
      font-size: 20px;
    }
  }
  
  .status-count {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 5px;
    color: var(--text);
  }
  
  .status-label {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: capitalize;
  }
`;

// New styled components for custom select
const CustomSelectContainer = styled.div`
  position: relative;
  margin-bottom: 20px;
  z-index: ${props => props.$isOpen ? 5 : 2};

  label {
    display: block;
    color: #fff;
    margin-bottom: 8px;
    font-size: 14px;
  }
`;

const SelectedOption = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  
  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  ${props => props.$isOpen && `
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(0, 255, 157, 0.5);
    box-shadow: 0 0 0 2px rgba(0, 255, 157, 0.2);
  `}
`;

const CoinInfo = styled.div`
  display: flex;
  align-items: center;
  flex-grow: 1;
`;

const DropdownIcon = styled.span`
  margin-left: auto;
  transition: transform 0.2s;
  color: rgba(255, 255, 255, 0.6);
  
  ${props => props.$isOpen && `
    transform: rotate(180deg);
  `}
`;

const DropdownContainer = styled(motion.div)`
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  width: 100%;
  background: rgba(10, 12, 14, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 15px;
  color: #fff;
  outline: none;
  font-size: 14px;
  
  &:focus {
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const OptionsList = styled.div`
  padding: 5px 0;
`;

const OptionItem = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.15s;
  color: #fff;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  ${props => props.$isSelected && `
    background: rgba(0, 255, 157, 0.1);
    
    &:hover {
      background: rgba(0, 255, 157, 0.15);
    }
  `}
`;

const NoResults = styled.div`
  padding: 15px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
`;

const CoinIconWrapper = styled.div`
  width: 24px;
  height: 24px;
  margin-right: 12px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CoinIcon = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const CoinNameDisplay = styled.div`
  display: flex;
  flex-direction: column;
`;

const Symbol = styled.span`
  font-weight: 500;
`;

const FullName = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
`;

const ChainTag = styled.span`
  margin-left: auto;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  background: ${props => props.$isSPL ? 'rgba(20, 120, 255, 0.2)' : 'rgba(0, 255, 157, 0.1)'};
  color: ${props => props.$isSPL ? '#0099ff' : '#00ff9d'};
`;

// Create custom select component
const CustomSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  disabled,
  isNetwork = false,
  placeholder = "Select an option"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const selectedOption = isNetwork 
    ? options.find(option => option.id === value)
    : options.find(option => option.id === value || option.symbol === value);
    
  const getCoinLogo = (coinId) => {
    if (isNetwork) return null;
    
    // For coins with symbol as the ID
    const option = options.find(opt => opt.id === coinId || opt.symbol === coinId);
    const symbol = option?.symbol || coinId;
    
    // Try predefined logos first
    if (COIN_LOGOS[symbol]) {
      return COIN_LOGOS[symbol];
    }
    
    // Use API as fallback
    const symbolLower = symbol?.toLowerCase();
    return `https://coinicons-api.vercel.app/api/icon/${symbolLower}`;
  };
  
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };
  
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };
  
  const handleSelect = (option) => {
    onChange(option.id || option.symbol);
    setIsOpen(false);
  };
  
  const filteredOptions = options.filter(option => {
    if (isNetwork) {
      return option.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    const symbolMatch = option.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = option.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return symbolMatch || nameMatch;
  });
  
  return (
    <CustomSelectContainer $isOpen={isOpen} ref={dropdownRef}>
      <label>{label}</label>
      
      <SelectedOption 
        onClick={toggleDropdown} 
        $isOpen={isOpen} 
        disabled={disabled}
      >
        {value && selectedOption ? (
          <CoinInfo>
            {!isNetwork && (
              <CoinIconWrapper>
                <CoinIcon 
                  src={getCoinLogo(selectedOption.id || selectedOption.symbol)}
                  alt={selectedOption.symbol || selectedOption.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png";
                  }}
                />
              </CoinIconWrapper>
            )}
            <CoinNameDisplay>
              <Symbol>
                {isNetwork 
                  ? selectedOption.name 
                  : selectedOption.symbol}
              </Symbol>
              {!isNetwork && (
                <FullName>{selectedOption.name || COIN_NAMES[selectedOption.symbol]}</FullName>
              )}
            </CoinNameDisplay>
            {isNetwork && selectedOption.id === 'solana' && (
              <ChainTag $isSPL>SPL</ChainTag>
            )}
            {isNetwork && selectedOption.isEVM && (
              <ChainTag>EVM</ChainTag>
            )}
          </CoinInfo>
        ) : (
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{placeholder}</span>
        )}
        <DropdownIcon $isOpen={isOpen}>▼</DropdownIcon>
      </SelectedOption>
      
      {isOpen && (
        <DropdownContainer
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SearchInput 
            type="text"
            placeholder={`Search ${isNetwork ? 'networks' : 'coins'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
          />
          
          <OptionsList>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <OptionItem 
                  key={option.id || option.symbol} 
                  onClick={() => handleSelect(option)}
                  $isSelected={value === (option.id || option.symbol)}
                >
                  {!isNetwork && (
                    <CoinIconWrapper>
                      <CoinIcon 
                        src={getCoinLogo(option.id || option.symbol)}
                        alt={option.symbol || option.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png";
                        }}
                      />
                    </CoinIconWrapper>
                  )}
                  <CoinNameDisplay>
                    <Symbol>
                      {isNetwork ? option.name : option.symbol}
                    </Symbol>
                    {!isNetwork && (
                      <FullName>{option.name || COIN_NAMES[option.symbol]}</FullName>
                    )}
                  </CoinNameDisplay>
                  {isNetwork && option.id === 'solana' && (
                    <ChainTag $isSPL>SPL</ChainTag>
                  )}
                  {isNetwork && option.isEVM && (
                    <ChainTag>EVM</ChainTag>
                  )}
                </OptionItem>
              ))
            ) : (
              <NoResults>No {isNetwork ? 'networks' : 'coins'} found</NoResults>
            )}
          </OptionsList>
        </DropdownContainer>
      )}
    </CustomSelectContainer>
  );
};

function Withdraw() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [selectedCoin, setSelectedCoin] = useState('ETH');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [userBalances, setUserBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('withdraw');
  const [recentWithdrawal, setRecentWithdrawal] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [withdrawalStats, setWithdrawalStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  });
  const [coins, setCoins] = useState([]);
  const [networks, setNetworks] = useState([]);

  // Supported networks list
  const NETWORKS = [
    { id: 'ethereum', name: 'Ethereum (ETH)', isEVM: true },
    { id: 'bsc', name: 'BNB Smart Chain (BSC)', isEVM: true },
    { id: 'arbitrum', name: 'Arbitrum', isEVM: true },
    { id: 'base', name: 'Base', isEVM: true },
    { id: 'solana', name: 'Solana', isEVM: false },
    { id: 'bitcoin', name: 'Bitcoin', isEVM: false }
  ];

  // Get coin chains based on selected coin
  const getChainForCoin = (coin) => {
    if (coin === 'SOL') return 'solana';
    if (coin === 'BTC') return 'bitcoin';
    if (coin === 'BNB') return 'bsc';
    return 'ethereum'; // Default to Ethereum for most ERC-20 tokens
  };

  // Format coins for dropdown
  useEffect(() => {
    if (Object.keys(userBalances).length > 0) {
      const formattedCoins = Object.entries(userBalances)
        .filter(([_, balance]) => balance > 0)
        .map(([symbol, balance]) => ({
          symbol,
          balance,
          name: COIN_NAMES[symbol] || symbol
        }));
      
      setCoins(formattedCoins);
      
      // Set networks based on selected coin
      const networks = NETWORKS.filter(network => {
        if (selectedCoin === 'SOL') return network.id === 'solana';
        if (selectedCoin === 'BTC') return network.id === 'bitcoin';
        return network.isEVM; // Only show EVM networks for other coins
      });
      
      setNetworks(networks);
    }
  }, [userBalances, selectedCoin]);

  // Initialize component
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchUserBalances();
  }, [currentUser, navigate]);

  // Fetch user balances
  const fetchUserBalances = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const balances = userDoc.data().balances || {};
        setUserBalances(balances);
        
        // Set default selected coin if user has balances
        const availableCoins = Object.entries(balances).filter(([_, balance]) => balance > 0);
        if (availableCoins.length > 0) {
          const [firstCoin] = availableCoins[0];
          setSelectedCoin(firstCoin);
          setSelectedChain(getChainForCoin(firstCoin));
        }
      } else {
        // Initialize with empty balances
        setUserBalances({});
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setError('Failed to load your balances. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle coin selection
  const handleCoinChange = (coin) => {
    setSelectedCoin(coin);
    setSelectedChain(getChainForCoin(coin));
    setAmount('');
    setError('');
  };

  // Handle network selection
  const handleNetworkChange = (networkId) => {
    setSelectedChain(networkId);
    setError('');
  };

  // Handle setting maximum amount
  const handleSetMaxAmount = () => {
    if (userBalances[selectedCoin]) {
      setAmount(userBalances[selectedCoin].toString());
    }
  };

  // Validate withdrawal request
  const validateWithdrawal = () => {
    if (!withdrawalAddress.trim()) {
      setError('Please enter a valid withdrawal address');
      return false;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    const balance = userBalances[selectedCoin] || 0;
    if (parsedAmount > balance) {
      setError(`Insufficient balance. You have ${balance} ${selectedCoin} available.`);
      return false;
    }

    return true;
  };

  // Handle withdrawal submission
  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    try {
      setWithdrawing(true);
      setError('');
      
      // Create withdrawal transaction record
      const withdrawalData = {
        userId: currentUser.uid,
        type: 'withdrawal',
        chain: selectedChain,
        token: selectedCoin,
        amount: parseFloat(amount),
        destinationAddress: withdrawalAddress,
        status: 'pending', // Needs admin approval
        timestamp: serverTimestamp(),
        requestedBy: currentUser.email
      };

      console.log("Submitting withdrawal request:", withdrawalData);

      // Add to transactions collection
      const docRef = await addDoc(collection(db, 'transactions'), withdrawalData);
      console.log("Withdrawal request created with ID:", docRef.id);
      
      setSuccess(`Withdrawal request for ${amount} ${selectedCoin} has been submitted and is pending approval. Request ID: ${docRef.id}`);
      
      // Store recent withdrawal for notification purposes
      setRecentWithdrawal({
        id: docRef.id,
        token: selectedCoin,
        amount: parseFloat(amount),
        status: 'pending'
      });
      
      // Reset form fields
      setAmount('');
      setWithdrawalAddress('');
      
      // Refresh balances to show current state
      fetchUserBalances();
      
      // Trigger transaction history refresh
      setRefreshHistory(prev => prev + 1);
      
      // Switch to history tab to show the pending withdrawal
      setActiveTab('history');
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setError(`Failed to process your withdrawal: ${error.message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Fetch user's withdrawal stats
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchWithdrawalStats = async () => {
      try {
        const stats = {
          pending: 0,
          approved: 0,
          rejected: 0,
          completed: 0
        };
        
        // Get withdrawal transactions for this user
        const withdrawalsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('type', '==', 'withdrawal'),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(withdrawalsQuery);
        
        // Count by status
        querySnapshot.docs.forEach(doc => {
          const status = doc.data().status;
          if (stats[status] !== undefined) {
            stats[status]++;
          }
        });
        
        setWithdrawalStats(stats);
      } catch (error) {
        console.error('Error fetching withdrawal stats:', error);
      }
    };
    
    fetchWithdrawalStats();
  }, [currentUser, refreshHistory]);

  if (loading) {
    return (
      <Container>
        <WithdrawCard>
          <CardHeader>
            <WalletIcon>💰</WalletIcon>
            <HeaderText>Loading...</HeaderText>
          </CardHeader>
        </WithdrawCard>
      </Container>
    );
  }

  return (
    <Container>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <WithdrawCard
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CardHeader>
            <WalletIcon>💰</WalletIcon>
            <HeaderText>Withdraw Crypto</HeaderText>
          </CardHeader>
          
          {/* Add withdrawal status summary */}
          {(withdrawalStats.pending > 0 || withdrawalStats.approved > 0) && (
            <StatusSummary>
              {withdrawalStats.pending > 0 && (
                <StatusCard $status="pending">
                  <div className="status-icon">
                    <i className="bi bi-hourglass-split"></i>
                  </div>
                  <div className="status-count">{withdrawalStats.pending}</div>
                  <div className="status-label">Pending</div>
                </StatusCard>
              )}
              
              {withdrawalStats.approved > 0 && (
                <StatusCard $status="approved">
                  <div className="status-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div className="status-count">{withdrawalStats.approved}</div>
                  <div className="status-label">Approved</div>
                </StatusCard>
              )}
              
              {withdrawalStats.rejected > 0 && (
                <StatusCard $status="rejected">
                  <div className="status-icon">
                    <i className="bi bi-x-circle"></i>
                  </div>
                  <div className="status-count">{withdrawalStats.rejected}</div>
                  <div className="status-label">Rejected</div>
                </StatusCard>
              )}
              
              {withdrawalStats.completed > 0 && (
                <StatusCard $status="completed">
                  <div className="status-icon">
                    <i className="bi bi-check-all"></i>
                  </div>
                  <div className="status-count">{withdrawalStats.completed}</div>
                  <div className="status-label">Completed</div>
                </StatusCard>
              )}
            </StatusSummary>
          )}
          
          <TabsContainer>
            <TabButton 
              $active={activeTab === 'withdraw'} 
              onClick={() => setActiveTab('withdraw')}
            >
              Withdraw
            </TabButton>
            <TabButton 
              $active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')}
            >
              History
              {withdrawalStats.pending + withdrawalStats.approved > 0 && (
                <span style={{ 
                  marginLeft: '5px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(247, 147, 26, 0.2)',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px'
                }}>
                  {withdrawalStats.pending + withdrawalStats.approved}
                </span>
              )}
            </TabButton>
          </TabsContainer>
          
          <CardContent>
            {activeTab === 'withdraw' ? (
              <>
                <Description>
                  Withdraw your crypto to external wallets. All withdrawals are subject to review for security purposes.
                  Withdrawals are typically processed within 24 hours after approval.
                </Description>
                
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {success && <SuccessMessage>{success}</SuccessMessage>}
                
                {recentWithdrawal && (
                  <div style={{
                    background: 'rgba(247, 147, 26, 0.1)',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    border: '1px solid rgba(247, 147, 26, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                      <i className="bi bi-info-circle" style={{ color: '#F7931A', marginRight: '10px', fontSize: '20px' }}></i>
                      <strong style={{ color: '#F7931A' }}>Pending Withdrawal</strong>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                      Your withdrawal request for <strong>{recentWithdrawal.amount} {recentWithdrawal.token}</strong> is being processed.
                    </p>
                    <button 
                      onClick={() => setActiveTab('history')} 
                      style={{
                        background: 'rgba(247, 147, 26, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        color: '#F7931A',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <i className="bi bi-clock-history" style={{ marginRight: '5px' }}></i>
                      View Withdrawal Status
                    </button>
                  </div>
                )}
                
                <FormGroup>
                  <CustomSelect
                    label="Select Coin"
                    options={coins}
                    value={selectedCoin}
                    onChange={handleCoinChange}
                    placeholder="Select a coin"
                  />
                  
                  <AvailableBalance>
                    <span>Available: {(userBalances[selectedCoin] || 0).toFixed(8)} {selectedCoin}</span>
                  </AvailableBalance>
                </FormGroup>
                
                <FormGroup>
                  <CustomSelect
                    label="Select Network"
                    options={networks}
                    value={selectedChain}
                    onChange={handleNetworkChange}
                    isNetwork={true}
                    placeholder="Select a network"
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>Amount to Withdraw</Label>
                  <Input 
                    type="number" 
                    placeholder={`Enter amount in ${selectedCoin}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.00000001"
                  />
                  
                  <AvailableBalance>
                    <span>Transaction fee: 0.0001 {selectedCoin}</span>
                    <MaxButton onClick={handleSetMaxAmount}>MAX</MaxButton>
                  </AvailableBalance>
                </FormGroup>
                
                <FormGroup>
                  <Label>Withdrawal Address</Label>
                  <Input 
                    type="text"
                    placeholder={`Enter your ${selectedCoin} address`}
                    value={withdrawalAddress}
                    onChange={(e) => setWithdrawalAddress(e.target.value)}
                  />
                </FormGroup>
                
                <InfoBox>
                  <span>ℹ️</span>
                  <InfoText>
                    Please double-check your withdrawal address. Transactions sent to incorrect addresses cannot be recovered.
                    All withdrawals require admin approval for security purposes.
                  </InfoText>
                </InfoBox>
                
                <WithdrawButton 
                  onClick={handleWithdraw} 
                  disabled={withdrawing || !amount || !withdrawalAddress}
                >
                  {withdrawing ? 'Processing...' : 'Submit Withdrawal Request'}
                </WithdrawButton>
              </>
            ) : (
              <TransactionHistory 
                type="withdrawal" 
                limit={10} 
                key={refreshHistory}
              />
            )}
          </CardContent>
        </WithdrawCard>
      </div>
    </Container>
  );
}

export default Withdraw; 