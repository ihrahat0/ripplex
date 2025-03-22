import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styled, { css, keyframes, useTheme } from 'styled-components';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where,
  updateDoc,
  writeBatch,
  getDoc,
  runTransaction,
  setDoc,
  onSnapshot,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import TradingChartComponent from '../components/TradingChart';
import { tradingService } from '../services/tradingService';
import btcIcon from '../assets/images/coin/btc.png';
import LightweightChartComponent from '../components/LightweightChartComponent';
import soundEffect from '../assets/sound/sound-effect.wav';

// Add immediately after imports
// Global state to track trading operations and prevent cross-contamination between coins
// This will be used to ensure operations on one coin don't affect other coins
if (typeof window !== 'undefined') {
  window.RIPPLE_TRADING_STATE = window.RIPPLE_TRADING_STATE || null;
  
  // If we have a stale state from a previous session, clear it
  if (window.RIPPLE_TRADING_STATE && 
      window.RIPPLE_TRADING_STATE.timestamp && 
      Date.now() - window.RIPPLE_TRADING_STATE.timestamp > 1000 * 60 * 5) { // 5 minutes
    console.log('Clearing stale trading state:', window.RIPPLE_TRADING_STATE);
    window.RIPPLE_TRADING_STATE = null;
  }
}

// Function to safely clear trading state
const clearTradingState = () => {
  if (typeof window !== 'undefined') {
    window.RIPPLE_TRADING_STATE = null;
    console.log('[ISOLATION] Cleared trading state');
  }
};

// Function to set trading state with coin isolation
const setTradingState = (operationType, symbol) => {
  if (typeof window !== 'undefined') {
    const normalizedSymbol = (symbol || '').toLowerCase().replace(/usdt$/, '');
    window.RIPPLE_TRADING_STATE = {
      operationType,
      symbol: normalizedSymbol,
      timestamp: Date.now()
    };
    console.log(`[ISOLATION] Set trading state: ${operationType} for ${normalizedSymbol}`);
  }
};

// Simple notification function using console.log
const addNotification = ({ title, message, type, playSound = false }) => {
  console.log(`[${type || 'info'}] ${title}: ${message}`);
  // Play sound if requested
  if (playSound) {
    try {
      const audio = new Audio(soundEffect);
      audio.play().catch(error => {
        console.warn('Error playing notification sound:', error);
      });
    } catch (error) {
      console.warn('Error initializing notification sound:', error);
    }
  }
  // In a real app, we would use a proper notification library
};

const TradingContainer = styled.div`
  padding: 20px;
  background: var(--bg1);
  min-height: calc(100vh - 100px);
  margin-top: 0;
  
  @media (max-width: 768px) {
    padding: 10px;
    margin-top: 0;
  }
`;

const TradingGrid = styled.div`
  display: grid;
  grid-template-columns: 65% 35%;
  gap: 1px;
  margin-top: 5px;
  margin-bottom: 30px;
  background: var(--bg);
  
  @media (max-width: 1200px) {
    grid-template-columns: 60% 40%;
  }
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 768px) {
    margin-top: 3px;
    margin-bottom: 20px;
  }
`;

const ChartSection = styled.div`
  background: var(--bg);
  border-right: 1px solid var(--line);
  height: 350px;
  
  @media (max-width: 992px) {
    border-right: none;
    border-bottom: 1px solid var(--line);
  }
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const RightSection = styled.div`
  width: 100%;
  background: var(--bg);
  display: grid;
  grid-template-rows: auto;
  height: 350px;
  
  @media (max-width: 992px) {
    width: 100%;
  }
  
  @media (max-width: 768px) {
    height: auto;
  }
`;

const TradingInterface = styled.div`
  display: grid;
  grid-template-columns: 50% 50%;
  width: 100%;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr 1fr;
    border-left: none;
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const OrderBookSection = styled.div`
  // height: 350px;
  border-right: 1px solid var(--line);
  padding: 6px;
  display: flex;
  flex-direction: column;
  border: 1px solid #D4AF37;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  margin: 3px;
  overflow: hidden;
  
  @media (max-width: 992px) {
    height: 330px;
  }
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const OrderFormSection = styled.div`
  padding: 6px;
  height: 400px;
  display: flex;
  flex-direction: column;
  border: 1px solid #D4AF37;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  margin: 3px;
  
  @media (max-width: 992px) {
    height: 330px;
  }
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const ChartCard = styled.div`
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 8px;
  }
`;

const OrderCard = styled.div`
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 12px;
    border-radius: 8px;
  }
`;

const CoinInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-bottom: 15px;
  }
`;

const CoinIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: contain;
  background: ${props => props.$theme === 'light' ? '#fff' : props.$theme === 'dark' ? '#2A2A3C' : '#fff'};
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

const CoinDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const CoinName = styled.h2`
  color: #fff;
  margin: 0;
  font-size: 24px;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const CoinSymbol = styled.span`
  color: #7A7A7A;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const PriceInfo = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    gap: 12px;
    margin-bottom: 15px;
    flex-direction: column;
  }
`;

