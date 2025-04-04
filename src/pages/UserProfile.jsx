import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import Sale01 from '../components/sale/Sale01';
import { auth } from '../firebase';
import { 
    updateProfile, 
    signOut, 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    updatePassword 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
    getDoc, 
    doc, 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    serverTimestamp,
    setDoc,
    deleteDoc,
    addDoc,
    writeBatch,
    limit,
    increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import img from '../assets/images/avt/avt.png'
import axios from 'axios';
import styled from 'styled-components';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import PageTitle from '../components/pagetitle';

import btcLogo from '../assets/images/coin/btc.png';
import ethLogo from '../assets/images/coin/eth.png';
import usdtLogo from '../assets/images/coin/usdt.png';
import { DEFAULT_COINS } from '../utils/constants';
import ConvertModal from '../components/ConvertModal';
import DepositButton from '../components/DepositButton';
import { tradingService } from '../services/tradingService';
import { referralService } from '../services/referralService';
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
import ripplexLogo from '../assets/images/logo/logo.png'; // Import Ripple Exchange logo for RIPPLEX token
import { fetchBalances, updateTokenBalance } from '../services/balanceService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

UserProfile.propTypes = {
    
};

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
  ATOM: atomLogo,
  RIPPLEX: ripplexLogo // Add RIPPLEX token logo
};

const AnimatedBorder = styled.div`
  position: relative;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(
    60deg,
    #f79533,
    #f37055,
    #ef4e7b,
    #a166ab,
    #5073b8,
    #1098ad,
    #07b39b,
    #6fba82
  );
  background-size: 300% 300%;
  animation: animatedgradient 6s ease infinite;
  
  &:before {
    content: '';
    position: absolute;
    inset: 1px;
    background: #1a1b23;
    border-radius: 15px;
    z-index: 0;
  }
  
  @media (max-width: 768px) {
    border-radius: 12px;
    
    &:before {
      border-radius: 11px;
    }
  }
`;

const GalaxyBackground = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  
  &:before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(74,107,243,0.1) 0%, rgba(0,0,0,0) 70%);
    animation: rotate 20s linear infinite;
  }

  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(42,42,60,0.95) 0%, rgba(30,30,45,0.95) 100%);
  }

  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ProfileContainer = styled.div`
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  
  @media (max-width: 992px) {
    grid-template-columns: 250px 1fr;
    gap: 15px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const ProfileSidebar = styled.div`
  background: rgba(26, 27, 35, 0.6);
  border-radius: 16px;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 15px;
    border-radius: 12px;
  }
`;

const ProfileContent = styled.div`
  background: rgba(26, 27, 35, 0.6);
  border-radius: 16px;
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 15px;
    border-radius: 12px;
  }
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 20px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    width: 80px;
    height: 80px;
    margin-bottom: 10px;
  }
`;

const ProfileName = styled.h2`
  font-size: 24px;
  color: #fff;
  text-align: center;
  margin-bottom: 10px;
  
  @media (max-width: 768px) {
    font-size: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: 18px;
  }
`;

const ProfileEmail = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 20px;
  
  @media (max-width: 480px) {
    font-size: 12px;
    margin-bottom: 15px;
  }
`;

const ProfileMenu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ProfileMenuItem = styled.li`
  margin-bottom: 10px;
  
  a, button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 15px;
    border-radius: 8px;
    color: #fff;
    text-decoration: none;
    transition: all 0.3s;
    background: ${props => props.$active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-size: 16px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
  
  @media (max-width: 768px) {
    margin-bottom: 8px;
    
    a, button {
      padding: 10px 12px;
      font-size: 14px;
    }
  }
`;

const WalletCard = styled.div`
  background: rgba(26, 27, 35, 0.8);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    padding: 12px;
    margin-bottom: 15px;
  }
`;

const WalletHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  h3 {
    font-size: 18px;
    color: #fff;
    margin: 0;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 12px;
    
    h3 {
      font-size: 16px;
    }
  }
`;

const WalletBalance = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 15px;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 12px;
  }
`;

const WalletActions = styled.div`
  display: flex;
  gap: 10px;
  
  button {
    flex: 1;
    padding: 10px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
  
  @media (max-width: 768px) {
    gap: 8px;
    
    button {
      padding: 8px;
      font-size: 14px;
    }
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const AssetList = styled.div`
  margin-top: 20px;
  
  @media (max-width: 768px) {
    margin-top: 15px;
  }
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    padding: 10px 0;
  }
`;

const AssetInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  
  img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }
  
  @media (max-width: 768px) {
    gap: 8px;
    
    img {
      width: 24px;
      height: 24px;
    }
  }
`;

const AssetName = styled.div`
  h4 {
    font-size: 16px;
    color: #fff;
    margin: 0 0 4px;
  }
  
  p {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
  
  @media (max-width: 768px) {
    h4 {
      font-size: 14px;
      margin: 0 0 2px;
    }
    
    p {
      font-size: 11px;
    }
  }
`;

const AssetValue = styled.div`
  text-align: right;
  
  h4 {
    font-size: 16px;
    color: #fff;
    margin: 0 0 4px;
  }
  
  p {
    font-size: 12px;
    color: ${props => props.$isPositive ? '#0ECB81' : '#F6465D'};
    margin: 0;
  }
  
  @media (max-width: 768px) {
    h4 {
      font-size: 14px;
      margin: 0 0 2px;
    }
    
    p {
      font-size: 11px;
    }
  }
`;

// Add additional responsive styling for the tabs and mobile view

// Update TabList styling for better mobile display
const StyledTabs = styled(Tabs)`
  position: relative;
  
  .react-tabs__tab-list {
    display: flex;
    flex-wrap: wrap;
    border-bottom: none;
    margin: 0;
    padding: 0 16px;
    position: relative;
    background: rgba(26, 27, 35, 0.6);
    border-radius: 16px 16px 0 0;
    gap: 8px;
    z-index: 5; /* Ensure tabs are above the animated border */
    justify-content: center; /* Center tabs by default */
  }
  
  .react-tabs__tab {
    display: inline-block;
    border: none;
    border-bottom: none;
    position: relative;
    list-style: none;
    padding: 16px 20px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s;
    font-weight: 500;
    background: transparent;
    border-radius: 8px 8px 0 0;
    z-index: 10; /* Ensure tab text is above highlight circle */
    
    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .react-tabs__tab--selected {
    background: transparent;
    border-color: transparent;
      color: #fff;
    font-weight: 600;
    
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 3px;
      background: linear-gradient(to right, #FF9900, #FFB800);
      border-radius: 3px;
    }
    
    /* Add the orange circle highlight behind the selected tab */
    &:before {
      content: '';
      position: absolute;
      width: 120%;
      height: 120%;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(255, 153, 0, 0.2) 0%, rgba(255, 153, 0, 0) 70%);
      border-radius: 50%;
      z-index: -1;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% {
        opacity: 0.5;
        transform: translate(-50%, -50%) scale(0.9);
      }
      50% {
        opacity: 0.8;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0.5;
        transform: translate(-50%, -50%) scale(0.9);
      }
    }
  }
  
  .react-tabs__tab:focus {
    box-shadow: none;
    outline: none;
  }
  
  .react-tabs__tab-panel {
    display: none;
    width: 100%;
  }
  
  .react-tabs__tab-panel--selected {
    display: block;
    animation: fadeIn 0.5s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @media (max-width: 768px) {
    .react-tabs__tab-list {
      padding: 0 12px;
      gap: 4px;
      justify-content: center; /* Keep centered on mobile */
      flex-wrap: wrap; /* Allow wrapping instead of scroll */
      overflow-x: visible;
    }
    
    .react-tabs__tab {
      padding: 12px 16px;
      white-space: nowrap;
      flex: 0 1 auto; /* Allow tabs to shrink */
    }
    
    .react-tabs__tab--selected:before {
      /* Adjust the orange circle highlight for mobile */
      width: 110%;
      height: 110%;
      opacity: 0.7;
    }
  }
  
  @media (max-width: 480px) {
    .react-tabs__tab-list {
      padding: 0 8px;
      gap: 4px;
    }
    
    .react-tabs__tab {
      padding: 10px 12px;
      font-size: 14px;
    }
    
    .react-tabs__tab--selected:before {
      /* Adjust the orange circle highlight for smaller screens */
      width: 105%;
      height: 105%;
      opacity: 0.6;
    }
  }
`;

// Add a styled component for the custom page title
const CustomPageTitle = styled.div`
  padding: 40px 0 20px;
  text-align: center;
  
  h3 {
    font-size: 32px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 10px;
  }
  
  @media (max-width: 768px) {
    padding: 30px 0 15px;
    
    h3 {
      font-size: 28px;
    }
  }
  
  @media (max-width: 480px) {
    padding: 20px 0 10px;
    
    h3 {
      font-size: 24px;
    }
  }
`;

// Create a ProfileSection component for better organization
const ProfileSection = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 16px;
  }
`;

// Responsive form styling
const ResponsiveForm = styled.form`
  width: 100%;
  
  .form-group {
    margin-bottom: 20px;
    
    @media (max-width: 768px) {
      margin-bottom: 15px;
    }
  }
  
  .form-group.d-flex {
    display: flex;
    gap: 15px;
    
    @media (max-width: 576px) {
      flex-direction: column;
      gap: 10px;
    }
    
    .sl {
      flex: 1;
      
      @media (max-width: 576px) {
        width: 100%;
      }
    }
  }
  
  .form-control {
    width: 100%;
    padding: 12px 15px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    
    &:focus {
      outline: none;
      border-color: #4A6BF3;
    }
  }
  
  .btn-action {
    padding: 12px 20px;
    background: #4A6BF3;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      background: #3a5bd9;
    }
    
    @media (max-width: 576px) {
      width: 100%;
      padding: 14px;
    }
  }
`;

// Add responsive card component for various sections
const ResponsiveCard = styled.div`
  background: rgba(30, 30, 45, 0.7);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 12px;
  }
`;

// Add a keyframes for animations at the top with the other styled components
const keyframesStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes animatedgradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Enhance the ResponsiveTableWrapper styled component
const ResponsiveTableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
  
  table {
    min-width: 650px; /* Ensures table doesn't shrink too much */
  }
  
  @media (max-width: 768px) {
    margin: 0 -15px;
    width: calc(100% + 30px);
    
    table {
      min-width: 500px;
    }
    
    th, td {
      padding: 12px 10px !important;
      font-size: 13px !important;
    }
  }
  
  @media (max-width: 480px) {
    margin: 0 -10px;
    width: calc(100% + 20px);
    
    table {
      min-width: 450px;
    }
    
    th, td {
      padding: 10px 8px !important;
      font-size: 12px !important;
    }
  }
`;

