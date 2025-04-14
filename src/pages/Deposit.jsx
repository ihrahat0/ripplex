import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { getUserWalletAddress, generateUserWallet, SUPPORTED_CHAINS, resetUserWallet } from '../services/walletService';
import { DEFAULT_COINS } from '../utils/constants';

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

const WalletCard = styled(motion.div)`
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
  
  @media (max-width: 768px) {
    border-radius: 12px;
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

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button`
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  color: ${props => props.$active ? '#00ff9d' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 16px;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => props.$active ? '#00ff9d' : 'transparent'};
    transition: background 0.2s;
  }

  &:hover {
    color: ${props => props.$active ? '#00ff9d' : '#fff'};
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

const WalletAddress = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
    margin-bottom: 12px;
  }
`;

const AddressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const AddressLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-bottom: 8px;
  
  @media (max-width: 480px) {
    font-size: 11px;
    margin-bottom: 6px;
  }
`;

const AddressValue = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const Address = styled.div`
  color: #fff;
  font-size: 14px;
  font-family: monospace;
  word-break: break-all;
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const CopyButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 480px) {
    padding: 4px 8px;
    font-size: 11px;
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
  
  @media (max-width: 768px) {
    margin: 15px 0;
  }
  
  @media (max-width: 480px) {
    margin: 12px 0;
  }
`;

const StyledQRCode = styled.div`
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  
  @media (max-width: 768px) {
    padding: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    
    & > svg {
      width: 150px !important;
      height: 150px !important;
    }
  }
`;

const Warning = styled.div`
  background: rgba(255, 165, 0, 0.1);
  border: 1px solid rgba(255, 165, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  color: #FFA500;
  font-size: 14px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    padding: 10px;
    font-size: 13px;
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
    font-size: 12px;
    margin-bottom: 12px;
  }
`;

const WarningBox = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  
  span {
    font-size: 18px;
  }
`;

const WarningText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
  font-size: 14px;
`;

const GenerateWalletButton = styled.button`
  background: #00ff9d;
  border: none;
  border-radius: 8px;
  width: 100%;
  padding: 16px;
  color: #000;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 10px;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MnemonicDisplay = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  
  h4 {
    color: #00ff9d;
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 16px;
  }
  
  p {
    color: #fff;
    font-family: monospace;
    background: rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 6px;
    margin: 0;
    line-height: 1.5;
    word-break: break-all;
  }
`;

const SelectContainer = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    color: #fff;
    margin-bottom: 8px;
    font-size: 14px;
  }
`;

const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  padding: 12px;
  font-size: 16px;
  appearance: none;
  position: relative;
  cursor: pointer;
  outline: none;
  
  &:focus {
    border-color: #00ff9d;
  }
  
  option {
    background: #000;
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

const CoinLogo = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
  
  @media (max-width: 480px) {
    width: 28px;
    height: 28px;
  }
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

const TokenTag = styled.span`
  background: ${props => props.isSPL ? 'rgba(20, 120, 255, 0.2)' : 'rgba(0, 255, 157, 0.1)'};
  color: ${props => props.isSPL ? '#0099ff' : '#00ff9d'};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