const Price = styled.div`
  color: #fff;
  font-size: 24px;
  font-weight: 500;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const Change = styled.span`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  background: ${props => props.$isPositive ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'};
  color: ${props => props.$isPositive ? '#0ECB81' : '#F6465D'};
  margin-left: 8px;
  
  @media (max-width: 768px) {
    font-size: 12px;
    padding: 1px 6px;
  }
`;

const OrderForm = styled.form`
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  gap: 6px;
  height: 100%;
  
  @media (max-width: 768px) {
    padding: 4px 0;
    gap: 4px;
  }
`;

const TabGroup = styled.div`
  display: flex;
  margin-bottom: 6px;
  gap: 6px;
  
  @media (max-width: 768px) {
    margin-bottom: 4px;
    gap: 3px;
  }
`;

const OrderTab = styled.button`
  background: ${props => props.$active ? 'var(--primary)' : 'var(--bg2)'};
  color: ${props => props.$active ? 'var(--text-white)' : 'var(--text)'};
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  outline: none;
  
  &:hover {
    background: ${props => props.$active ? 'var(--primary)' : 'var(--bg3)'};
  }
  
  @media (max-width: 768px) {
    padding: 5px 10px;
    font-size: 12px;
  }
`;

const AmountInput = styled.input`
  background: var(--bg2);
  color: var(--text);
  border: 1px solid var(--line);
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s;
  width: 100%;
  margin: 2px 0;
  
  &:focus {
    border-color: #D4AF37;
    box-shadow: 0 0 4px rgba(212, 175, 55, 0.3);
  }
  
  @media (max-width: 768px) {
    padding: 5px 8px;
    font-size: 12px;
    margin: 1px 0;
  }
`;

const Button = styled.button`
  background: ${props => props.$variant === 'buy' ? 'transparent' : props.$variant === 'sell' ? 'transparent' : 'transparent'};
  color: white;
  border: 1px solid #fff;
  padding: 8px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 5px;
  border: 1px solid ${props => {
    if (props.$variant === 'buy') return 'rgba(212, 175, 55, 0.5)';
    if (props.$variant === 'sell') return 'rgba(212, 175, 55, 0.5)';
    return '#D4AF37';
  }};
  box-shadow: 0 0 4px ${props => {
    if (props.$variant === 'buy') return 'rgba(52, 199, 89, 0.3)';
    if (props.$variant === 'sell') return 'rgba(255, 59, 48, 0.3)';
    return 'rgba(212, 175, 55, 0.3)';
  }};
  
  &:hover {
    filter: brightness(1.1);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 6px;
    font-size: 13px;
  }
`;

// Update the TIMEFRAMES object
const TIMEFRAMES = {
  '1D': { label: '1D', value: '1' },
  '1W': { label: '1W', value: '7' }
};

// Update the styled component for the chart
const ChartEmbed = styled.iframe`
  width: 100%;
  height: 600px;
  border: none;
  border-radius: 8px;
  background: var(--bg2);
`;

const CurrentPrice = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  padding: 8px 0;
  margin: 5px 0;
  position: relative;
  color: ${props => props.$isUp ? '#0ECB81' : '#F6465D'};
  background: ${props => props.$isUp ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)'};
  border-top: 1px solid ${props => props.$isUp ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)'};
  border-bottom: 1px solid ${props => props.$isUp ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)'};
  letter-spacing: 0.5px;
`;

// Replace the InternalTradingChart function
function InternalTradingChart({ symbol, theme }) {
  return (
    <TradingChartComponent
      symbol={`BINANCE:${symbol}`}
      theme={theme}
      container_id="tradingview_chart"
      autosize={true}
      timeframe="15"
      allow_symbol_change={false}
    />
  );
}

// Define accurate coin IDs for CoinGecko
const hardcodedPrices = {
  'btc': 90812.45,
  'bitcoin': 90812.45,
  'eth': 3452.67,
  'ethereum': 3452.67,
  'sol': 142.56,
  'bnb': 567.89,
  'doge': 0.12
};

// Define accurate coin IDs for CoinGecko
const COINGECKO_IDS = {
  'btc': 'bitcoin',
  'bitcoin': 'bitcoin',
  'eth': 'ethereum', 
  'ethereum': 'ethereum',
  'sol': 'solana',
  'bnb': 'binancecoin',
  'doge': 'dogecoin',
  'xrp': 'ripple',
  'ada': 'cardano',
  'dot': 'polkadot',
  'matic': 'matic-network',
  'avax': 'avalanche-2',
  'link': 'chainlink',
  'uni': 'uniswap',
  'atom': 'cosmos'
};

const fetchHistoricalData = async (coinId, days = '1', interval = 'minute') => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Convert the data to candlestick format
    const candlesticks = [];
    const prices = data.prices;
    
    for (let i = 0; i < prices.length; i += 1) {
      const candle = {
        time: prices[i][0] / 1000, // Convert to seconds
        open: prices[i][1],
        high: prices[i][1],
        low: prices[i][1],
        close: prices[i][1]
      };
      
      if (i > 0) {
        candle.open = prices[i-1][1];
        candle.high = Math.max(candle.open, candle.close);
        candle.low = Math.min(candle.open, candle.close);
      }
      
      candlesticks.push(candle);
    }
    
    return candlesticks;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return null;
  }
};

// Add these new styled components
const OrderTypeSelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const leverageOptions = [10, 20, 25, 30, 40];  // Updated leverage options

const LeverageSlider = styled.input`
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg2);
  outline: none;
  margin: 10px 0;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${props => props.$value >= 30 ? '#F6465D' : 'var(--primary)'};
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${props => props.$value >= 30 ? '#F6465D' : 'var(--primary)'};
    cursor: pointer;
    border: none;
  }
`;

const LeverageDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  color: var(--text);
  font-size: 12px;
`;

const QuickLeverageButtons = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const QuickLeverageButton = styled.button`
  padding: 4px 8px;
  margin: 0 4px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  background: ${props => props.$active ? 'var(--primary)' : 'var(--bg1)'};
  color: ${props => props.$active ? '#fff' : 'var(--text)'};
  
  &:hover {
    background: var(--primary);
    color: #fff;
  }
`;

const OrderDetails = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 12px;
`;

// Add these new styled components
const OrderBook = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg2);
  border-radius: 12px;
  border: 1px solid #D4AF37; /* Golden border color */
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2); /* Subtle golden glow */
  overflow: hidden;
  
  @media (max-width: 768px) {
    max-height: 300px;
    overflow-y: auto;
  }
`;

const OrderBookHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--line);
  text-align: right;
  
  span:first-child {
    text-align: left;
  }
  
  @media (max-width: 768px) {
    padding: 6px;
    font-size: 11px;
  }
`;

const OrderBookRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  position: relative;
  text-align: right;
  transition: background 0.1s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    ${props => props.$side === 'buy' ? 'right' : 'left'}: 0;
    height: 100%;
    width: ${props => props.$depth || 0}%;
    background: ${props => props.$side === 'buy' 
      ? 'rgba(52, 199, 89, 0.1)' 
      : 'rgba(255, 59, 48, 0.1)'};
    z-index: 0;
    pointer-events: none;
  }
  
  span {
    position: relative;
    z-index: 1;
  }
  
  span:first-child {
    text-align: left;
  }
  
  &.flash {
    animation: flash 0.5s;
  }
  
  @keyframes flash {
    0% { background-color: rgba(255, 255, 255, 0.1); }
    100% { background-color: transparent; }
  }
  
  @media (max-width: 768px) {
    padding: 3px 6px;
    font-size: 11px;
  }
`;

// Update OrderCard to include buy/sell colors
const OrderButton = styled.button`
  background: ${props => props.$orderType === 'buy' ? '#0ECB81' : '#F6465D'};
  color: white;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  font-weight: 500;
  font-size: 13px;
  border: 1px solid ${props => props.$orderType === 'buy' ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)'};
  box-shadow: 0 0 4px ${props => props.$orderType === 'buy' ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)'};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  
  @media (max-width: 768px) {
    padding: 6px;
    font-size: 12px;
  }
`;

// Add a new container for the right side
const RightPanel = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  height: 600px; // Match chart height
`;

// Update the positions table styling
const PositionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);
  border: 1px solid #D4AF37;
  animation: fadeIn 1s ease-in-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @media (max-width: 768px) {
    /* Mobile-specific styles */
    font-size: 12px;
  }
`;

const TableHeader = styled.th`
  background: rgba(212, 175, 55, 0.2);
  color: #D4AF37;
  padding: 8px;
  font-size: 12px;
  text-align: left;
  
  @media (max-width: 768px) {
    /* Hide specific columns on mobile */
    &:nth-child(2), /* Amount */
    &:nth-child(3), /* Entry Price */
    &:nth-child(4), /* Mark Price */
    &:nth-child(5), /* Liquidation */
    &:nth-child(6) { /* Leverage */
      display: none;
    }
  }