// Add a responsive container for balance actions
const BalanceActionsContainer = styled.div`
  display: flex;
  gap: 10px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 8px;
    margin-top: 15px;
  }
  
  @media (max-width: 480px) {
    gap: 6px;
    margin-top: 12px;
  }
`;

// Add a styled action button for consistency
const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    width: 100%;
    padding: 12px;
  }
  
  @media (max-width: 480px) {
      font-size: 13px;
    padding: 10px;
  }
`;

// Add responsive container for the tab panels
const ContentInnerContainer = styled.div`
  padding: 20px;
  
  @media (max-width: 768px) {
    padding: 15px 10px;
  }
  
  @media (max-width: 480px) {
    padding: 12px 8px;
  }
`;

// Update the BalanceHeader styles
const BalanceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
  
  .balance-info {
    margin-bottom: 15px;
    
    h3 {
      @media (max-width: 480px) {
        font-size: 24px !important;
      }
    }
  }
`;

// Add a responsive grid for displaying multiple cards
const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

// Add responsive form group
const FormGroup = styled.div`
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 15px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 12px;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    
    @media (max-width: 480px) {
      font-size: 13px;
      margin-bottom: 6px;
    }
  }
`;

// Add responsive input group
const InputGroup = styled.div`
  display: flex;
  
  input {
    flex: 1;
    padding: 12px 15px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px 0 0 8px;
    color: #fff;
    
    &:focus {
      outline: none;
      border-color: #4A6BF3;
    }
  }
  
  button {
    padding: 0 15px;
    background: #4A6BF3;
    color: white;
    border: none;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
    
    &:hover {
      background: #3a5bd9;
    }
  }
  
  @media (max-width: 480px) {
    input {
      padding: 10px 12px;
      font-size: 13px;
    }
    
    button {
      padding: 0 10px;
      font-size: 13px;
    }
  }
`;

// Update the section styling to ensure proper stacking
const ProfileSectionContainer = styled.section`
  background: rgba(26, 27, 35, 0.6);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
  
  @media (max-width: 768px) {
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 16px;
  }
`;

// Add a styled component for the user info section
const UserInfoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: linear-gradient(135deg, rgba(26, 27, 35, 0.9) 0%, rgba(30, 31, 42, 0.9) 100%);
  border-radius: 16px;
  margin-bottom: 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 20px;
    gap: 15px;
  }
  
  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 20px 15px;
    
    .premium-badge {
      margin-left: 0 !important;
      margin-top: 15px;
    }
  }
`;

// Add a styled component for the avatar container
const AvatarContainer = styled.div`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #FF9900;
  box-shadow: 0 0 20px rgba(255, 153, 0, 0.3);
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  @media (max-width: 600px) {
    width: 80px;
    height: 80px;
  }
`;

// Add a styled component for the shine effect
const ShineEffect = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 45%, rgba(255, 255, 255, 0.1) 50%, transparent 55%);
  animation: shine 3s infinite;
  z-index: 2;
  
  @keyframes shine {
    0% {
      transform: translateX(-100%) rotate(45deg);
    }
    20%, 100% {
      transform: translateX(100%) rotate(45deg);
    }
  }
`;

// Improve the CryptoSelectContainer styling for better icon display
const CryptoSelectContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 20px;
    
    @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

// Enhance the CryptoOption styling for better icon display
const CryptoOption = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 16px 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    
    img {
        width: 40px;
        height: 40px;
        margin-bottom: 12px;
        border-radius: 50%;
        object-fit: contain;
        background-color: rgba(0, 0, 0, 0.2);
        padding: 5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    span {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
    }
    
    &:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }
`;

// Define a high z-index Modal component
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    useEffect(() => {
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);
    
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 99999,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#1a1b23',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '480px',
                    padding: '24px',
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '24px',
                        cursor: 'pointer',
                    }}
                    onClick={onClose}
                >
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
};

function UserProfile(props) {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({});
    const [balances, setBalances] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // Added missing success state variable
    const [displayName, setDisplayName] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [userId, setUserId] = useState('');
    const [avatar, setAvatar] = useState(img);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Admin state variables
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedToken, setSelectedToken] = useState('');
    const [amount, setAmount] = useState('');
    const [categories, setCategories] = useState(['All', 'Popular', 'Recently added', 'Trending', 'Memes']);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [categoryTokens, setCategoryTokens] = useState({});
    const [loadingCategories, setLoadingCategories] = useState(false);
    
    // Define checkAdminStatusOnMount function
    const checkAdminStatusOnMount = async () => {
        if (auth.currentUser) {
            try {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                setIsAdmin(userDoc.exists() && (userDoc.data()?.role === 'admin' || userDoc.data()?.isAdmin === true));
            } catch (error) {
                console.error('Error checking admin status:', error);
                setIsAdmin(false);
            }
        }
    };
    
    const [dataCoinTab] = useState([
        {
            id: 1,
            title: 'User Profile',
            icon: 'fa-user'
        },
        {
            id: 2,
            title: 'Balances',
            icon: 'fa-wallet'
        },
        {
            id: 3,
            title: 'Bonus',
            icon: 'fa-gift'
        },
        {
            id: 4,
            title: 'Referrals',
            icon: 'fa-share-nodes'
        },
        {
            id: 5,
            title: '2FA',
            icon: 'fa-barcode'
        },
        {
            id: 6,
            title: 'Change password',
            icon: 'fa-lock'
        },
    ]);

    const [positions, setPositions] = useState([]);
    const [totalPnL, setTotalPnL] = useState(0);
    const [tokenPrices, setTokenPrices] = useState(() => {
        // Try to load previous prices from localStorage
        const savedPrices = localStorage.getItem('tokenPrices');
        const defaultPrices = {
            RIPPLEX: 1, // Fixed price for RIPPLEX
            BTC: 60000, // Default fallback prices
            ETH: 3000,
            XRP: 0.5,
            ADA: 0.4,
            DOGE: 0.1,
            SOL: 100,
            BNB: 300,
            MATIC: 1,
            DOT: 5,
            AVAX: 30,
            LINK: 15,
            UNI: 7,
            ATOM: 10,
            USDT: 1
        };
        
        return savedPrices ? { ...defaultPrices, ...JSON.parse(savedPrices) } : defaultPrices;
    });
    const [editBalance, setEditBalance] = useState({ token: '', amount: '' });
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [bonusAccount, setBonusAccount] = useState(null);
    const [loadingBonus, setLoadingBonus] = useState(true);
    const [referralData, setReferralData] = useState(null);
    const [loadingReferrals, setLoadingReferrals] = useState(true);
    const [copySuccess, setCopySuccess] = useState('');

    // Add these state hooks at the top level of your component (with other useState declarations)
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendData, setSendData] = useState({
        recipientEmail: '',
        token: '',
        amount: '',
    });
    const [recipientValidation, setRecipientValidation] = useState({
        loading: false,
        exists: false,
        message: '',
    });

    // Add a new state variable for the success animation
    const [showTransferSuccess, setShowTransferSuccess] = useState(false);
    const [transferSuccessDetails, setTransferSuccessDetails] = useState({ amount: '', token: '', recipient: '' });

    // Add a new state variable for the send modal loading state
    const [sendModalLoading, setSendModalLoading] = useState(false);

    const calculateTotalBalance = useMemo(() => {
        return Object.entries(balances).reduce((total, [asset, balance]) => {
            // Use a fixed price of $1 for RIPPLEX token
            const price = asset === 'RIPPLEX' ? 1 : (tokenPrices[asset] || 0);
            const usdValue = balance * price;
            return total + usdValue;
        }, 0);
    }, [balances, tokenPrices]);

    // Check if user is authenticated
    useEffect(() => {
        let safetyTimeout; // Declare variable at the top level of useEffect
        
        if (auth.currentUser) {
            setUserId(auth.currentUser.uid);
            
            // Define variables to track loading process
            let userDataLoaded = false;
            let balancesLoaded = false;
            
            // Safety timeout to prevent infinite loading
            safetyTimeout = setTimeout(() => {
                if (loading) {
                    console.log("Safety timeout triggered - forcing loading state to false");
                    setLoading(false);
                }
            }, 10000); // 10 seconds timeout
            
            // Check admin status and user status
            checkAdminStatusOnMount().catch(err => {
                console.error("Error checking admin status:", err);
            });
            
            // Fetch authenticated user's data
            const fetchUserData = async () => {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    const userSnapshot = await getDoc(userRef);
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.data();
                        setUserData(userData);
                        setDisplayName(userData.displayName || '');
                        setIsPremium(userData.isPremium || false);
                        
                        const storedAvatar = userData.avatar || auth.currentUser.photoURL;
                        if (storedAvatar) {
                            setAvatar(storedAvatar);
                        }
                        
                        // If user has balances in their user document, use them as initial values
                        if (userData.balances) {
                            setBalances(userData.balances);
                        }
                        
                        // For any information tied to 2FA
                        await checkTwoFactorStatus(auth.currentUser.uid);
                    }
                    userDataLoaded = true;
                    // If balances are already loaded, we can set loading to false
                    if (balancesLoaded) {
                      setLoading(false);
                    } else {
                      // Set loading to false after getting user data anyway
                      // This will allow the UI to render with partial data
                      setTimeout(() => setLoading(false), 500);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Failed to fetch user data');
                    setLoading(false); // Always set loading to false on error
                }
            };
            
            fetchUserData().catch(err => {
              console.error("Error in fetchUserData:", err);
              setLoading(false);
            });
            
            // Fetch users for admin
            if (isAdmin) {
                const fetchUsers = async () => {
                    try {
                        const usersCollection = collection(db, 'users');
                        const usersSnapshot = await getDocs(usersCollection);
                        const usersData = usersSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        setUsers(usersData);
                    } catch (error) {
                        console.error('Error fetching users:', error);
                    }
                };
                fetchUsers().catch(err => {
                  console.error("Error in fetchUsers:", err);
                });
            }

            // Use the imported fetchBalances function to get user balances
            const getUserBalances = async () => {
                try {
                    console.log("Initializing balances for user:", auth.currentUser.uid);
                    const userBalances = await fetchBalances(auth.currentUser.uid);
                    setBalances(userBalances);
                    
                    // Also check for any airdrop claims
                    const airdropRef = doc(db, 'airdrops', auth.currentUser.uid);
                    const airdropDoc = await getDoc(airdropRef);
                    
                    if (airdropDoc.exists() && airdropDoc.data().completed) {
                        console.log("User has completed airdrop, checking balance");
                        
                        // If RIPPLEX is missing or 0 but airdrop was completed, add 100 RIPPLEX
                        if (!userBalances.RIPPLEX || userBalances.RIPPLEX === 0) {
                            console.log("Adding missing RIPPLEX tokens from completed airdrop");
                            const updated = await updateTokenBalance(auth.currentUser.uid, 'RIPPLEX', 100);
                            
                            if (updated) {
                                // Update local state
                                setBalances(prev => ({
                                    ...prev,
                                    RIPPLEX: 100
                                }));
                                
                                toast.success("Added 100 RIPPLEX tokens from your completed airdrop!");
                            }
                        }
                    }
                    balancesLoaded = true;
                    // If user data is already loaded, we can set loading to false
                    if (userDataLoaded) {
                      setLoading(false);
                    }
                } catch (error) {
                    console.error('Error fetching balances:', error);
                    setError('Failed to fetch balances');
                    setLoading(false); // Always set loading to false on error
                }
            };

            getUserBalances().catch(err => {
              console.error("Error in getUserBalances:", err);
              setLoading(false);
            });
        } else {
            // If no user is authenticated, redirect to login and set loading to false
            console.log("No authenticated user, redirecting to login");
            setLoading(false);
            navigate('/login');
        }
        
        // Return cleanup function to clear the timeout
        return () => {
            if (safetyTimeout) {
                clearTimeout(safetyTimeout);
            }
        };
    }, []);

    // Fetch all users for admin
    useEffect(() => {
        if (isAdmin) {
            const fetchUsers = async () => {
                try {
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const usersData = usersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        email: doc.data().email,
                        balances: doc.data().balances || {}
                    }));
                    setUsers(usersData);
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            };
            fetchUsers();
        }
    }, [isAdmin]);

    // Initialize or update user balances
    const initializeUserBalances = async (userId) => {
        try {
            console.log("Initializing balances for user:", userId);
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                console.log("User document exists, updating balances");
                const currentBalances = userDoc.data().balances || {};
                const updatedBalances = {};
                
                // Initialize all coins with 0 if they don't exist
                Object.keys(DEFAULT_COINS).forEach(coin => {
                    updatedBalances[coin] = currentBalances[coin] || 0;
                });
                
                // Make sure RIPPLEX is initialized even if it wasn't in DEFAULT_COINS before
                if (!('RIPPLEX' in updatedBalances)) {
                    console.log("Adding RIPPLEX token to user's balances");
                    updatedBalances['RIPPLEX'] = 0;
                }
                
                // Check if we need to update the database (if any coins were added)
                const needsUpdate = Object.keys(updatedBalances).some(coin => !(coin in currentBalances));
                
                if (needsUpdate) {
                    // Update the user document with complete balance set
                    try {
                        await updateDoc(userRef, {
                            balances: updatedBalances,
                            updatedAt: serverTimestamp()
                        });
                        console.log("Updated user balances in Firestore with missing coins");
                    } catch (updateError) {
                        console.error("Error updating balances in Firestore:", updateError);
                        // Return the balances anyway even if we couldn't update Firestore
                    }
                } else {
                    console.log("No new coins to add to user's balances");
                }
                
                return updatedBalances;
            } else {
                console.log("User document doesn't exist, creating default balances");
                // If user doc doesn't exist, create default balances
                const defaultBalances = {};
                Object.keys(DEFAULT_COINS).forEach(coin => {
                    defaultBalances[coin] = 0;
                });
                
                // Explicitly ensure RIPPLEX is included
                defaultBalances['RIPPLEX'] = 0;
                
                // Try to create a user document with default balances
                try {
                    await setDoc(userRef, {
                        email: auth.currentUser.email,
                        displayName: auth.currentUser.displayName || '',
                        balances: defaultBalances,
                        createdAt: serverTimestamp(),
                        emailVerified: true
                    });
                    console.log("Created new user document with default balances including RIPPLEX");
                } catch (setError) {
                    console.error("Error creating user document with balances:", setError);
                }
                
                return defaultBalances;
            }
        } catch (error) {
            console.error('Error initializing balances:', error);
            // Return empty balances object as fallback
            const fallbackBalances = {};
            Object.keys(DEFAULT_COINS).forEach(coin => {
                fallbackBalances[coin] = 0;
            });
            // Ensure RIPPLEX is included even in fallback
            fallbackBalances['RIPPLEX'] = 0;
            return fallbackBalances;
        }
    };

    // Modified balance fetching
    useEffect(() => {
        if (auth.currentUser) {
            const fetchBalances = async () => {
                try {
                    // Always initialize balances to ensure newest tokens are included
                    const updatedBalances = await initializeUserBalances(auth.currentUser.uid);
                    setBalances(updatedBalances);
                    
                    // Also check for any airdrop claims
                    const airdropRef = doc(db, 'airdrops', auth.currentUser.uid);
                    const airdropDoc = await getDoc(airdropRef);
                    
                    if (airdropDoc.exists() && airdropDoc.data().completed) {
                        console.log("User has completed airdrop, checking balance");
                        // Explicitly check if the user has the RIPPLEX token in their balance
                        const userRef = doc(db, 'users', auth.currentUser.uid);
                        const userDoc = await getDoc(userRef);
                        
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            const userBalances = userData.balances || {};
                            
                            // If RIPPLEX is missing or 0 but airdrop was completed, add 100 RIPPLEX
                            if (!userBalances.RIPPLEX || userBalances.RIPPLEX === 0) {
                                console.log("Adding missing RIPPLEX tokens from completed airdrop");
                                await updateDoc(userRef, {
                                    'balances.RIPPLEX': 100
                                });
                                
                                // Update local state
                                setBalances(prev => ({
                                    ...prev,
                                    RIPPLEX: 100
                                }));
                                
                                toast.success("Added 100 RIPPLEX tokens from your completed airdrop!");
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching balances:', error);
                    setError('Failed to fetch balances');
                }
            };

            fetchBalances();
        }
    }, []);

    // Function to fetch cryptocurrency prices
    const fetchPrices = async () => {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,cardano,dogecoin,solana,binancecoin,matic-network,polkadot,avalanche-2,chainlink,uniswap,cosmos&vs_currencies=usd');
            const data = await response.json();
            
            // Create a mapping from our token symbols to prices
            const prices = {
                ...tokenPrices, // Preserve existing prices, especially RIPPLEX
                BTC: data.bitcoin?.usd || tokenPrices.BTC,
                ETH: data.ethereum?.usd || tokenPrices.ETH,
                XRP: data.ripple?.usd || tokenPrices.XRP,
                ADA: data.cardano?.usd || tokenPrices.ADA,
                DOGE: data.dogecoin?.usd || tokenPrices.DOGE,
                SOL: data.solana?.usd || tokenPrices.SOL,
                BNB: data.binancecoin?.usd || tokenPrices.BNB,
                MATIC: data['matic-network']?.usd || tokenPrices.MATIC,
                DOT: data.polkadot?.usd || tokenPrices.DOT,
                AVAX: data['avalanche-2']?.usd || tokenPrices.AVAX,
                LINK: data.chainlink?.usd || tokenPrices.LINK,
                UNI: data.uniswap?.usd || tokenPrices.UNI,
                ATOM: data.cosmos?.usd || tokenPrices.ATOM,
                USDT: 1
            };
            
            // Save to localStorage for future use
            localStorage.setItem('tokenPrices', JSON.stringify(prices));
            
            setTokenPrices(prices);
        } catch (error) {
            console.error('Error fetching token prices:', error);
        }
    };

    useEffect(() => {
        if (auth.currentUser) {
            const checkAdminStatus = async () => {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                setIsAdmin(userDoc.data()?.isAdmin || false);
            };
            checkAdminStatus();
        }
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const user = auth.currentUser;
            if (user) {
                // Only update displayName, never update photoURL
                // This ensures the profile picture remains unchanged
                const updateData = {
                    displayName: userData.displayName || user.displayName
                };
                
                // Only call updateProfile if we have data to update
                if (updateData.displayName) {
                    await updateProfile(user, updateData);
                    
                    // Also update the user document in Firestore, but preserve the photoURL
                    const userDocRef = doc(db, 'users', user.uid);
                    await updateDoc(userDocRef, {
                        displayName: updateData.displayName,
                        updatedAt: serverTimestamp()
                    });
                    
                    setSuccess('Profile updated successfully!');
                    setTimeout(() => setSuccess(''), 3000);
                } else {
                    setError('No changes to update.');
                }
            }
        } catch (err) {
            setError(err.message);
            console.error('Error updating profile:', err);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (err) {
            setError(err.message);
            console.error('Error signing out:', err);
        }
    };

    // Remove image change functionality by making this a no-op function
    const handleImageChange = (e) => {
        // Do nothing - we don't want to allow image changes
        // This function is kept to avoid breaking any existing code
    };

    // Handle balance update for user profile
    const handleUpdateBalance = async () => {
        try {
            if (!selectedUser || !editBalance.token || !editBalance.amount) {
                toast.error('Please select a token and enter an amount');
                return;
            }
            
            // Get current user balances
            const userRef = doc(db, 'users', selectedUser);
            await updateDoc(userRef, {
                [`balances.${editBalance.token}`]: parseFloat(editBalance.amount),
                updatedAt: serverTimestamp()
            });
            
            toast.success(`Balance updated successfully`);
            
            // Reset form
            setEditBalance({ token: '', amount: '' });
            
            // Refresh user list
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email,
                balances: doc.data().balances || {}
            }));
            setUsers(usersData);
            
        } catch (error) {
            console.error('Error updating balance:', error);
            toast.error('Failed to update balance');
        }
    };

    // Add conversion handler
    const handleConvert = async (conversionData) => {
        try {
            const { fromCoin, toCoin, fromAmount, toAmount } = conversionData;
            
            // Update balances in Firestore
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const currentBalances = userDoc.data().balances;
                const updatedBalances = { ...currentBalances };
                
                // Deduct from source coin
                updatedBalances[fromCoin] = (currentBalances[fromCoin] || 0) - fromAmount;
                // Add to destination coin
                updatedBalances[toCoin] = (currentBalances[toCoin] || 0) + toAmount;

                // Update Firestore
                await updateDoc(userRef, {
                    balances: updatedBalances
                });

                // Update local state
                setBalances(updatedBalances);
                setSuccess('Conversion successful!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            setError('Failed to convert currencies');
        }
    };

    // Check if 2FA is enabled for this user
    const checkTwoFactorStatus = async (userId) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setIs2FAEnabled(userData.twoFactorEnabled || false);
            }
        } catch (error) {
            console.error('Error checking 2FA status:', error);
        }
    };
    
    // Send verification code for 2FA
    const sendTwoFactorVerificationCode = async () => {
        try {
            setLoading(true);
            setError('');
            
            if (!userData.email) {
                setError('Email not found');
                return;
            }
            
            // Import dynamically to avoid server-side issues
            const { generateVerificationCode, sendVerificationEmail } = await import('../utils/emailService');
            
            // Generate a 6-digit code
            const code = generateVerificationCode();
            setSentVerificationCode(code);
            
            // Send the code via email
            await sendVerificationEmail(userData.email, code);
            
            setSuccess('Verification code sent to your email');
            setTimeout(() => setSuccess(''), 5000);
        } catch (error) {
            console.error('Error sending verification code:', error);
            setError('Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    // Verify the code and enable/disable 2FA
    const handleToggle2FA = async () => {
        try {
            setLoading(true);
            setError('');
            
            if (verificationCode !== sentVerificationCode) {
                setError('Invalid verification code');
                setLoading(false);
                return;
            }
            
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
                twoFactorEnabled: !is2FAEnabled,
                twoFactorUpdatedAt: serverTimestamp()
            });
            
            // Send email confirmation of 2FA status change
            const { send2FAStatusChangeEmail } = await import('../utils/emailService');
            await send2FAStatusChangeEmail(userData.email, !is2FAEnabled);
            
            setIs2FAEnabled(!is2FAEnabled);
            setSuccess(`Two-factor authentication ${!is2FAEnabled ? 'enabled' : 'disabled'} successfully`);
            
            // Reset verification code fields
            setVerificationCode('');
            setSentVerificationCode('');
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            setError('Failed to update 2FA settings');
        } finally {
            setLoading(false);
        }
    };
    
    // Handle password change
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            setError('');
            
            // Validate passwords
            if (newPassword !== confirmPassword) {
                setError("New passwords don't match");
                return;
            }
            
            if (newPassword.length < 6) {
                setError("Password must be at least 6 characters");
                return;
            }
            
            // Reauthenticate with Firebase
            const user = auth.currentUser;
            const credential = EmailAuthProvider.credential(
                user.email,
                oldPassword
            );
            
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
            
            // Send confirmation email
            const { sendPasswordChangeConfirmation } = await import('../utils/emailService');
            await sendPasswordChangeConfirmation(user.email);
            
            // Reset form
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            setSuccess('Password updated successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error changing password:', error);
            
            if (error.code === 'auth/wrong-password') {
                setError('Current password is incorrect');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later');
            } else {
                setError('Failed to change password: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Add functions to fetch bonus and referral data
    const fetchBonusAccount = async () => {
        if (!auth.currentUser) return;
        
        try {
            setLoadingBonus(true);
            const bonusData = await tradingService.getUserBonusAccount(auth.currentUser.uid);
            setBonusAccount(bonusData);
        } catch (error) {
            console.error('Error fetching bonus account:', error);
        } finally {
            setLoadingBonus(false);
        }
    };

    // Update the fetchReferralData function to ensure it correctly loads referral data
    const fetchReferralData = async () => {
        try {
            setLoadingReferrals(true);
            
            // Check if user has a referral code, if not generate one
            if (!userData.referralCode) {
                try {
                    const newReferralCode = await referralService.generateReferralCode(auth.currentUser.uid);
                    console.log("Generated new referral code:", newReferralCode);
                    
                    // Update local userData state with the new code
                    setUserData(prev => ({
                        ...prev,
                        referralCode: newReferralCode
                    }));
                } catch (codeError) {
                    console.error("Error generating referral code:", codeError);
                }
            }
            
            // Fetch full referral stats
            try {
            const referralStats = await referralService.getReferralStats(auth.currentUser.uid);
                console.log("Fetched referral data:", referralStats);
                
                if (referralStats) {
            setReferralData(referralStats);
                    
                    // Update copy success state to show feedback when user copies link
                    setCopySuccess('');
                }
            } catch (statsError) {
                console.error("Error fetching referral stats:", statsError);
                toast.error("Could not load your referral statistics. Please try again later.");
            }
        } catch (error) {
            console.error("Error in referral dashboard:", error);
            toast.error("Could not load referral data. Please refresh the page and try again.");
        } finally {
            setLoadingReferrals(false);
        }
    };

    // Function to get the current referral link based on the user's code
    const getReferralLink = () => {
        if (!userData?.referralCode) {
            return `${window.location.origin}/register?ref=${auth.currentUser?.uid || ''}`;
        }
        return `${window.location.origin}/register?ref=${userData.referralCode}`;
    };

    // Update the copy referral link function for better user feedback
    const handleCopyReferralLink = async () => {
        try {
            const link = getReferralLink();
            await navigator.clipboard.writeText(link);
            setCopySuccess('Copied!');
            toast.success("Referral link copied to clipboard!");
            
            // Reset the success message after 2 seconds
            setTimeout(() => {
                setCopySuccess('Copy Referral Link');
            }, 2000);
        } catch (error) {
            console.error("Failed to copy:", error);
            toast.error("Failed to copy link. Please try again.");
        }
    };

    // Add useEffect to load bonus and referral data
    useEffect(() => {
        if (auth.currentUser) {
            fetchBonusAccount();
            fetchReferralData();
        }
    }, []);

    // Format wallet address for display

    // Fetch token prices periodically
    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 60000); // Update prices every minute
        return () => clearInterval(interval);
    }, []);
         
    // Admin function to update user balances
    const handleAdminUpdateBalance = async (action) => {
        if (!selectedUser || !selectedToken || !amount) {
            toast.error('Please select a user, token, and enter an amount');
            return;
        }
        
        try {
            const userRef = doc(db, 'users', selectedUser);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                toast.error('User document not found');
                return;
            }
            
            const userData = userDoc.data();
            const currentBalances = userData.balances || {};
            const currentAmount = currentBalances[selectedToken] || 0;
            
            let newAmount = currentAmount;
            
            if (action === 'add') {
                newAmount = currentAmount + parseFloat(amount);
            } else if (action === 'subtract') {
                newAmount = Math.max(0, currentAmount - parseFloat(amount));
            }
            
            // Update the user's balance
            await updateDoc(userRef, {
                [`balances.${selectedToken}`]: newAmount,
                updatedAt: serverTimestamp()
            });
            
            toast.success(`Successfully ${action === 'add' ? 'added' : 'subtracted'} ${amount} ${selectedToken} for user`);
            
            // Refresh user list to show updated balances
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersData = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email,
                balances: doc.data().balances || {}
            }));
            setUsers(usersData);
            
            // Reset form
            setAmount('');
            
        } catch (error) {
            console.error('Error updating user balance:', error);
            toast.error('Failed to update balance: ' + error.message);
        }
    };

    // Add new function for handling token category management
    const handleAssignCategory = async () => {
        if (!selectedToken || !selectedCategory) {
            toast.error('Please select both a token and a category');
            return;
        }
        
        try {
            const categoriesRef = doc(db, 'settings', 'categories');
            
            // First, check if the document exists
            const categoriesDoc = await getDoc(categoriesRef);
            
            let updatedTokenCategories = {};
            
            if (categoriesDoc.exists()) {
                const data = categoriesDoc.data();
                updatedTokenCategories = data.tokenCategories || {};
            }
            
            // Update or add the token to the selected category
            if (!updatedTokenCategories[selectedCategory]) {
                updatedTokenCategories[selectedCategory] = [];
            }
            
            // Check if token is already in the category
            if (!updatedTokenCategories[selectedCategory].includes(selectedToken)) {
                updatedTokenCategories[selectedCategory].push(selectedToken);
            }
            
            // Update Firestore
            await setDoc(categoriesRef, {
                categoryList: categories,
                tokenCategories: updatedTokenCategories,
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            // Update local state
            setCategoryTokens(updatedTokenCategories);
            
            toast.success(`Successfully added ${selectedToken} to ${selectedCategory} category`);
            
        } catch (error) {
            console.error('Error managing token category:', error);
            toast.error('Failed to update category: ' + error.message);
        }
    };

    const handleRemoveFromCategory = async (token, category) => {
        try {
            const categoriesRef = doc(db, 'settings', 'categories');
            
            // Get current data
            const categoriesDoc = await getDoc(categoriesRef);
            
            if (!categoriesDoc.exists()) {
                toast.error('Categories document not found');
                return;
            }
            
            const data = categoriesDoc.data();
            const updatedTokenCategories = data.tokenCategories || {};
            
            // Remove token from category
            if (updatedTokenCategories[category] && updatedTokenCategories[category].includes(token)) {
                updatedTokenCategories[category] = updatedTokenCategories[category].filter(t => t !== token);
                
                // Update Firestore
                await updateDoc(categoriesRef, {
                    tokenCategories: updatedTokenCategories,
                    updatedAt: serverTimestamp()
                });
                
                // Update local state
                setCategoryTokens(updatedTokenCategories);
                
                toast.success(`Removed ${token} from ${category} category`);
            }
        } catch (error) {
            console.error('Error removing token from category:', error);
            toast.error('Failed to update category: ' + error.message);
        }
    };

    // Add a function to fetch categories data
    useEffect(() => {
        if (isAdmin) {
            const fetchCategoryData = async () => {
                try {
                    setLoadingCategories(true);
                    const categoriesRef = doc(db, 'settings', 'categories');
                    const categoriesDoc = await getDoc(categoriesRef);
                    
                    if (categoriesDoc.exists()) {
                        const data = categoriesDoc.data();
                        if (data.categoryList) {
                            setCategories(data.categoryList);
                        }
                        if (data.tokenCategories) {
                            setCategoryTokens(data.tokenCategories);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching category data:', error);
                } finally {
                    setLoadingCategories(false);
                }
            };
            
            fetchCategoryData();
        }
    }, [isAdmin]);

    // Add this useEffect to inject keyframes
    React.useEffect(() => {
        // Insert keyframes into the document head
        const styleElement = document.createElement('style');
        styleElement.innerHTML = keyframesStyle;
        document.head.appendChild(styleElement);
        
        // Clean up on unmount
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Use effect to set up event listener for new deposits
    useEffect(() => {
        // Function to handle new deposit events
        const handleNewDeposit = (event) => {
            const { userId, amount, token, balanceBefore, balanceAfter } = event.detail;
            
            // Only update if it's for the current user
            if (auth.currentUser && userId === auth.currentUser.uid) {
                console.log(`[UserProfile] New deposit detected: ${amount} ${token}`);
                console.log(`[UserProfile] Balance change: ${balanceBefore} -> ${balanceAfter}`);
                
                // Update local balance state immediately with the verified balance
                if (typeof balanceAfter !== 'undefined') {
                    setBalances(prev => {
                        const updated = { ...prev, [token]: balanceAfter };
                        console.log(`[UserProfile] Updated balances state:`, updated);
                        return updated;
                    });
                } else {
                    // Fallback to the old way if balanceAfter isn't provided
                    setBalances(prev => {
                        const currentBalance = prev[token] || 0;
                        const newBalance = currentBalance + parseFloat(amount);
                        const updated = { ...prev, [token]: newBalance };
                        console.log(`[UserProfile] Updated balances state (fallback):`, updated);
                        return updated;
                    });
                }
                
                // Show a success toast
                toast.success(`Deposit of ${amount} ${token} has been added to your balance!`);
                
                // Refresh balances from database for verification
                fetchBalances(userId).then(updatedBalances => {
                    console.log(`[UserProfile] Fetched latest balances from DB:`, updatedBalances);
                    setBalances(updatedBalances);
                }).catch(err => {
                    console.error("[UserProfile] Error refreshing balances after deposit:", err);
                });
            }
        };
        
        // Add event listener for deposit events
        window.addEventListener('newDeposit', handleNewDeposit);
        
        // Clean up
        return () => {
            window.removeEventListener('newDeposit', handleNewDeposit);
        };
    }, [auth.currentUser]);

    // Handle P2P transfer to another user
    const handleSend = async (e) => {
        e.preventDefault();
        try {
            // Use the modal-specific loading state instead of the global one
            setSendModalLoading(true);
            setError('');
            setSuccess('');
            
            const { recipientEmail, token, amount } = sendData;
            
            // Validate inputs
            if (!recipientEmail || !token || !amount) {
                setError('Please fill all fields');
                setSendModalLoading(false);
                return;
            }
            
            if (parseFloat(amount) <= 0) {
                setError('Amount must be greater than 0');
                setSendModalLoading(false);
                return;
            }
            
            const parsedAmount = parseFloat(amount);
            
            // Check if sender has enough balance
            if (!balances[token] || balances[token] < parsedAmount) {
                setError(`Insufficient ${token} balance`);
                setSendModalLoading(false);
                return;
            }
            
            // Don't allow sending to self
            if (recipientEmail === auth.currentUser.email) {
                setError('Cannot send to yourself');
                setSendModalLoading(false);
                return;
            }
            
            // Verify recipient exists
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', recipientEmail), limit(1));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setError('Recipient not found. Please verify the email address.');
                setSendModalLoading(false);
                return;
            }
            
            // Get recipient data
            const recipientDoc = querySnapshot.docs[0];
            const recipientId = recipientDoc.id;
            
            // Prevent sending to self (double-check)
            if (recipientId === auth.currentUser.uid) {
                setError('Cannot send to yourself');
                setSendModalLoading(false);
                return;
            }
            
            // Update only sender's balance (which we have permission to do)
            const senderRef = doc(db, 'users', auth.currentUser.uid);
            const senderDoc = await getDoc(senderRef);
            
            if (!senderDoc.exists()) {
                setError('Your account data could not be found');
                setSendModalLoading(false);
                return;
            }
            
            const senderCurrentBalances = senderDoc.data().balances || {};
            const updatedSenderBalances = { ...senderCurrentBalances };
            updatedSenderBalances[token] = (senderCurrentBalances[token] || 0) - parsedAmount;
            
            // Create a P2P transfer document
            try {
                // 1. Create a transfer record that can be processed by a background function
                const transferRef = await addDoc(collection(db, 'p2pTransfers'), {
                    senderUid: auth.currentUser.uid,
                    senderEmail: auth.currentUser.email,
                    recipientUid: recipientId,
                    recipientEmail: recipientEmail,
                    token,
                    amount: parsedAmount,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });
                
                // 2. Update sender's balance
                await updateDoc(senderRef, {
                    [`balances.${token}`]: updatedSenderBalances[token],
                    updatedAt: serverTimestamp()
                });
                
                // 3. Update local state
                setBalances(updatedSenderBalances);
                
                // 4. Now manually update the recipient's balance (this will work based on referral-related rules)
                // This approach works because we're accessing a specific field path directly
                try {
                    const recipientRef = doc(db, 'users', recipientId);
                    await updateDoc(recipientRef, {
                        [`balances.${token}`]: increment(parsedAmount)
                    });
                    
                    // 5. Mark the transfer as completed since we succeeded updating recipient
                    await updateDoc(transferRef, {
                        status: 'completed',
                        completedAt: serverTimestamp()
                    });
                } catch (recipientUpdateError) {
                    console.error('Error updating recipient balance:', recipientUpdateError);
                    // Don't rollback - the p2pTransfers record will ensure the recipient gets the funds
                    // The server/admin can process pending transfers later
                    console.log('Transfer marked as pending - recipient will receive funds when processed');
                }
                
                // Record transaction for history
                await addDoc(collection(db, 'transactions'), {
                    senderUid: auth.currentUser.uid,
                    senderEmail: auth.currentUser.email,
                    recipientUid: recipientId,
                    recipientEmail: recipientEmail,
                    token,
                    amount: parsedAmount,
                    type: 'p2p-transfer',
                    timestamp: serverTimestamp()
                });
                
                // Send email notification to recipient
                try {
                    const senderName = auth.currentUser.displayName || auth.currentUser.email;
                    const response = await fetch('/api/send-transfer-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: recipientEmail,
                            transferData: {
                                amount: parsedAmount,
                                token: token,
                                sender: senderName
                            }
                        }),
                    });
                    
                    if (!response.ok) {
                        console.error('Failed to send email notification');
                    }
                } catch (emailError) {
                    console.error('Error sending email notification:', emailError);
                }
                
                // Show success message and animation within the modal
                setSuccess('Transfer successful!');
                
                // Keep the modal open with success message
                setTransferSuccessDetails({ amount: parsedAmount, token, recipient: recipientEmail });
                setShowTransferSuccess(true);
                
                // Reset the form fields but keep the modal open
                setSendData({
                    recipientEmail: '',
                    token: '',
                    amount: '',
                });
                
                setRecipientValidation({
                    loading: false,
                    exists: false,
                    message: '',
                });
                
            } catch (error) {
                console.error('Error processing transfer:', error);
                setError('Failed to process transfer. Please try again.');
            }
            
        } catch (error) {
            console.error('Error sending funds:', error);
            setError('Failed to send funds. Please try again.');
        } finally {
            // Set loading to false to stop the loading indicator
            setSendModalLoading(false);
        }
    };
    
    // Check if recipient exists when email is entered
    const checkRecipientExists = async (email) => {
        if (!email) return;
        
        try {
            setRecipientValidation({
                loading: true,
                exists: false,
                message: 'Checking...',
            });
            
            // First, validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setRecipientValidation({
                    loading: false,
                    exists: false,
                    message: 'Invalid email format',
                });
                return;
            }
            
            // Don't allow sending to self
            if (email === auth.currentUser.email) {
                setRecipientValidation({
                    loading: false,
                    exists: false,
                    message: 'Cannot send to yourself',
                });
                return;
            }
            
            // Check if the user exists in Firebase
            try {
                // Use an authenticated function call to check if user exists without permission issues
                const functionRef = doc(db, '_functions', 'checkUserExists');
                
                // Safely check if user exists directly through limited Firestore query
                // This should work with updated security rules
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', email), limit(1));
                
                // Only fetch minimal data (just the ID) to verify existence
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                    setRecipientValidation({
                        loading: false,
                        exists: false,
                        message: 'User not found',
                    });
                    return;
                }
                
                setRecipientValidation({
                    loading: false,
                    exists: true,
                    message: 'User found!',
                });
            } catch (error) {
                console.error('Error checking if user exists:', error);
                // Provide a fallback approach if there's still a permission issue
                setRecipientValidation({
                    loading: false,
                    exists: false,
                    message: 'Unable to verify user. Try sending anyway.',
                });
            }
        } catch (error) {
            console.error('Error checking recipient:', error);
            setRecipientValidation({
                loading: false,
                exists: false,
                message: 'Error checking recipient',
            });
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80vh',
                color: 'white'
            }}>
                <div style={{
                    border: '4px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '4px solid #f3c121',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }} />
                <div>Loading your dashboard...</div>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Define renderAdminControls function
    const renderAdminControls = () => (
        <div style={{
            marginTop: '24px',
            padding: '24px',
            background: '#1E1E2D',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <h4 style={{ marginBottom: '16px' }}>Admin Controls</h4>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <select 
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#2D2D3F',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                    value={selectedUser || ''}
                    onChange={(e) => setSelectedUser(e.target.value)}
                >
                    <option value="">Select User</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>{user.email}</option>
                    ))}
                </select>
                
                <button
                    className="btn btn-primary"
                    onClick={handleUpdateBalance}
                    disabled={!selectedUser}
                >
                    Update Balance
                </button>
            </div>
            
            {selectedUser && (
                <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#2D2D3F',
                    borderRadius: '8px'
                }}>
                    <h5>Modify User: {users.find(u => u.id === selectedUser)?.email}</h5>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
                        <select
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: '#333348',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                            value={selectedToken}
                            onChange={(e) => setSelectedToken(e.target.value)}
                        >
                            <option value="">Select Token</option>
                            {Object.keys(DEFAULT_COINS).map(coin => (
                                <option key={coin} value={coin}>{coin}</option>
                            ))}
                        </select>
                        
                        <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: '#333348',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        />
                        
                        <button 
                            className="btn btn-success"
                            onClick={() => handleAdminUpdateBalance('add')}
                            disabled={!selectedToken || !amount}
                        >
                            Add
                        </button>
                        
                        <button 
                            className="btn btn-danger"
                            onClick={() => handleAdminUpdateBalance('subtract')}
                            disabled={!selectedToken || !amount}
                        >
                            Subtract
                        </button>
                    </div>
                </div>
            )}
            
            {/* Add the category management section */}
            <div style={{
                marginTop: '24px',
                padding: '20px',
                background: '#2D2D3F',
                borderRadius: '8px'
            }}>
                <h5 style={{ marginBottom: '16px' }}>Landing Page Categories</h5>
                <p style={{ marginBottom: '16px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                    Assign tokens to categories that will be displayed on the landing page market section.
                    These assignments override the automatic categorization.
                </p>
                
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                style={{
                            padding: '8px 12px',
                    borderRadius: '8px',
                            background: '#333348',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        value={selectedToken}
                        onChange={(e) => setSelectedToken(e.target.value)}
                    >
                        <option value="">Select Token</option>
                        {Object.keys(DEFAULT_COINS).map(coin => (
                            <option key={coin} value={coin}>{coin}</option>
                        ))}
                    </select>
                    
                    <select
                style={{
                            padding: '8px 12px',
                    borderRadius: '8px',
                            background: '#333348',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="">Select Category</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    
                    <button 
                        className="btn btn-primary"
                        onClick={handleAssignCategory}
                        disabled={!selectedToken || !selectedCategory}
                        style={{ height: 'fit-content' }}
                    >
                        Assign to Category
            </button>
                </div>
                
                {/* Display tokens in each category */}
                <div style={{ marginTop: '20px' }}>
                    <h6 style={{ marginBottom: '10px' }}>Market Categories</h6>
                    
                    {loadingCategories ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Loading categories...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {categories.map(category => (
                                <div key={category} style={{ 
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '12px',
                                    borderRadius: '8px'
                                }}>
                                    <h6 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                                        <span style={{ 
                                            background: category === 'Popular' ? '#FF6B00' :
                                                        category === 'Recently added' ? '#00A3FF' :
                                                        category === 'Trending' ? '#00CC9B' :
                                                        category === 'Memes' ? '#FF5E84' : '#6C5DD3',
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            marginRight: '8px'
                                        }}></span>
                                        {category}
                                    </h6>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {categoryTokens[category] && categoryTokens[category].length > 0 ? (
                                            categoryTokens[category].map(token => (
                                                <div key={token} style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    <img 
                                                        src={COIN_LOGOS[token] || `https://cryptologos.cc/logos/${token.toLowerCase()}-${token.toLowerCase()}-logo.png`} 
                                                        alt={token}
                                                        style={{
                                                            width: '16px',
                                                            height: '16px',
                                                            borderRadius: '50%',
                                                        }}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://cryptologos.cc/logos/question-mark.png';
                                                        }}
                                                    />
                                                    {token}
            <button 
                                                        onClick={() => handleRemoveFromCategory(token, category)}
                style={{
                                                            background: 'none',
                    border: 'none',
                                                            color: '#FF5E5E',
                                                            cursor: 'pointer',
                                                            fontSize: '16px',
                                                            marginLeft: '5px',
                                                            padding: '0 5px'
                                                        }}
                                                    >
                                                        ×
            </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: '#7A7A7A', fontSize: '14px' }}>No tokens in this category</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Update the balance actions JSX in the return statement
    const renderBalanceActions = () => (
        <BalanceActionsContainer>
            <ActionButton onClick={() => setShowConvertModal(true)}>
                Convert
            </ActionButton>
            <ActionButton onClick={() => navigate('/deposit')}>
                Deposit
            </ActionButton>
            <ActionButton onClick={() => navigate('/withdraw')}>
                Withdraw
            </ActionButton>
            <ActionButton onClick={() => setShowSendModal(true)}>
                Send
            </ActionButton>
        </BalanceActionsContainer>
    );

    // Add handler functions for deposit and withdraw
    const handleDeposit = (coin) => {
        // Navigate to the deposit page with the selected coin
        navigate(`/deposit?coin=${coin}`);
    };

    const handleWithdraw = (coin) => {
        // Navigate to the withdraw page with the selected coin
        navigate(`/withdraw?coin=${coin}`);
    };

    return (
        <div>
            <CustomPageTitle>
                <h3>My Profile</h3>
            </CustomPageTitle>
            
            <ProfileSectionContainer>
                <UserInfoContainer>
                    {/* Add a subtle background effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 30% 30%, rgba(255, 153, 0, 0.05), transparent 70%)',
                        zIndex: -1
                    }}></div>
                    
                    <AvatarContainer>
                        <img src={userData?.avatar || img} alt="User avatar" />
                        <ShineEffect />
                    </AvatarContainer>
                    
                    <div>
                        <h3 style={{
                            fontSize: '26px',
                            fontWeight: '600',
                            margin: '0 0 8px',
                            color: '#fff',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }}>{userData?.displayName || auth.currentUser?.displayName || 'User'}</h3>
                        <p style={{
                            fontSize: '16px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            margin: '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ 
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#4ade80',
                                boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)'
                            }}></span>
                            {userData?.email || auth.currentUser?.email}
                        </p>
                                    </div>
                                    
                    {/* Add a premium badge if user is premium */}
                    {userData?.isPremium && (
                        <div className="premium-badge" style={{
                            marginLeft: 'auto',
                            background: 'linear-gradient(90deg, #FF9900, #FFCC00)',
                            color: '#000',
                            fontWeight: 'bold',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 10px rgba(255, 153, 0, 0.5)'
                        }}>
                            <span style={{ fontSize: '14px' }}>★</span> PREMIUM
                                </div>
                    )}
                </UserInfoContainer>
                
                <StyledTabs>
                    <TabList>
                                {
                                    dataCoinTab.map(idx => (
                                        <Tab key={idx.id}><h6 className="fs-16">
                                            <i className={`fa ${idx.icon}`}></i>
                                            {idx.title}
                                        </h6></Tab>
                                    ))
                                }
                            </TabList>

                            <TabPanel>
                        <ContentInnerContainer className="content-inner profile">
                            <ResponsiveForm onSubmit={handleUpdateProfile}>
                                        <h4>User Profile</h4>
                                        <h6>Information</h6>

                                        {success && <div className="alert alert-success">{success}</div>}
                                        {error && <div className="alert alert-danger">{error}</div>}

                                        <div className="form-group d-flex s1">
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="Display Name"
                                                value={userData.displayName}
                                                onChange={(e) => setUserData(prev => ({
                                                    ...prev,
                                                    displayName: e.target.value
                                                }))}
                                            />
                                        </div>
                                        <div className="form-group d-flex">
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={userData.email}
                                                disabled
                                            />
                                            <div className="sl">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Your Phone number"
                                                    value={userData.phoneNumber}
                                                    onChange={(e) => setUserData(prev => ({
                                                        ...prev,
                                                        phoneNumber: e.target.value
                                                    }))}
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="btn-action">
                                            Update Profile
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={handleSignOut}
                                            className="btn-action"
                                            style={{marginTop: '10px', backgroundColor: '#dc3545'}}
                                        >
                                            Sign Out
                                        </button>
                            </ResponsiveForm>
                        </ContentInnerContainer>
                            </TabPanel>

                    {/* Balances TabPanel */}
                            <TabPanel>
                        <ContentInnerContainer className="content-inner profile">
                                    <h4 className="balance-title">Balances</h4>
                                    <AnimatedBorder>
                                        <GalaxyBackground>
                                            <div className="balance-overview" style={{
                                                padding: '24px',
                                                marginBottom: '24px',
                                                position: 'relative',
                                                zIndex: 1
                                            }}>
                                        <BalanceHeader>
                                                    <div className="balance-info">
                                                        <p style={{ 
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            marginBottom: '8px'
                                                        }}>Total Balance (USDT)</p>
                                                        <h3 style={{
                                                            fontSize: '32px',
                                                            fontWeight: '600',
                                                            color: '#fff',
                                                    marginBottom: '8px',
                                                    transition: 'opacity 0.3s ease'
                                                }}>
                                                    {Object.keys(balances).length === 0 ? (
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '10px',
                                                            fontSize: '24px',
                                                            color: 'rgba(255, 255, 255, 0.7)'
                                                        }}>
                                                            <div style={{
                                                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                                                borderTop: '2px solid #f3c121',
                                                                borderRadius: '50%',
                                                                width: '20px',
                                                                height: '20px',
                                                                animation: 'spin 1s linear infinite'
                                                            }} />
                                                            Calculating...
                                                        </div>
                                                    ) : (
                                                        `$${calculateTotalBalance.toFixed(2)}`
                                                    )}
                                                </h3>
                                                        <p style={{
                                                            color: totalPnL >= 0 ? '#0ECB81' : '#F6465D',
                                                            fontSize: '14px',
                                                            fontWeight: '500'
                                                        }}>
                                                            Total PnL: ${totalPnL.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    {renderBalanceActions()}
                                        </BalanceHeader>
                                            </div>
                                        </GalaxyBackground>
                                    </AnimatedBorder>

                                    <AnimatedBorder style={{ marginTop: '24px' }}>
                                        <div className="assets-table" style={{
                                            background: '#1E1E2D',
                                            borderRadius: '16px',
                                            padding: '24px',
                                            position: 'relative',
                                            zIndex: 1
                                        }}>
                                    <ResponsiveTableWrapper>
                                            <table className="table" style={{
                                                width: '100%',
                                                borderCollapse: 'separate',
                                                borderSpacing: '0',
                                                color: '#fff'
                                            }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{
                                                            padding: '16px',
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            textAlign: 'left',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}>#</th>
                                                        <th style={{
                                                            padding: '16px',
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            textAlign: 'left',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}>Asset</th>
                                                        <th style={{
                                                            padding: '16px',
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            textAlign: 'right',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}>Available Balance</th>
                                                        <th style={{
                                                            padding: '16px',
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            textAlign: 'right',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}>In Orders</th>
                                                        <th style={{
                                                            padding: '16px',
                                                            color: '#7A7A7A',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            textAlign: 'right',
                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                                        }}>Total Value (USDT)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(balances).length > 0 ? (
                                                        // Sort tokens by balance value in USD, in descending order
                                                        Object.entries(balances)
                                                            .map(([asset, balance]) => {
                                                                // Use a fixed price of $1 for RIPPLEX token
                                                                const price = asset === 'RIPPLEX' ? 1 : (tokenPrices[asset] || 0);
                                                                const usdValue = balance * price;
                                                                return { asset, balance, usdValue };
                                                            })
                                                            .sort((a, b) => b.usdValue - a.usdValue) // Sort by USD value, descending
                                                            .map(({ asset, balance, usdValue }, index) => {
                                                                const isRipplex = asset === 'RIPPLEX';
                                                                return (
                                                                    <tr key={asset} style={{
                                                                        transition: 'all 0.3s',
                                                                        background: isRipplex ? 'rgba(255, 145, 0, 0.1)' : 'transparent'
                                                                    }}>
                                                                        <td style={{
                                                                            padding: '16px',
                                                                            fontSize: '14px',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>{index + 1}</td>
                                                                        <td style={{
                                                                            padding: '16px',
                                                                            fontSize: '14px',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>
                                                                            <div style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '12px'
                                                                            }}>
                                                                                <img 
                                                                                    src={COIN_LOGOS[asset] || `https://cryptologos.cc/logos/${asset.toLowerCase()}-${asset.toLowerCase()}-logo.png`} 
                                                                                    alt={asset}
                                                                                    style={{
                                                                                        width: '32px',
                                                                                        height: '32px',
                                                                                        borderRadius: '50%',
                                                                                        background: '#2A2A3C',
                                                                                        boxShadow: isRipplex ? '0 0 10px rgba(255, 145, 0, 0.5)' : 'none'
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        e.target.onerror = null;
                                                                                        e.target.src = 'https://cryptologos.cc/logos/question-mark.png';
                                                                                    }}
                                                                                />
                                                                                <div>
                                                                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                                                                        {asset}
                                                                                        {isRipplex && (
                                                                                            <span style={{ 
                                                                                                marginLeft: '8px', 
                                                                                                background: 'linear-gradient(90deg, #FF9100, #FFC400)', 
                                                                                                padding: '2px 6px', 
                                                                                                borderRadius: '4px',
                                                                                                fontSize: '10px',
                                                                                                color: 'black',
                                                                                                fontWeight: 'bold',
                                                                                                verticalAlign: 'middle'
                                                                                            }}>
                                                                                                AIRDROP
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div style={{
                                                                                        fontSize: '12px',
                                                                                        color: '#7A7A7A',
                                                                                        marginTop: '2px'
                                                                                    }}>
                                                                                        {asset === 'USDT' ? 'Tether USD' : 
                                                                                         asset === 'RIPPLEX' ? 'Ripple Exchange Token' : 
                                                                                         asset}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{
                                                                            padding: '16px',
                                                                            fontSize: '14px',
                                                                            textAlign: 'right',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>
                                                                            <span style={{ fontWeight: '500' }}>{balance.toFixed(8)}</span>
                                                                            <span style={{ color: '#7A7A7A', marginLeft: '4px' }}>{asset}</span>
                                                                        </td>
                                                                        <td style={{
                                                                            padding: '16px',
                                                                            fontSize: '14px',
                                                                            textAlign: 'right',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>
                                                                            <span style={{ fontWeight: '500' }}>0.00000000</span>
                                                                            <span style={{ color: '#7A7A7A', marginLeft: '4px' }}>{asset}</span>
                                                                        </td>
                                                                        <td style={{
                                                                            padding: '16px',
                                                                            fontSize: '14px',
                                                                            textAlign: 'right',
                                                                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                                                        }}>
                                                                            <span style={{ fontWeight: '500' }}>${usdValue.toFixed(2)}</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="5" style={{
                                                                textAlign: 'center',
                                                                padding: '20px',
                                                                color: '#7A7A7A'
                                                            }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '10px'
                                                            }}>
                                                                <div style={{
                                                                    border: '2px solid rgba(255, 255, 255, 0.1)',
                                                                    borderTop: '2px solid #f3c121',
                                                                    borderRadius: '50%',
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    animation: 'spin 1s linear infinite'
                                                                }} />
                                                                Loading balances...
                                                            </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                    </ResponsiveTableWrapper>
                                        </div>
                                    </AnimatedBorder>

                                    {isAdmin && renderAdminControls()}
                        </ContentInnerContainer>
                            </TabPanel>

                    {/* Other TabPanels with ContentInnerContainer */}
                            <TabPanel>
                        <ContentInnerContainer className="content-inner profile">
                            {/* Content remains the same, just adding ResponsiveCard wrappers */}
                                    <h4 className="balance-title">Liquidation Protection Bonus</h4>
                                    
                                    {loadingBonus ? (
                                <ResponsiveCard style={{ textAlign: 'center', padding: '30px' }}>
                                            Loading bonus information...
                                </ResponsiveCard>
                                    ) : !bonusAccount || !bonusAccount.exists ? (
                                <ResponsiveCard style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            <p>You don't have any active bonuses at the moment.</p>
                                    <button 
                                        className="btn-action" 
                                        style={{ 
                                            marginTop: '15px',
                                            background: 'linear-gradient(90deg, #FF9900, #FFCC00)',
                                            color: '#000',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Get More Bonuses
                                    </button>
                                </ResponsiveCard>
                                    ) : (
                                        <AnimatedBorder>
                                            <GalaxyBackground>
                                                <div style={{
                                                    padding: '24px',
                                                    position: 'relative',
                                                    zIndex: 1
                                                }}>
                                            <h5 style={{ 
                                                fontSize: '20px', 
                                                fontWeight: 'bold',
                                                marginBottom: '15px',
                                                color: '#fff'
                                            }}>Active Bonus</h5>
                                                    <div style={{
                                                        display: 'flex',
                                                alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                gap: '20px',
                                                flexWrap: 'wrap'
                                                    }}>
                                        <div>
                                                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                        You have an active bonus of:
                                                    </p>
                                                    <h3 style={{ 
                                                        fontSize: '28px', 
                                                        fontWeight: 'bold',
                                                        marginTop: '10px',
                                                        background: 'linear-gradient(90deg, #FF9900, #FFCC00)',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent'
                                                    }}>
                                                        {bonusAccount.amount} {bonusAccount.token}
                                                    </h3>
                                    </div>
                                                <button className="btn-action" style={{
                                                    background: 'linear-gradient(90deg, #FF9900, #FFCC00)',
                                                    color: '#000',
                                                    fontWeight: 'bold',
                                                    padding: '12px 24px',
                                                    borderRadius: '8px'
                                                }}>
                                                    Get More Bonuses
                                                </button>
                                                            </div>
                                                </div>
                                            </GalaxyBackground>
                                        </AnimatedBorder>
                                    )}
                        </ContentInnerContainer>
                            </TabPanel>

                            <TabPanel>
                        <ContentInnerContainer className="content-inner referrals">
                            <h4 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Referral Program</h4>
                                    
                                    {loadingReferrals ? (
                                <ResponsiveCard style={{ textAlign: 'center', padding: '30px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ 
                                            border: '3px solid rgba(255, 255, 255, 0.1)',
                                            borderTop: '3px solid #f3c121',
                                                            borderRadius: '50%', 
                                                            width: '24px', 
                                                            height: '24px', 
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span>Loading referral information...</span>
                                    </div>
                                </ResponsiveCard>
                            ) : (
                                <>
                                    <AnimatedBorder style={{ marginBottom: '24px' }}>
                                        <ResponsiveCard style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                                                <div>
                                                    <h5 style={{ fontSize: '20px', marginBottom: '8px' }}>Share Your Referral Link</h5>
                                                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '15px' }}>
                                                        Invite friends and earn 1 RIPPLEX token per referral + 10% commission on their trading fees!
                                                    </p>
                                            </div>
                                            
                                            <div style={{ 
                                                    background: 'linear-gradient(90deg, #FF9900, #FFCC00)', 
                                                    padding: '15px 20px', 
                                                    borderRadius: '8px',
                                                display: 'flex', 
                                                    alignItems: 'center',
                                                    gap: '10px'
                                                }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '28px', color: '#000' }}>
                                                            {referralData?.referrals?.length || 0}
                                                </div>
                                                        <div style={{ fontSize: '14px', color: '#000' }}>Total Referrals</div>
                                                </div>
                                                    <div style={{ width: '1px', height: '40px', background: 'rgba(0,0,0,0.2)' }}></div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '28px', color: '#000' }}>
                                                            {referralData?.totalCommission?.toFixed(2) || '0.00'}
                                                        </div>
                                                        <div style={{ fontSize: '14px', color: '#000' }}>USDT Earned</div>
                                                    </div>
                                                </div>
                                            </div>
                                                
                                                <div style={{
                                                background: 'rgba(255, 255, 255, 0.05)', 
                                                padding: '15px', 
                                                borderRadius: '8px',
                                                marginBottom: '15px',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    top: 0, 
                                                    left: 0, 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
                                                    animation: 'shine 2s infinite linear',
                                                    pointerEvents: 'none'
                                                }} />
                                                
                                                <code style={{ wordBreak: 'break-all', fontSize: '14px', display: 'block' }}>
                                                    {getReferralLink()}
                                                </code>
                                    </div>
                                                
                                            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                    <button
                                                    onClick={handleCopyReferralLink}
                                                        className="btn-action"
                                                        style={{
                                                        flex: '1',
                                                        background: 'linear-gradient(90deg, #4A6BF3, #7189FF)',
                                                        minWidth: '180px'
                                                    }}
                                                >
                                                    {copySuccess || 'Copy Referral Link'}
                                                    </button>
                                                    
                                                    <button
                                                        className="btn-action"
                                                        style={{
                                                        flex: '1',
                                                        background: '#25D366',
                                                        minWidth: '180px'
                                                        }}
                                                        onClick={() => {
                                                        window.open(`https://wa.me/?text=Join me on Ripple Exchange and get free crypto! ${getReferralLink()}`, '_blank');
                                                        }}
                                                    >
                                                    Share on WhatsApp
                                                    </button>
                                    </div>
                                        </ResponsiveCard>
                                    </AnimatedBorder>
                                    
                                    <AnimatedBorder>
                                        <ResponsiveCard style={{ padding: '24px' }}>
                                            <h5 style={{ fontSize: '20px', marginBottom: '20px' }}>Your Referrals</h5>
                                            
                                            {referralData && referralData.referrals && referralData.referrals.length > 0 ? (
                                                <ResponsiveTableWrapper>
                                                    <table style={{
                                                        width: '100%',
                                                        borderCollapse: 'separate',
                                                        borderSpacing: '0',
                                                        color: '#fff'
                                                    }}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ 
                                                                    padding: '12px 15px', 
                                                                    textAlign: 'left', 
                                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'rgba(255,255,255,0.6)'
                                                                }}>User</th>
                                                                <th style={{ 
                                                                    padding: '12px 15px', 
                                                                    textAlign: 'center', 
                                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'rgba(255,255,255,0.6)'
                                                                }}>Date Joined</th>
                                                                <th style={{ 
                                                                    padding: '12px 15px', 
                                                                    textAlign: 'center', 
                                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'rgba(255,255,255,0.6)'
                                                                }}>Status</th>
                                                                <th style={{ 
                                                                    padding: '12px 15px', 
                                                                    textAlign: 'right', 
                                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                                    color: 'rgba(255,255,255,0.6)'
                                                                }}>RIPPLEX Earned</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {referralData.referrals.map((referral, index) => {
                                                                const dateObj = referral.date ? new Date(referral.date.seconds * 1000) : new Date();
                                                                return (
                                                                    <tr key={index} style={{
                                                                        transition: 'all 0.3s',
                                                                        background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'
                                                                    }}>
                                                                        <td style={{ 
                                                                            padding: '15px', 
                                                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                        }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                <div style={{
                                                                                    width: '32px',
                                                                                    height: '32px',
                                                                                    borderRadius: '50%',
                                                                                    background: 'rgba(255,255,255,0.1)',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    color: '#fff',
                                                                                    fontWeight: 'bold'
                                                                                }}>
                                                                                    {String(referral.email || 'U').charAt(0).toUpperCase()}
                                                                                </div>
                                                                                <div>{referral.email || `User ${index + 1}`}</div>
                                                                            </div>
                                                                    </td>
                                                                        <td style={{ 
                                                                            padding: '15px', 
                                                                            textAlign: 'center',
                                                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                        }}>
                                                                            {dateObj.toLocaleDateString()}
                                                                    </td>
                                                                        <td style={{ 
                                                                            padding: '15px', 
                                                                            textAlign: 'center',
                                                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                                        }}>
                                                                        <span style={{
                                                                                padding: '5px 10px',
                                                                                borderRadius: '20px',
                                                                                fontSize: '12px',
                                                                                background: referral.status === 'active' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                                                                                color: referral.status === 'active' ? '#2ecc71' : '#ddd'
                                                                            }}>
                                                                                {referral.status || 'active'}
                                                                        </span>
                                                                    </td>
                                                                        <td style={{ 
                                                                            padding: '15px', 
                                                                            textAlign: 'right',
                                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                            fontWeight: 'bold',
                                                                            color: '#FF9900'
                                                                        }}>
                                                                            1.00 RIPPLEX
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </ResponsiveTableWrapper>
                                            ) : (
                                                <div style={{ 
                                                    padding: '40px 20px', 
                                                    textAlign: 'center', 
                                                    borderRadius: '8px', 
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px dashed rgba(255,255,255,0.1)'
                                                }}>
                                                    <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                                                        You haven't referred anyone yet
                                                    </div>
                                                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '500px', margin: '0 auto' }}>
                                                        Share your referral link with friends and earn 1 RIPPLEX token for each successful signup!
                                                    </p>
                                                </div>
                                            )}
                                        </ResponsiveCard>
                                    </AnimatedBorder>
                                        </>
                                    )}
                        </ContentInnerContainer>
                            </TabPanel>

                            <TabPanel>
                        <ContentInnerContainer className="content-inner api">
                                    <h4>Two-Factor Authentication {is2FAEnabled ? <span className="color-success">Enabled</span> : <span>Disabled</span>}</h4>
                            <ResponsiveCard>
                                <p>
                                    Two-factor authentication adds an extra layer of security to your account.
                                    When enabled, you'll need to enter a verification code in addition to your password when logging in.
                                </p>
                                
                                <div style={{ marginTop: '20px' }}>
                                        <button 
                                        onClick={handleToggle2FA} 
                                            className="btn-action"
                                        style={{
                                            background: is2FAEnabled ? '#dc3545' : '#0ECB81',
                                            width: '100%',
                                            maxWidth: '300px'
                                        }}
                                    >
                                        {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                                        </button>
                                        </div>
                            </ResponsiveCard>
                        </ContentInnerContainer>
                            </TabPanel>

                            <TabPanel>
                        <ContentInnerContainer className="content-inner profile">
                                    <h4>Change Password</h4>
                            <ResponsiveCard>
                                <ResponsiveForm onSubmit={handlePasswordChange}>
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    {success && <div className="alert alert-success">{success}</div>}
                                    
                                    <div className="form-group">
                                        <input
                                                        type="password"
                                            className="form-control"
                                            placeholder="Current Password"
                                                        value={oldPassword}
                                                        onChange={(e) => setOldPassword(e.target.value)}
                                                        required
                                        />
                                        </div>
                                    
                                    <div className="form-group">
                                        <input
                                            type="password"
                                            className="form-control"
                                            placeholder="New Password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        required
                                        />
                                        </div>
                                    
                                    <div className="form-group">
                                        <input
                                            type="password"
                                            className="form-control"
                                            placeholder="Confirm New Password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                        />
                                    </div>
                                            
                                    <button type="submit" className="btn-action">
                                        Update Password
                                    </button>
                                </ResponsiveForm>
                            </ResponsiveCard>
                        </ContentInnerContainer>
                            </TabPanel>
                </StyledTabs>
            </ProfileSectionContainer>

            {/* ConvertModal remains the same */}
            {showConvertModal && (
            <ConvertModal
                isOpen={showConvertModal}
                onClose={() => setShowConvertModal(false)}
                    balances={balances}
                tokenPrices={tokenPrices}
                onConvert={handleConvert}
            />
            )}
            
            {/* Send Modal with portal rendering for proper z-index */}
            {showSendModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                }} onClick={() => {
                    // Only allow closing if not showing success or loading
                    if (!showTransferSuccess && !sendModalLoading) {
                        setShowSendModal(false);
                    }
                }}>
                    <div style={{
                        backgroundColor: '#1a1b23',
                        borderRadius: '16px',
                        width: '90%',
                        maxWidth: '480px',
                        padding: '24px',
                        position: 'relative',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        transform: 'translateY(0)', // Ensure it's centered
                        margin: 'auto', // Center in the viewport
                        zIndex: 10100,
                    }} onClick={e => e.stopPropagation()}>
                        <button style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '24px',
                            cursor: 'pointer',
                            display: sendModalLoading ? 'none' : 'block', // Hide close button when loading
                        }} onClick={() => {
                            // Don't allow closing when loading
                            if (!sendModalLoading) {
                                setShowSendModal(false);
                                setShowTransferSuccess(false);
                            }
                        }}>
                            &times;
                        </button>

                        {showTransferSuccess ? (
                            // Success view
                            <div style={{
                                textAlign: 'center',
                                padding: '20px 0',
                            }}>
                                <div style={{
                                    fontSize: '70px',
                                    marginBottom: '20px',
                                    color: '#4CAF50',
                                    animation: 'fadeIn 0.5s ease-out'
                                }}>
                                    <i className="fas fa-check-circle"></i>
                                </div>
                                <h3 style={{
                                    fontSize: '24px',
                                    color: 'white',
                                    marginBottom: '10px',
                                    fontWeight: 'bold'
                                }}>
                                    Transfer Complete!
                                </h3>
                                <p style={{
                                    fontSize: '18px',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    marginBottom: '15px',
                                }}>
                                    You've sent <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{transferSuccessDetails.amount} {transferSuccessDetails.token}</span> to {transferSuccessDetails.recipient}
                                </p>
                                <button 
                                    onClick={() => {
                                        setShowSendModal(false);
                                        setShowTransferSuccess(false);
                                    }}
                                    style={{
                                        backgroundColor: '#4a6bf3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '14px 28px',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        marginTop: '10px'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            // Send form view
                            <>
                                <h3 style={{ fontSize: '22px', marginBottom: '16px', color: '#fff', fontWeight: 'bold' }}>Send Funds</h3>
                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>Transfer funds to another user</p>
                                
                                <form onSubmit={handleSend}>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ 
                                            display: 'block', 
                                            marginBottom: '8px', 
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '14px'
                                        }}>
                                            Recipient Email
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="email" 
                                                value={sendData.recipientEmail} 
                                                onChange={(e) => {
                                                    setSendData({...sendData, recipientEmail: e.target.value});
                                                    // Debounce the check if the user exists
                                                    if (e.target.value) {
                                                        const timeoutId = setTimeout(() => {
                                                            checkRecipientExists(e.target.value);
                                                        }, 500);
                                                        return () => clearTimeout(timeoutId);
                                                    }
                                                }}
                                                placeholder="Enter recipient email"
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    outline: 'none',
                                                    transition: 'all 0.2s',
                                                    '&:focus': {
                                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                                        boxShadow: '0 0 0 2px rgba(74, 107, 243, 0.25)'
                                                    }
                                                }}
                                                required
                                                disabled={sendModalLoading}
                                            />
                                            {recipientValidation.message && (
                                                <div style={{ 
                                                    marginTop: '8px', 
                                                    fontSize: '14px',
                                                    color: recipientValidation.exists ? '#4CAF50' : '#f44336'
                                                }}>
                                                    {recipientValidation.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ 
                                            display: 'block', 
                                            marginBottom: '8px', 
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '14px'
                                        }}>
                                            Select Token
                                        </label>
                                        <select 
                                            value={sendData.token} 
                                            onChange={(e) => setSendData({...sendData, token: e.target.value})}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '16px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                appearance: 'none'
                                            }}
                                            required
                                            disabled={sendModalLoading}
                                        >
                                            <option value="">Select token</option>
                                            {Object.entries(balances)
                                                .filter(([_, balance]) => balance > 0)
                                                .map(([token, balance]) => (
                                                    <option key={token} value={token}>
                                                        {token} - Balance: {balance.toFixed(4)}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ 
                                            display: 'block', 
                                            marginBottom: '8px', 
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '14px'
                                        }}>
                                            Amount
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.000001"
                                            min="0"
                                            value={sendData.amount} 
                                            onChange={(e) => setSendData({...sendData, amount: e.target.value})}
                                            placeholder="Enter amount"
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '16px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                '&:focus': {
                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                    boxShadow: '0 0 0 2px rgba(74, 107, 243, 0.25)'
                                                }
                                            }}
                                            required
                                            disabled={sendModalLoading}
                                        />
                                    </div>
                                    
                                    {error && (
                                        <div style={{ 
                                            padding: '12px 16px', 
                                            backgroundColor: 'rgba(244, 67, 54, 0.1)', 
                                            color: '#f44336',
                                            borderRadius: '8px',
                                            marginBottom: '20px',
                                            fontSize: '14px'
                                        }}>
                                            {error}
                                        </div>
                                    )}
                                    
                                    <button 
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            padding: '14px',
                                            borderRadius: '8px',
                                            backgroundColor: '#4a6bf3',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            cursor: sendModalLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px'
                                        }}
                                        disabled={sendModalLoading}
                                    >
                                        {sendModalLoading ? (
                                            <>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                                    borderTop: '2px solid white',
                                                    borderRadius: '50%',
                                                    animation: 'spin 1s linear infinite'
                                                }} />
                                                Processing...
                                            </>
                                        ) : 'Send Funds'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            <Sale01 />
        </div>
    );
}

export default UserProfile;