`;

const DebugButton = styled.button`
  background: rgba(255, 0, 0, 0.2);
  border: 1px solid rgba(255, 0, 0, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  margin-left: auto;
  
  &:hover {
    background: rgba(255, 0, 0, 0.3);
  }
`;

// Add new styled components for the confirmation modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: rgba(20, 22, 25, 0.95);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 0, 0, 0.2);
  background: rgba(255, 0, 0, 0.05);
`;

const ModalTitle = styled.h3`
  color: #ff3b30;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ModalBody = styled.div`
  padding: 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  line-height: 1.6;
`;

const ModalFooter = styled.div`
  padding: 15px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ConfirmButton = styled.button`
  background: rgba(255, 0, 0, 0.6);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 0, 0, 0.8);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HighlightText = styled.span`
  color: #ff3b30;
  font-weight: 500;
`;

const BoldText = styled.span`
  font-weight: 600;
`;

const CoinSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const CoinOption = styled.div`
  background: ${props => props.$selected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$selected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    padding: 10px;
    gap: 6px;
  }
  
  @media (max-width: 480px) {
    padding: 8px;
    gap: 4px;
  }
`;

const NetworkSelector = styled.div`
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
`;

const SectionTitle = styled.h3`
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 12px 0;
  
  @media (max-width: 480px) {
    font-size: 14px;
    margin-bottom: 10px;
  }
`;

const NetworkOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  
  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const NetworkOption = styled.div`
  background: ${props => props.$selected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$selected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 12px;
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
    : options.find(option => option.id === value);
    
  const getCoinLogo = (coinId) => {
    if (isNetwork) return null;
    
    // First try to get from metadata (if coin option has logoUrl)
    const option = options.find(opt => opt.id === coinId);
    if (option?.logoUrl) {
      return option.logoUrl;
    }
    
    // Then try predefined logos
    const symbol = option?.symbol || coinId;
    if (COIN_LOGOS[symbol]) {
      return COIN_LOGOS[symbol];
    }
    
    // Use Coinicons API as fallback
    return `https://coinicons-api.vercel.app/api/icon/${symbol?.toLowerCase()}`;
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
    onChange(option.id);
    setIsOpen(false);
  };
  
  const filteredOptions = options.filter(option => {
    if (isNetwork) {
      return option.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return (
      option.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
                  src={getCoinLogo(selectedOption.id)}
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
                <FullName>{selectedOption.name}</FullName>
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
                  key={option.id} 
                  onClick={() => handleSelect(option)}
                  $isSelected={option.id === value}
                >
                  {!isNetwork && (
                    <CoinIconWrapper>
                      <CoinIcon 
                        src={getCoinLogo(option.id)}
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
                      <FullName>{option.name}</FullName>
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

const Deposit = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deposit');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [copied, setCopied] = useState(false);
  const [userWallets, setUserWallets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingWallet, setGeneratingWallet] = useState(false);
  const [mnemonic, setMnemonic] = useState(null);
  const [showMnemonicConfirm, setShowMnemonicConfirm] = useState(false);
  const [availableChains, setAvailableChains] = useState([]);
  const [depositAddress, setDepositAddress] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [allCoins, setAllCoins] = useState([]);
  const [coinMetadata, setCoinMetadata] = useState({});

  // Supported networks list
  const NETWORKS = [
    { id: 'bsc', name: 'BNB Smart Chain (BSC)', isEVM: true },
    { id: 'ethereum', name: 'Ethereum (ETH)', isEVM: true },
    { id: 'arbitrum', name: 'Arbitrum', isEVM: true },
    { id: 'base', name: 'Base', isEVM: true },
    { id: 'solana', name: 'Solana', isEVM: false }
  ];

  // Fetch all coins from Firestore
  useEffect(() => {
    const fetchAllCoins = async () => {
      try {
        const coinsCollection = collection(db, 'coins');
        const coinsSnapshot = await getDocs(coinsCollection);
        
        const coinsData = coinsSnapshot.docs.map(doc => ({
          id: doc.id,
          symbol: doc.data().symbol || doc.id,
          name: doc.data().name || doc.id,
          logoUrl: doc.data().logoUrl || doc.data().logo || null
        }));
        
        setAllCoins(coinsData);
        
        // Create metadata map
        const metadata = {};
        coinsData.forEach(coin => {
          metadata[coin.id] = coin;
          metadata[coin.symbol] = coin;
        });
        
        setCoinMetadata(metadata);
        
        // Set default selection if available
        if (coinsData.length > 0) {
          setSelectedCoin(coinsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching coins:', error);
      }
    };
    
    fetchAllCoins();
  }, []);

  // Set available chains based on selected coin
  useEffect(() => {
    if (selectedCoin) {
      // All coins can be deposited on BSC, ETH, Arbitrum, and Base (same EVM address)
      // Only BSC/ETH-specific and SPL tokens on Solana
      const chains = NETWORKS.filter(network => {
        // Solana-specific check
        if (network.id === 'solana') {
          return true; // Allow all coins on Solana for simplicity
        }
        return network.isEVM; // All EVM chains supported
      });
      
      setAvailableChains(chains);
      
      if (chains.length > 0 && !selectedChain) {
        setSelectedChain(chains[0].id);
      } else if (chains.length > 0 && !chains.some(chain => chain.id === selectedChain)) {
        setSelectedChain(chains[0].id);
      } else if (chains.length === 0) {
        setSelectedChain('');
      }
    } else {
      setAvailableChains([]);
      setSelectedChain('');
    }
  }, [selectedCoin]);

  // Update deposit address when chain is selected
  useEffect(() => {
    if (userWallets && selectedChain) {
      setDepositAddress(userWallets[selectedChain] || '');
    } else {
      setDepositAddress('');
    }
  }, [userWallets, selectedChain]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchUserWallet = async () => {
      try {
        const wallets = await getUserWalletAddress(currentUser.uid);
        setUserWallets(wallets);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user wallet:', error);
        setLoading(false);
      }
    };

    fetchUserWallet();
  }, [currentUser, navigate]);

  const handleGenerateWallet = async () => {
    try {
      setGeneratingWallet(true);
      const { wallets, mnemonic: newMnemonic } = await generateUserWallet(currentUser.uid);
      setMnemonic(newMnemonic);
      setUserWallets(wallets);
      setShowMnemonicConfirm(true);
    } catch (error) {
      console.error('Error generating wallet:', error);
    } finally {
      setGeneratingWallet(false);
    }
  };

  const handleConfirmMnemonic = () => {
    setMnemonic(null);
    setShowMnemonicConfirm(false);
  };

  const handleResetWalletRequest = () => {
    setShowResetConfirmation(true);
  };

  const handleResetWalletConfirm = async () => {
    if (!currentUser) return;
    
    try {
      setIsResetting(true);
      const { wallets, mnemonic: newMnemonic } = await resetUserWallet(currentUser.uid);
      setMnemonic(newMnemonic);
      setUserWallets(wallets);
      setShowMnemonicConfirm(true);
      setShowResetConfirmation(false);
    } catch (error) {
      console.error('Error resetting wallet:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetWalletCancel = () => {
    setShowResetConfirmation(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Get coin logo URL
  const getCoinLogo = (coinId) => {
    // First try to get from metadata
    if (coinMetadata[coinId]?.logoUrl) {
      return coinMetadata[coinId].logoUrl;
    }
    
    // Then try predefined logos
    const symbol = coinMetadata[coinId]?.symbol || coinId;
    if (COIN_LOGOS[symbol]) {
      return COIN_LOGOS[symbol];
    }
    
    // Use Coinicons API as fallback
    return getCoinIconUrl(symbol);
  };
  
  // Get coin icon from API
  const getCoinIconUrl = (symbol) => {
    const symbolLower = symbol.toLowerCase();
    return `https://coinicons-api.vercel.app/api/icon/${symbolLower}`;
  };

  const getChainSpecificInfo = () => {
    if (!selectedChain) return null;
    
    const chainInfo = NETWORKS.find(network => network.id === selectedChain);
    if (!chainInfo) return null;
    
    if (chainInfo.id === 'solana') {
      return (
        <InfoBox>
          <span>ℹ️</span>
          <InfoText>
            This is a Solana address that supports SPL tokens. Your private key is securely stored in the database and can 
            be used to access your SPL tokens on the Solana blockchain. For all tokens, make sure you're sending 
            the SPL version of the token.
          </InfoText>
        </InfoBox>
      );
    } else {
      return (
        <InfoBox>
          <span>ℹ️</span>
          <InfoText>
            This is an EVM-compatible wallet address for the {chainInfo.name} network. Your private key is securely stored in the 
            database and can be used across all EVM networks. The same address works for all EVM networks (BSC, Ethereum, Arbitrum, Base), 
            but make sure you're sending tokens on the correct network.
          </InfoText>
        </InfoBox>
      );
    }
  };

  // Add a warning message explaining supported chains
  const renderChainWarning = () => {
    return (
      <InfoBox>
        <span className="bi bi-info-circle"></span>
        <InfoText>
          <strong>Important:</strong> For security and reliability, we only support deposits on BSC (BNB Smart Chain), ETH (Ethereum), Base, Arbitrum, and Solana networks. Please ensure you're sending from these chains only. For all EVM chains (BSC, ETH, Arbitrum, Base), you'll use the same address.
        </InfoText>
      </InfoBox>
    );
  };

  if (loading) {
    return (
      <Container>
        <WalletCard>
          <CardHeader>
            <WalletIcon>💰</WalletIcon>
            <HeaderText>Loading wallet...</HeaderText>
          </CardHeader>
        </WalletCard>
      </Container>
    );
  }

  if (!userWallets) {
    return (
      <Container>
        <WalletCard>
          <CardHeader>
            <WalletIcon>🔐</WalletIcon>
            <HeaderText>Generate Your Wallet</HeaderText>
          </CardHeader>
          <CardContent>
            <Description>
              You need to generate a wallet to start depositing funds. This wallet will work across all supported networks, 
              with specialized wallet generation for Solana SPL tokens. Your private keys will be securely stored in your account.
            </Description>
            {!mnemonic ? (
              <GenerateWalletButton 
                onClick={handleGenerateWallet}
                disabled={generatingWallet}
              >
                {generatingWallet ? 'Generating...' : 'Generate Wallet'}
              </GenerateWalletButton>
            ) : (
              <>
                <MnemonicDisplay>
                  <h4>🔑 Your Secret Recovery Phrase</h4>
                  <p>{mnemonic}</p>
                </MnemonicDisplay>
                <WarningBox>
                  <span>⚠️</span>
                  <WarningText>
                    IMPORTANT: Save this recovery phrase in a secure location. 
                    It will only be shown once and cannot be recovered if lost.
                    Your private keys are stored securely in your account.
                  </WarningText>
                </WarningBox>
                <GenerateWalletButton onClick={handleConfirmMnemonic}>
                  I've Saved My Recovery Phrase
                </GenerateWalletButton>
              </>
            )}
          </CardContent>
        </WalletCard>
      </Container>
    );
  }

  return (
    <Container>
      {showResetConfirmation && (
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                <span>⚠️</span> Important Warning: Wallet Reset
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p>
                You are about to <HighlightText>reset your cryptocurrency wallet</HighlightText>. This action will:
              </p>
              <ul>
                <li>Generate <BoldText>completely new wallet addresses</BoldText> for all blockchains</li>
                <li><HighlightText>Permanently delete</HighlightText> your current wallet addresses</li>
                <li>Create new private keys that will replace your existing ones</li>
              </ul>
              <p>
                <BoldText>Important:</BoldText> If you have shared your current deposit addresses with others or have pending transactions, 
                these funds may be <HighlightText>permanently lost</HighlightText> as the addresses will no longer be associated with your account.
              </p>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={handleResetWalletCancel}>
                Cancel
              </CancelButton>
              <ConfirmButton 
                onClick={handleResetWalletConfirm}
                disabled={isResetting}
              >
                {isResetting ? 'Processing...' : 'Reset My Wallet'}
              </ConfirmButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
      
      <WalletCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CardHeader>
          <WalletIcon>💰</WalletIcon>
          <HeaderText>Deposit Funds</HeaderText>
          <DebugButton onClick={handleResetWalletRequest} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Reset Wallet'}
          </DebugButton>
          <CloseButton onClick={() => navigate('/dashboard')}>✕</CloseButton>
        </CardHeader>
        
        <TabsContainer>
          <Tab 
            $active={activeTab === 'deposit'} 
            onClick={() => setActiveTab('deposit')}
          >
            Deposit
          </Tab>
          <Tab 
            $active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          >
            History
          </Tab>
        </TabsContainer>
        
        <CardContent>
          {activeTab === 'deposit' ? (
            <>
              {renderChainWarning()}
              <Description>
                Select the coin you want to deposit and the blockchain network. You can deposit any coin in your balance through our supported networks.
                {selectedCoin && selectedChain && (
                  <>
                    {' '}Only send{' '}
                    <CoinLogo 
                      src={getCoinLogo(selectedCoin)} 
                      alt={coinMetadata[selectedCoin]?.symbol || selectedCoin} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png";
                      }}
                    />
                    {coinMetadata[selectedCoin]?.name || selectedCoin}{' '}
                    on the {NETWORKS.find(n => n.id === selectedChain)?.name || selectedChain} network to this address.
                  </>
                )}
              </Description>
              
              <CustomSelect
                label="Select Coin"
                options={allCoins}
                value={selectedCoin}
                onChange={setSelectedCoin}
                placeholder="Select a coin"
              />
              
              <CustomSelect
                label="Select Network"
                options={availableChains}
                value={selectedChain}
                onChange={setSelectedChain}
                disabled={availableChains.length === 0}
                isNetwork={true}
                placeholder="Select a network"
              />
              
              {selectedCoin && selectedChain && depositAddress && (
                <>
                  {getChainSpecificInfo()}
                  
                  <WalletAddress>
                    <AddressHeader>
                      <AddressLabel>
                        Deposit Address ({NETWORKS.find(n => n.id === selectedChain)?.name || selectedChain})
                        {selectedChain === 'solana' && <TokenTag isSPL>SPL</TokenTag>}
                      </AddressLabel>
                      <AddressValue>
                        <CopyButton onClick={() => copyToClipboard(depositAddress)}>
                          {copied ? 'Copied!' : 'Copy'}
                        </CopyButton>
                      </AddressValue>
                    </AddressHeader>
                    <Address>{depositAddress}</Address>
                  </WalletAddress>
                  
                  <QRCodeContainer>
                    <StyledQRCode>
                      <QRCode 
                        value={depositAddress} 
                        size={150} 
                        level="H"
                      />
                    </StyledQRCode>
                  </QRCodeContainer>
                  
                  <Warning>
                    {selectedChain === 'solana' ? 
                      `This is a Solana SPL token address. Only send ${coinMetadata[selectedCoin]?.symbol || selectedCoin} using the Solana network.` : 
                      `Only send ${coinMetadata[selectedCoin]?.symbol || selectedCoin} on the ${NETWORKS.find(n => n.id === selectedChain)?.name || selectedChain} network to this address.`} 
                    Sending any other asset may result in permanent loss.
                  </Warning>
                </>
              )}
            </>
          ) : (
            <Description>
              Your deposit history will appear here.
            </Description>
          )}
        </CardContent>
      </WalletCard>
    </Container>
  );
};

export default Deposit; 