`;

const TableCell = styled.td`
  padding: 6px 8px;
  font-size: 12px;
  color: var(--text);
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  
  @media (max-width: 768px) {
    /* Hide specific columns on mobile */
    &:nth-child(2), /* Amount */
    &:nth-child(3), /* Entry Price */
    &:nth-child(4), /* Mark Price */
    &:nth-child(5), /* Liquidation */
    &:nth-child(6) { /* Leverage */
      display: none;
    }
    
    /* Style for the symbol that appears next to the type on mobile */
    .mobile-only-symbol {
      display: inline-block;
      font-size: 12px;
      opacity: 1;
      margin-left: 6px;
      color: #D4AF37; /* Gold color for better visibility */
      font-weight: bold;
    }
  }
  
  /* Hide the symbol on desktop */
  .mobile-only-symbol {
    display: none;
  }
`;

const PnLValue = styled.span`
  color: ${props => props.value >= 0 ? '#0ECB81' : '#F6465D'};
  font-weight: bold;
`;

// Add these styled components at the top with your other styled components
const TradeInfo = styled.div`
  margin-top: 5px;
  background: rgba(30, 41, 59, 0.4);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${props => props.$highlight ? 'var(--primary)' : 'var(--text-secondary)'};
  margin-bottom: 3px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// Add this helper function before the Trading component
const calculateRequiredMargin = (amount, price, leverage) => {
  if (!amount || !price || !leverage) return 0;
  return (parseFloat(amount) * price) / leverage;
};

// Update the leverage buttons handling
const LeverageButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const LeverageInput = styled.input`
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  background: var(--bg2);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 4px;
`;

// Add these styled components
const ChartContainer = styled.div`
  position: relative;
  background: var(--bg1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #D4AF37; /* Golden border color */
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2); /* Subtle golden glow */
`;

const DexLink = styled.a`
  display: inline-block;
  padding: 8px 12px;
  background: rgba(30, 34, 45, 0.8);
  color: var(--text-secondary);
  font-size: 13px;
  text-decoration: none;
  border-radius: 4px;
  position: absolute;
  right: 24px;
  bottom: 24px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--primary);
    color: white;
  }
  
  i {
    margin-left: 5px;
    font-size: 12px;
  }
`;

const TimeframeSelector = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px;
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  background: rgba(30, 34, 45, 0.8);
  border-radius: 4px;
`;

const TimeButton = styled.button`
  padding: 4px 12px;
  background: ${props => props.$active ? 'var(--primary)' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#7a7a7a'};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: ${props => props.$active ? 'var(--primary)' : 'rgba(71, 77, 87, 0.7)'};
  }
`;

// Add this styled component
const DexScreenerChart = styled.iframe`
  width: 100%;
  height: 500px;
  border: none;
  border-radius: 8px;
  background: var(--bg2);
`;

// Add these new styled components after the existing styled components
const TradesList = styled.div`
  max-height: 80px;
  overflow-y: auto;
  padding: 4px 0;
  background: var(--bg);
  border-top: none;
  border-bottom: none;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.3);
    border-radius: 4px;
  }
`;

const TradeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 8px;
  font-size: 12px;
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(${props => props.$isBuy ? '-10px' : '10px'});
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  & > span {
    &:first-child {
      color: ${props => props.$isBuy ? '#0ECB81' : '#F6465D'};
    }
    &:nth-child(2),
    &:last-child {
      text-align: right;
    }
  }
`;

// Add these styled components after the existing styled components
const OrderBookContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: calc(100% - 32px);
`;

const AsksContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  /* Use more subtle background with less opacity */
  background: var(--bg); 
  display: flex;
  flex-direction: column-reverse;
  min-height: 200px;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(246, 70, 93, 0.1);
    border-radius: 4px;
  }
`;

const BidsContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  /* Use same background as AsksContainer */
  background: var(--bg);
  min-height: 200px;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(14, 203, 129, 0.1);
    border-radius: 4px;
  }
`;

// Fix the calculatePnL function
const calculatePnL = (position, currentMarketPrice) => {
  if (!position || !position.entryPrice || !currentMarketPrice) return 0;
  
  const { type, entryPrice, leverage, margin } = position;
  
  try {
    // Ensure all values are proper numbers
    const entryPriceNum = parseFloat(entryPrice);
    const currentMarketPriceNum = parseFloat(currentMarketPrice);
    const leverageNum = parseFloat(leverage);
    const marginNum = parseFloat(margin);
    
    // Validation
    if (isNaN(entryPriceNum) || isNaN(currentMarketPriceNum) || isNaN(leverageNum) || isNaN(marginNum)) {
      console.error('Invalid values for PnL calculation:', { entryPrice, currentMarketPrice, leverage, margin });
      return 0;
    }
    
    if (type === 'buy') {
      const priceDiff = currentMarketPriceNum - entryPriceNum;
      const percentageChange = (priceDiff / entryPriceNum) * 100;
      return +(marginNum * (percentageChange / 100) * leverageNum).toFixed(2);
    } else {
      const priceDiff = entryPriceNum - currentMarketPriceNum;
      const percentageChange = (priceDiff / entryPriceNum) * 100;
      return +(marginNum * (percentageChange / 100) * leverageNum).toFixed(2);
    }
  } catch (error) {
    console.error('Error calculating PnL:', error);
    return 0;
  }
};

// Generate random quantity based on price range
const generateRandomQty = (price) => {
  // For very low-priced tokens (< $0.01), use much larger quantities
  if (price < 0.01) {
    // For micro-priced tokens, quantities typically range from 10,000 to 100,000
    return (Math.random() * 90000 + 10000).toFixed(4);
  }
  // For low-priced tokens ($0.01-$1), use large quantities 
  else if (price < 1) {
    // For very low-priced assets, quantities typically range from 1,000 to 10,000
    return (Math.random() * 9000 + 1000).toFixed(4);
  }
  // For medium-low priced tokens ($1-$10)
  else if (price < 10) {
    // For low-priced assets, quantities typically range from 100 to 1,000
    return (Math.random() * 900 + 100).toFixed(4);
  }
  // For medium-priced assets ($10-$100), use moderate quantities
  else if (price < 100) {
    // For medium-priced assets, quantities range from 10 to 100
    return (Math.random() * 90 + 10).toFixed(4);
  }
  // For mid-high priced tokens ($100-$500) 
  else if (price < 500) {
    // Medium quantities between 0.1 and 5
    return (Math.random() * 4.9 + 0.1).toFixed(4);
  } 
  // For high-priced assets (>$500)
  else {
    // Smaller quantities between 0.05 and 2
    return (Math.random() * 1.95 + 0.05).toFixed(4);
  }
};

// Generate realistic order book data based on current price
const generateOrderBook = (currentPrice, bidAskSpread = 0.002) => {
  // Ensure we have a valid price to work with
  const validPrice = currentPrice && !isNaN(currentPrice) && currentPrice > 0 
    ? Number(currentPrice) // Ensure it's converted to a number 
    : 100;
  
  console.log('Using valid price for order book:', validPrice);
  
  // Adjust price step based on the current price to keep orders close to actual market price
  let priceStep;
  
  if (validPrice < 0.0001) {
    // For ultra-micro-priced tokens, use 0.2% of price as step
    priceStep = validPrice * 0.002;
  } else if (validPrice < 0.001) {
    // For micro-priced tokens, use 0.3% of price as step
    priceStep = validPrice * 0.003;
  } else if (validPrice < 0.01) {
    // For very low-priced tokens, use 0.4% of price as step
    priceStep = validPrice * 0.004;
  } else if (validPrice < 0.1) {
    // For low-priced tokens, use 0.5% of price as step
    priceStep = validPrice * 0.005;
  } else if (validPrice < 1) {
    // For medium-low priced tokens, use 0.2% step
    priceStep = validPrice * 0.002;
  } else {
    // For higher-priced tokens, use 0.1% step
    priceStep = validPrice * 0.001;
  }
  
  const asks = [];
  const bids = [];
  const numOrders = 8; // Reduced number of asks and bids to generate to fit without scrolling
  
  // Calculate the spread based on the actual price to ensure it's proportional
  const spreadAmount = Math.max(validPrice * 0.0005, Number.EPSILON); // Min 0.05% spread, ensure it's never 0
  
  // Calculate starting prices for asks and bids
  const askStartPrice = validPrice + (spreadAmount / 2);
  const bidStartPrice = validPrice - (spreadAmount / 2);
  
  console.log('Ask start price:', askStartPrice, 'Bid start price:', bidStartPrice, 'Step:', priceStep);
  
  // Generate ask prices (sells above current price)
  for (let i = 0; i < numOrders; i++) {
    const price = Number((askStartPrice + (i * priceStep)).toFixed(10));
    
    // Generate random volume based on price range
    const quantity = parseFloat(generateRandomQty(price));
    const total = Number((price * quantity).toFixed(10));
    
    asks.push({
      price,
      quantity,
      total
    });
  }
  
  // Generate bid prices (buys below current price)
  for (let i = 0; i < numOrders; i++) {
    // Ensure price doesn't go negative for low-priced tokens
    let price;
    if (bidStartPrice < priceStep * (i + 1)) {
      // If subtracting would make price negative, use a percentage of current price
      price = Number((bidStartPrice * Math.pow(0.99, i + 1)).toFixed(10));
    } else {
      price = Number((bidStartPrice - (i * priceStep)).toFixed(10));
    }
    
    // Ensure price is always positive
    price = Math.max(Number.EPSILON, price);
    
    // Generate random volume based on price range
    const quantity = parseFloat(generateRandomQty(price));
    const total = Number((price * quantity).toFixed(10));
    
    bids.push({
      price,
      quantity, 
      total
    });
  }
  
  // Sort asks in descending order (highest sell at top)
  asks.sort((a, b) => b.price - a.price);
  
  // Return formatted order book data
  return {
    asks,
    bids,
    marketPrice: validPrice
  };
};

// Export a single function for order book data that everyone will use
const createOrderBookData = (marketPrice, symbol, buyRatio = 0.5) => {
  if (!marketPrice || isNaN(marketPrice)) {
    console.warn('Invalid market price for order book:', marketPrice);
    return { asks: [], bids: [] };
  }

  // Log the actual market price used for debugging
  console.log('Creating order book with market price:', marketPrice);

  // Ensure we're working with the actual price, not an arbitrary value
  const validPrice = parseFloat(marketPrice);
  
  // Use very tight spread for all assets as requested
  const bidAskSpread = validPrice * 0.001; // 0.1% spread

  // Generate consistent order book data
  const orderBook = generateOrderBook(validPrice, bidAskSpread);
  
  return orderBook;
};

// Replace all existing functions with this single implementation
const generateMockOrderBookData = createOrderBookData;
const generateDummyOrders = createOrderBookData;

// Format the price displayed in the order book
const formatOrderPrice = (price) => {
  if (typeof price !== 'number' && typeof price !== 'string') {
    return '0.00';
  }
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return '0.00';
  }
  
  // Format based on price ranges
  if (numPrice < 0.000001) {
    // Scientific notation for extremely small prices
    return numPrice.toExponential(6);
  } else if (numPrice < 0.00001) {
    return numPrice.toFixed(9);
  } else if (numPrice < 0.0001) {
    return numPrice.toFixed(8);
  } else if (numPrice < 0.001) {
    return numPrice.toFixed(7);
  } else if (numPrice < 0.01) {
    return numPrice.toFixed(6);
  } else if (numPrice < 0.1) {
    return numPrice.toFixed(5);
  } else if (numPrice < 1) {
    return numPrice.toFixed(4);
  } else if (numPrice < 10) {
    return numPrice.toFixed(3);
  } else if (numPrice < 1000) {
    return numPrice.toFixed(2);
  } else {
    return Math.floor(numPrice).toLocaleString();
  }
};

// Helper function to safely cleanup resources
const safelyCleanup = (resource) => {
  if (resource && typeof resource === 'function') {
    try {
      resource();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  } else if (resource && typeof resource.destroy === 'function') {
    try {
      resource.destroy();
    } catch (error) {
      console.error('Error destroying resource:', error);
    }
  } else if (resource && typeof resource.close === 'function') {
    try {
      resource.close();
    } catch (error) {
      console.error('Error closing resource:', error);
    }
  }
};

/**
 * Generates a random updated price based on the current price with realistic volatility
 * @param {number} currentPrice - The current market price
 * @returns {number} - A new price with slight random variation
 */
const getRandomUpdatedPrice = (currentPrice) => {
  if (!currentPrice || currentPrice <= 0) return 0.04;
  
  // Smaller price changes for more stable updates
  const volatilityPercentage = 0.002; // Max 0.2% change per update
  const changePercent = (Math.random() * 2 - 1) * volatilityPercentage;
  
  // Calculate new price
  let newPrice = currentPrice * (1 + changePercent);
  
  // Ensure price doesn't drop below minimum values
  if (newPrice < 0.01) {
    newPrice = Math.max(newPrice, 0.01);
  }
  
  // Round appropriately based on price magnitude
  if (newPrice < 0.1) {
    return Math.round(newPrice * 100000) / 100000;
  } else if (newPrice < 1) {
    return Math.round(newPrice * 10000) / 10000;
  } else if (newPrice < 10) {
    return Math.round(newPrice * 1000) / 1000;
  } else if (newPrice < 100) {
    return Math.round(newPrice * 100) / 100;
  }
  
  return Math.round(newPrice * 10) / 10;
};

// Add a function to play sound effect
const playTradeSound = () => {
  try {
    const audio = new Audio(soundEffect);
    audio.play().catch(error => {
      console.warn('Error playing trade sound:', error);
    });
  } catch (error) {
    console.warn('Error initializing trade sound:', error);
  }
};

// Move these styled components outside the Trading component function
const OrderPrice = styled.div`
  color: ${props => props.type === 'ask' ? 'var(--red)' : 'var(--green)'};
  font-family: 'Roboto Mono', monospace;
  
  sub {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const OrderBookTable = styled.div`
  width: 100%;
  font-size: 11px;
  border: 1px solid #D4AF37;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
  height: 95%;
  display: flex;
  flex-direction: column;
  
  .header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 3px 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #666;
    font-size: 10px;
    position: sticky;
    top: 0;
    background: var(--bg2);
    z-index: 1;
  }
  
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 2px 4px;
    cursor: pointer;
    transition: background 0.1s;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

// Restore the formatSmallNumber function since other parts of the code may be using it
const formatSmallNumber = (num) => {
  // Convert string to number if needed
  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(number) || number === null) return '0.00';
  
  // For extremely small numbers (less than 0.00000001)
  if (number < 0.00000001 && number > 0) {
    return '<0.00000001';
  }
  
  // For very small numbers (less than 0.0001)
  if (number < 0.0001 && number > 0) {
    // Display all significant digits for very small numbers
    const scientificNotation = number.toExponential();
    if (scientificNotation.includes('e-')) {
      // Format with appropriate decimal places based on the exponent
      const exponent = parseInt(scientificNotation.split('e-')[1], 10);
      return number.toFixed(exponent + 2).replace(/\.?0+$/, '');
    }
    return number.toFixed(8);
  }
  
  // For small numbers (0.0001 to 0.001)
  if (number < 0.001) {
    return number.toFixed(7);
  }
  
  // For numbers between 0.001 and 0.01
  if (number < 0.01) {
    return number.toFixed(6);
  }
  
  // For numbers between 0.01 and 0.1
  if (number < 0.1) {
    return number.toFixed(5);
  }
  
  // For numbers between 0.1 and 1
  if (number < 1) {
    return number.toFixed(4);
  }
  
  // For numbers between 1 and 100
  if (number < 100) {
    return number.toFixed(2);
  }
  
  // For larger numbers like Bitcoin (typically > 1000)
  // Always use toLocaleString with both minimumFractionDigits and maximumFractionDigits
  // This ensures we have proper formatting with commas AND always show .00
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Trading component function
const Trading = () => {
const Trading = () => {
  const { cryptoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme] = useState('dark');
  const { currentUser } = useAuth();
  const [cryptoData, setCryptoData] = useState(location.state?.cryptoData || null);
  const [timeframe, setTimeframe] = useState('1H');
  const [orderType, setOrderType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [chartKey, setChartKey] = useState(0);
  const [orderMode, setOrderMode] = useState('market');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [positions, setPositions] = useState({
    open: [],
    closed: []
  });
  const [userPnL, setUserPnL] = useState(0);
  const [error, setError] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [userBalance, setUserBalance] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPending, setIsPending] = useState(false);
  const [openPositions, setOpenPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [pendingLimitOrders, setPendingLimitOrders] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);
  const [marketPrice, setMarketPrice] = useState(0);
  const [closingPositionId, setClosingPositionId] = useState(null);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [priceData, setPriceData] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [buyRatio, setBuyRatio] = useState(0.5); // Default 50/50 ratio
  const [orderBookFlash, setOrderBookFlash] = useState({});
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  // Add a state to track the last checked price to avoid too frequent checks
  const [lastCheckedPrice, setLastCheckedPrice] = useState(0);
  // Add a state to track orders being executed to prevent duplicates
  const [ordersBeingExecuted, setOrdersBeingExecuted] = useState([]);
  // Add a state variable for the order being edited
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editTargetPrice, setEditTargetPrice] = useState('');
  // Price validation states
  const [isPriceConsistent, setIsPriceConsistent] = useState(true);
  const [lastVerifiedPrices, setLastVerifiedPrices] = useState({});
  // Add this near the state declarations at the beginning of the Trading component
  const [isInitializing, setIsInitializing] = useState(true);

  // Safely extract token data even if it's not fully loaded - moved to top
  const safeToken = useMemo(() => {
    if (!cryptoData || !cryptoData.token) {
      // If no valid cryptoData, extract from URL
      const id = window.location.pathname.split('/trading/')[1];
      return {
        id,
        symbol: id?.toUpperCase() || 'BTC',
        name: 'Loading...',
      };
    }
    return cryptoData.token;
  }, [cryptoData]);

  // Refs for cleanup
  const ws = useRef(null);
  const priceUpdateInterval = useRef(null);
  const orderUpdateInterval = useRef(null);
  const unsubscribeOrders = useRef(null);
  const unsubscribePositions = useRef(null);

  // Define utility functions first, before they're used in any hooks

  // Function to check if a price is suspicious
  const isSuspiciousPrice = (price, symbol) => {
    if (!price || isNaN(price) || price <= 0) return true;
    
    // Normalize the symbol
    const normalizedSymbol = (symbol || 'btc').toLowerCase().replace(/usdt$/, '');
    
    // Get the last verified price for this symbol
    const lastVerifiedPrice = lastVerifiedPrices[normalizedSymbol];
    
    // If we have no reference price, we can't determine if it's suspicious
    if (!lastVerifiedPrice) return false;
    
    // Calculate the percent change from the last verified price
    const priceChange = Math.abs((price - lastVerifiedPrice) / lastVerifiedPrice);
    
    // Define maximum allowed price changes based on coin type
    const maxPriceChanges = {
      btc: 0.10, // 10% max for Bitcoin
      eth: 0.15, // 15% max for Ethereum
      default: 0.20 // 20% max for other coins
    };
    
    // Determine maximum allowed change for this symbol
    const maxAllowedChange = maxPriceChanges[normalizedSymbol] || maxPriceChanges.default;
    
    // Flag as suspicious if price change exceeds maximum allowed
    if (priceChange > maxAllowedChange) {
      console.warn(`Suspicious price detected for ${normalizedSymbol}: ${price} (${priceChange * 100}% change from ${lastVerifiedPrice})`);
      return true;
    }
    
    return false;
  };
  
  // Function to get a safe price
  const getSafePrice = (price, symbol) => {
    const normalizedSymbol = (symbol || 'btc').toLowerCase().replace(/usdt$/, '');
    
    // If price is suspicious, use hardcoded or last verified price
    if (isSuspiciousPrice(price, normalizedSymbol)) {
      console.log(`🔧 Fixing suspicious price: ${price} → using fallback for ${normalizedSymbol}`);
      
      // Use last verified price if available
      if (lastVerifiedPrices[normalizedSymbol]) {
        return lastVerifiedPrices[normalizedSymbol];
      }
      
      // Otherwise use hardcoded price
      const hardcodedPrices = {
        btc: 80000,
        eth: 3000,
        ltc: 100,
        doge: 0.1
      };
      
      if (hardcodedPrices[normalizedSymbol]) {
        return hardcodedPrices[normalizedSymbol];
      }
      
      // Last resort fallbacks by coin type
      if (normalizedSymbol === 'btc') return 80000;
      if (normalizedSymbol === 'eth') return 3000;
      
      // Default generic fallback
      return 100;
    }
    
    // If price seems valid, record it as verified
    const newVerifiedPrices = {...lastVerifiedPrices};
    newVerifiedPrices[normalizedSymbol] = price;
    setLastVerifiedPrices(newVerifiedPrices);
    
    // Return the original price since it's valid
    return price;
  };
  
  // Function to track price for consistency
  const trackPrice = (price, symbol) => {
    if (!price || isNaN(price) || price <= 0) return false;
    
    const normalizedSymbol = (symbol || 'btc').toLowerCase().replace(/usdt$/, '');
    
    // Record price in verified prices if it passes validation
    if (!isSuspiciousPrice(price, normalizedSymbol)) {
      const newVerifiedPrices = {...lastVerifiedPrices};
      newVerifiedPrices[normalizedSymbol] = price;
      setLastVerifiedPrices(newVerifiedPrices);
      return true;
    }
    
    return false;
  };
  
  // Function to create order book data
  const createOrderBookData = (marketPrice, symbol, buyRatio = 0.5) => {
    if (!marketPrice || isNaN(marketPrice) || marketPrice <= 0) {
      console.error('Invalid market price for order book generation:', marketPrice);
      return { bids: [], asks: [] };
    }
    
    // Make sure we have a valid symbol
    const nonEmptySymbol = symbol || 'btc';
    
    // Properly format price based on currency value
    const formatPrice = (price) => {
      if (price >= 1000) {
        return price.toFixed(2); // 2 decimal places for high-value coins
      } else if (price >= 1) {
        return price.toFixed(4); // 4 decimal places for mid-value coins
      } else {
        return price.toFixed(6); // 6 decimal places for low-value coins
      }
    };
    
    // Adjust the number of levels and spread based on the price
    const getPriceLevels = (basePrice) => {
      if (basePrice >= 10000) {
        return { levels: 12, spread: 0.0005, randomRange: 0.0002 };
      } else if (basePrice >= 1000) {
        return { levels: 15, spread: 0.001, randomRange: 0.0003 };
      } else if (basePrice >= 100) {
        return { levels: 18, spread: 0.002, randomRange: 0.0005 };
      } else if (basePrice >= 10) {
        return { levels: 20, spread: 0.003, randomRange: 0.001 };
      } else if (basePrice >= 1) {
        return { levels: 22, spread: 0.005, randomRange: 0.0015 };
      } else if (basePrice >= 0.1) {
        return { levels: 25, spread: 0.01, randomRange: 0.002 };
      } else {
        return { levels: 25, spread: 0.02, randomRange: 0.004 };
      }
    };
    
    const { levels, spread, randomRange } = getPriceLevels(marketPrice);
    
    // Generate random volumes that feel natural
    const generateVolume = () => {
      // Base volume in terms of quote currency (e.g., USDT)
      const baseVolume = Math.random() * 50000 + 1000; // $1000 to $51000
      
      // Convert to token amount
      return baseVolume / marketPrice;
    };
    
    // Generate a random modifier for price levels
    const randomModifier = () => (Math.random() * randomRange * 2) - randomRange;
    
    // Generate bid and ask orders
    const bids = [];
    const asks = [];
    
    // Calculate the middle of the spread
    const middleSpread = marketPrice * (1 - (spread / 2));
    const askStart = marketPrice * (1 + (spread / 2));
    
    // Generate bid orders (buy orders below current price)
    for (let i = 0; i < levels; i++) {
      const priceDecrement = (spread * (i + 1)) + randomModifier();
      const price = middleSpread * (1 - priceDecrement);
      const size = generateVolume();
      
      bids.push({
        price: parseFloat(formatPrice(price)),
        size: parseFloat(size.toFixed(4)),
        total: parseFloat((price * size).toFixed(2))
      });
    }
    
    // Generate ask orders (sell orders above current price)
    for (let i = 0; i < levels; i++) {
      const priceIncrement = (spread * (i + 1)) + randomModifier();
      const price = askStart * (1 + priceIncrement);
      const size = generateVolume();
      
      asks.push({
        price: parseFloat(formatPrice(price)),
        size: parseFloat(size.toFixed(4)),
        total: parseFloat((price * size).toFixed(2))
      });
    }
    
    // Sort bids in descending order (highest buy offers first)
    bids.sort((a, b) => b.price - a.price);
    
    // Sort asks in ascending order (lowest sell offers first)
    asks.sort((a, b) => a.price - b.price);
    
    return { bids, asks };
  };
  
  // Create aliases to ensure all functions are defined before they're used
  const generateMockOrderBookData = createOrderBookData;
  const generateDummyOrders = createOrderBookData;

  // Function to fetch user balances
  const fetchUserBalances = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingBalance(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.balances) {
          setUserBalance(userData.balances);
        } else {
          // For legacy users, check the separate balances collection
          const balanceDoc = await getDoc(doc(db, 'balances', currentUser.uid));
          if (balanceDoc.exists()) {
            setUserBalance(balanceDoc.data());
          }
        }
        }
      } catch (error) {
      console.error('Error fetching user balances:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Function to fetch pending limit orders for the current symbol
  const fetchPendingLimitOrders = useCallback(async () => {
    if (!currentUser || !cryptoData?.token?.symbol) return;
    
    try {
      console.log('Fetching pending limit orders for:', currentUser.uid, cryptoData?.token?.symbol);
      const limitOrders = await tradingService.getLimitOrders(currentUser.uid, cryptoData?.token?.symbol);
      console.log('Received limit orders:', limitOrders);
      setPendingLimitOrders(limitOrders);
    } catch (error) {
      console.error('Error fetching limit orders:', error);
    }
  }, [currentUser, cryptoData?.token?.symbol]);

  // Function to fetch positions
  const fetchPositions = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoadingPositions(true);
      
      // Query for open positions
      const openPositionsQuery = query(
        collection(db, 'positions'),
        where('userId', '==', currentUser.uid),
        where('status', '==', 'OPEN')
      );
      
      // Fetch both open positions
      const openPositionsSnapshot = await getDocs(openPositionsQuery);
      const openPositionsData = openPositionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Set the positions
      setOpenPositions(openPositionsData);
    } catch (error) {
      console.error('Error fetching positions:', error);
    } finally {
      setIsLoadingPositions(false);
    }
  }, [currentUser]);

  // Effect to fetch positions on mount and when user changes
  useEffect(() => {
    if (currentUser) {
      fetchPositions();
      // Only call fetchPendingLimitOrders here if cryptoData is available
      if (cryptoData?.token?.symbol) {
        fetchPendingLimitOrders();
      }
    }
  }, [currentUser, fetchPositions, fetchPendingLimitOrders, cryptoData?.token?.symbol]);

  // Move ensureUserBalances here, at the top level of the component
  const ensureUserBalances = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      // Check if user has balances field
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If balances field doesn't exist or is invalid, create it
        if (!userData.balances || typeof userData.balances !== 'object') {
          console.log('User missing balances field, adding default balances');
          
          // Try to get any existing balances from the old location
          let existingBalances = { USDT: 1000 }; // Default to 1000 USDT
          
          try {
            const oldBalanceDoc = await getDoc(doc(db, 'balances', currentUser.uid));
            if (oldBalanceDoc.exists()) {
              const oldBalances = oldBalanceDoc.data();
              if (oldBalances.USDT !== undefined) {
                existingBalances.USDT = oldBalances.USDT;
              }
              if (oldBalances.BTC !== undefined) {
                existingBalances.BTC = oldBalances.BTC;
              }
              // Add other coins as needed
    }
  } catch (error) {
            console.warn('Error fetching old balances:', error);
          }
          
          // Update user document with balances
          await updateDoc(userRef, {
            balances: existingBalances
          });
          
          console.log('Updated user with balances:', existingBalances);
        }
      }
    } catch (error) {
      console.error('Error ensuring user balances:', error);
    }
  }, [currentUser]);
  
  // Call the ensureUserBalances function when component mounts and user is available
  useEffect(() => {
    if (currentUser) {
      ensureUserBalances();
    }
  }, [currentUser, ensureUserBalances]);

  // Replace the existing setupWebSocket function with this more robust version
  const setupWebSocket = useCallback(() => {
    let wsSymbol = safeToken?.symbol?.toLowerCase() || 'btc';
    
    // Make sure we have a valid symbol to use
    if (!wsSymbol || wsSymbol === 'undefined' || wsSymbol.length < 1) {
      console.error('Invalid symbol for WebSocket:', wsSymbol);
      wsSymbol = 'btc'; // Default to Bitcoin if symbol is invalid
    }
    
    // Format the symbol correctly for the WebSocket
    const wsEndpoint = `${wsSymbol}usdt@ticker`;
    console.log('Setting up WebSocket for:', wsEndpoint);
    
    try {
      // Clean up any existing connections
      if (ws.current) {
        try {
          ws.current.onopen = null;
          ws.current.onmessage = null;
          ws.current.onerror = null;
          ws.current.onclose = null;
          ws.current.close();
        } catch (error) {
          console.warn('Error closing existing WebSocket:', error);
        }
      }
      
      // Create a new WebSocket connection
      const newWs = new WebSocket(`wss://stream.binance.com:9443/ws/${wsEndpoint}`);
      
      // Set up event handlers
      newWs.onopen = () => {
        console.log(`WebSocket connected for ${wsEndpoint}`);
      };
      
      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.c) {
            const price = parseFloat(data.c);
            if (!isNaN(price) && price > 0) {
              setMarketPrice(price);
              // Only update lastPrice if this is the first time
              if (lastPrice === 0) {
                setLastPrice(price);
              }
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      newWs.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      newWs.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
        
        // Set up automatic reconnection after a delay to avoid rapid reconnection attempts
        setTimeout(() => {
          if (ws.current === newWs) {
            console.log('Attempting to reconnect WebSocket...');
            setupWebSocket();
          }
        }, 5000);
      };
      
      // Add a destroy method to make React cleanup happy
      newWs.destroy = function() {
        console.log('WebSocket destroy method called');
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.onclose = null;
        
        if (this.readyState === 0 || this.readyState === 1) {
          this.close();
        }
      };
      
      // Store the WebSocket reference
      ws.current = newWs;
      
      // Return a cleanup function
      return () => {
        if (ws.current === newWs) {
          try {
            newWs.onopen = null;
            newWs.onmessage = null;
            newWs.onerror = null;
            newWs.onclose = null;
            newWs.close();
            ws.current = null;
          } catch (error) {
            console.warn('Error during WebSocket cleanup:', error);
          }
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [safeToken?.symbol, lastPrice]);

  // Price update function
  const updatePrice = useCallback(async () => {
    try {
      // Your price update logic here
      const newPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.001);
      setCurrentPrice(newPrice);
      
      // Also update market price for limit order checking
      setMarketPrice(newPrice.toLocaleString());
      
      console.log(`💰 PRICE UPDATE: ${newPrice.toLocaleString()} USDT`);
      
      // If we have pending limit orders, log that we're checking them with the new price
      if (pendingLimitOrders.length > 0) {
        console.log(`💰 Checking ${pendingLimitOrders.length} pending orders with new price: ${newPrice.toLocaleString()}`);
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  }, [currentPrice, pendingLimitOrders.length]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup WebSocket
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      // Clear intervals
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
        priceUpdateInterval.current = null;
      }

      // Clear any other intervals or timeouts
      if (orderUpdateInterval.current) {
        clearInterval(orderUpdateInterval.current);
        orderUpdateInterval.current = null;
      }

      // Unsubscribe from any Firestore listeners
      if (typeof unsubscribeOrders.current === 'function') {
        unsubscribeOrders.current();
      }
      if (typeof unsubscribePositions.current === 'function') {
        unsubscribePositions.current();
      }
    };
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    const cleanup = setupWebSocket();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [setupWebSocket]);

  // Price update interval effect
  useEffect(() => {
    const intervalId = setInterval(updatePrice, 5000);
    priceUpdateInterval.current = intervalId;
    
    return () => {
      clearInterval(intervalId);
      priceUpdateInterval.current = null;
    };
  }, [updatePrice]);

  // Order update interval effect
  useEffect(() => {
    const intervalId = setInterval(() => {
      setOrderBook(generateMockOrderBookData(currentPrice));
    }, 3000);
    orderUpdateInterval.current = intervalId;
    
    return () => {
      clearInterval(intervalId);
      orderUpdateInterval.current = null;
    };
  }, [currentPrice]);

  // TradingView widget cleanup
  useEffect(() => {
    const tradingViewContainer = document.getElementById('tradingview_chart');
    
    return () => {
      try {
        if (tradingViewContainer) {
          while (tradingViewContainer.firstChild) {
            tradingViewContainer.removeChild(tradingViewContainer.firstChild);
          }
        }
        
        if (window.TradingView && typeof window.TradingView === 'object') {
          if (window.TradingView._binders) {
            window.TradingView._binders = [];
          }
        }
      } catch (error) {
        console.error('Error cleaning up TradingView widget:', error);
      }
    };
  }, []);

  // Order book interval management
  useEffect(() => {
    let orderBookInterval = null;
    
    if (isOnline) {
      orderBookInterval = setInterval(() => {
        try {
          if (marketPrice) {
            const newOrders = generateDummyOrders(marketPrice);
            setOrderBook(newOrders);
            
            const newBuyRatio = Math.floor(Math.random() * 40) + 10;
            setBuyRatio(newBuyRatio);
          }
        } catch (error) {
          console.error('Error updating order book:', error);
        }
      }, 3000);
    }
    
    return () => {
      if (orderBookInterval) {
        clearInterval(orderBookInterval);
      }
    };
  }, [isOnline, marketPrice]);

  // Define getPriceLevels function
  const getPriceLevels = (basePrice) => {
    if (basePrice >= 10000) {
        return { levels: 12, spread: 0.0005, randomRange: 0.0002 };
    } else if (basePrice >= 1000) {
        return { levels: 15, spread: 0.001, randomRange: 0.0003 };
    } else if (basePrice >= 100) {
        return { levels: 18, spread: 0.002, randomRange: 0.0005 };
    } else if (basePrice >= 10) {
        return { levels: 20, spread: 0.003, randomRange: 0.001 };
    } else if (basePrice >= 1) {
        return { levels: 22, spread: 0.005, randomRange: 0.0015 };
    } else if (basePrice >= 0.1) {
        return { levels: 25, spread: 0.01, randomRange: 0.002 };
    } else {
        return { levels: 25, spread: 0.02, randomRange: 0.004 };
    }
  };

  return (
    <TradingContainer>
      <TradingGrid>
        <ChartSection>
          <TradingChartComponent
            cryptoData={cryptoData}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            chartKey={chartKey}
            setChartKey={setChartKey}
            theme={theme}
            currentPrice={currentPrice}
            setCurrentPrice={setCurrentPrice}
            orderType={orderType}
            setOrderType={setOrderType}
            amount={amount}
            setAmount={setAmount}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            leverage={leverage}
            setLeverage={setLeverage}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            positions={positions}
            setPositions={setPositions}
            userPnL={userPnL}
            setUserPnL={setUserPnL}
            error={error}
            setError={setError}
            userBalance={userBalance}
            setUserBalance={setUserBalance}
            isOnline={isOnline}
            setIsOnline={setIsOnline}
            isPending={isPending}
            setIsPending={setIsPending}
            openPositions={openPositions}
            setOpenPositions={setOpenPositions}
            closedPositions={closedPositions}
            setClosedPositions={setClosedPositions}
            pendingLimitOrders={pendingLimitOrders}
            setPendingLimitOrders={setPendingLimitOrders}
            inputKey={inputKey}
            setInputKey={setInputKey}
            lastPrice={lastPrice}
            setLastPrice={setLastPrice}
            marketPrice={marketPrice}
            setMarketPrice={setMarketPrice}
            closingPositionId={closingPositionId}
            setClosingPositionId={setClosingPositionId}
            isLoadingPositions={isLoadingPositions}
            setIsLoadingPositions={setIsLoadingPositions}
            isLoadingBalance={isLoadingBalance}
            setIsLoadingBalance={setIsLoadingBalance}
            priceData={priceData}
            setPriceData={setPriceData}
            recentTrades={recentTrades}
            setRecentTrades={setRecentTrades}
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            buyRatio={buyRatio}
            setBuyRatio={setBuyRatio}
            orderBookFlash={orderBookFlash}
            setOrderBookFlash={setOrderBookFlash}
            orderBook={orderBook}
            setOrderBook={setOrderBook}
            lastCheckedPrice={lastCheckedPrice}
            setLastCheckedPrice={setLastCheckedPrice}
            ordersBeingExecuted={ordersBeingExecuted}
            setOrdersBeingExecuted={setOrdersBeingExecuted}
            editingOrderId={editingOrderId}
            setEditingOrderId={setEditingOrderId}
            editTargetPrice={editTargetPrice}
            setEditTargetPrice={setEditTargetPrice}
            isPriceConsistent={isPriceConsistent}
            setIsPriceConsistent={setIsPriceConsistent}
            lastVerifiedPrices={lastVerifiedPrices}
            setLastVerifiedPrices={setLastVerifiedPrices}
            isInitializing={isInitializing}
            setIsInitializing={setIsInitializing}
          />
        </ChartSection>
        <RightSection>
          <LightweightChartComponent
            cryptoData={cryptoData}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            chartKey={chartKey}
            setChartKey={setChartKey}
            theme={theme}
            currentPrice={currentPrice}
            setCurrentPrice={setCurrentPrice}
            orderType={orderType}
            setOrderType={setOrderType}
            amount={amount}
            setAmount={setAmount}
            orderMode={orderMode}
            setOrderMode={setOrderMode}
            leverage={leverage}
            setLeverage={setLeverage}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            positions={positions}
            setPositions={setPositions}
            userPnL={userPnL}
            setUserPnL={setUserPnL}
            error={error}
            setError={setError}
            userBalance={userBalance}
            setUserBalance={setUserBalance}
            isOnline={isOnline}
            setIsOnline={setIsOnline}
            isPending={isPending}
            setIsPending={setIsPending}
            openPositions={openPositions}
            setOpenPositions={setOpenPositions}
            closedPositions={closedPositions}
            setClosedPositions={setClosedPositions}
            pendingLimitOrders={pendingLimitOrders}
            setPendingLimitOrders={setPendingLimitOrders}
            inputKey={inputKey}
            setInputKey={setInputKey}
            lastPrice={lastPrice}
            setLastPrice={setLastPrice}
            marketPrice={marketPrice}
            setMarketPrice={setMarketPrice}
            closingPositionId={closingPositionId}
            setClosingPositionId={setClosingPositionId}
            isLoadingPositions={isLoadingPositions}
            setIsLoadingPositions={setIsLoadingPositions}
            isLoadingBalance={isLoadingBalance}
            setIsLoadingBalance={setIsLoadingBalance}
            priceData={priceData}
            setPriceData={setPriceData}
            recentTrades={recentTrades}
            setRecentTrades={setRecentTrades}
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            buyRatio={buyRatio}
            setBuyRatio={setBuyRatio}
            orderBookFlash={orderBookFlash}
            setOrderBookFlash={setOrderBookFlash}
            orderBook={orderBook}
            setOrderBook={setOrderBook}
            lastCheckedPrice={lastCheckedPrice}
            setLastCheckedPrice={setLastCheckedPrice}
            ordersBeingExecuted={ordersBeingExecuted}
            setOrdersBeingExecuted={setOrdersBeingExecuted}
            editingOrderId={editingOrderId}
            setEditingOrderId={setEditingOrderId}
            editTargetPrice={editTargetPrice}
            setEditTargetPrice={setEditTargetPrice}
            isPriceConsistent={isPriceConsistent}
            setIsPriceConsistent={setIsPriceConsistent}
            lastVerifiedPrices={lastVerifiedPrices}
            setLastVerifiedPrices={setLastVerifiedPrices}
            isInitializing={isInitializing}
            setIsInitializing={setIsInitializing}
          />
        </RightSection>
      </TradingGrid>
    </TradingContainer>
  );
};

export default Trading;
const LoginPrompt = styled.div`
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
`;

const StyledButton = styled.button`
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

const StatusMessage = styled.div`
  color: ${props => props.error ? '#F6465D' : '#0ECB81'};
  padding: 8px;
  text-align: center;
  background: ${props => props.error ? 'rgba(246, 70, 93, 0.1)' : 'rgba(14, 203, 129, 0.1)'};
  border-radius: 4px;
  margin-bottom: 16px;
`;

// Add these new styled components for the professional order book
const OrderBookArrow = styled.span`
  color: ${props => props.$direction === 'up' ? '#0ECB81' : '#F6465D'};
  margin-right: 4px;
  font-size: 14px;
`;

const OrderBookFlag = styled.span`
  color: #F0B90B;
  margin-left: 4px;
  font-size: 12px;
`;

const OrderBookRatio = styled.div`
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

const RatioIndicator = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 0 8px;
  align-items: center;
  
  span {
    font-size: 12px;
    font-weight: 500;
    padding: 3px 6px;
    border-radius: 4px;
    
    &:first-child {
      background: rgba(14, 203, 129, 0.3);
      color: #0ECB81;
    }
    
    &:last-child {
      background: rgba(246, 70, 93, 0.3);
      color: #F6465D;
    }
  }
`;

export default Trading; const TradeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 8px;
  font-size: 12px;
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(${props => props.$isBuy ? '-10px' : '10px'});
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  & > span {
    &:first-child {
      color: ${props => props.$isBuy ? '#0ECB81' : '#F6465D'};
    }
    &:nth-child(2),
    &:last-child {
      text-align: right;
    }
  }
`;

// Add these styled components after the existing styled components
const OrderBookContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
