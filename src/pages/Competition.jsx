// Competition component - Shows the leaderboard for OSCAR token holders
// Updated with improved visuals and trophy icons
import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import defaultAvatar from '../assets/images/avatar.png';
import oscarLogo from '../assets/images/coin/oscar.png';
import { FaTrophy, FaMedal, FaCoins, FaCalendarAlt, FaClock, FaChevronRight } from 'react-icons/fa';
import { GiLaurelCrown, GiPodium } from 'react-icons/gi';
import { BiDollar, BiArrowBack } from 'react-icons/bi';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shine = keyframes`
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const shimmer = keyframes`
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
`;

const slideInRight = keyframes`
  from { 
    transform: translateX(50px);
    opacity: 0;
  }
  to { 
    transform: translateX(0);
    opacity: 1;
  }
`;

const gradientMove = keyframes`
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(240, 185, 11, 0.3), 0 0 10px rgba(240, 185, 11, 0.2); }
  50% { box-shadow: 0 0 20px rgba(240, 185, 11, 0.5), 0 0 30px rgba(240, 185, 11, 0.3); }
  100% { box-shadow: 0 0 5px rgba(240, 185, 11, 0.3), 0 0 10px rgba(240, 185, 11, 0.2); }
`;

const particleFloat = keyframes`
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translateY(-20px) translateX(10px); opacity: 0; }
`;

// Adding additional animations
const shimmerAnimation = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const floatAnimation = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
`;

const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(255, 165, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 165, 0, 0.8);
  }
  100% {
    box-shadow: 0 0 5px rgba(255, 165, 0, 0.5);
  }
`;

// After the particleFloat keyframes definition, add a new keyframe animation for the reward amount
const numberPulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); filter: brightness(1.1); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const float3D = keyframes`
  0% { transform: translateZ(0) translateY(0); }
  50% { transform: translateZ(20px) translateY(-5px); }
  100% { transform: translateZ(0) translateY(0); }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  animation: ${fadeIn} 0.5s ease-in-out;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  padding: 0.8rem 1.2rem;
  background: linear-gradient(270deg, #13141C, #242738, #13141C);
  background-size: 200% 200%;
  animation: ${gradientMove} 5s ease infinite;
  border-radius: 30px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(240, 185, 11, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at center, rgba(240, 185, 11, 0.2) 0%, rgba(240, 185, 11, 0) 70%);
    opacity: 0.6;
    z-index: 0;
    animation: ${pulse} 3s infinite ease-in-out;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 100%);
    transform: rotate(45deg);
    animation: ${shine} 3s infinite;
    z-index: 1;
  }
`;

const LogoImage = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 1rem;
  position: relative;
  z-index: 2;
  animation: ${pulse} 3s infinite ease-in-out;
  box-shadow: 0 0 20px rgba(240, 185, 11, 0.3);
  border: 2px solid #f0b90b;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(240, 185, 11, 0.2), transparent);
    animation: ${pulse} 2s infinite;
  }
`;

const LogoText = styled.div`
  font-size: 1.8rem;
  font-weight: bold;
  background: linear-gradient(to right, #f0b90b, #ffee58);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
  z-index: 2;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  animation: ${fadeIn} 1s ease-out;
`;

const Label = styled.div`
  display: inline-block;
  background: linear-gradient(135deg, #f0b90b, #ffdd2d);
  color: #000;
  font-weight: bold;
  font-size: 0.85rem;
  padding: 0.3rem 1rem;
  border-radius: 20px;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(240, 185, 11, 0.3);
`;

const CompetitionHeader = styled.div`
  background: linear-gradient(135deg, #13141C, #1e2033);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid #282B3E;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f0b90b, #ffee58, #f0b90b);
    background-size: 200% auto;
    animation: ${shine} 3s linear infinite;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }
`;

const Title = styled.h1`
  font-size: 2.4rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #f0b90b, #ffee58);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  grid-column: 1 / -1;
  text-align: center;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.h2`
  font-size: 1.8rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #f0b90b, #ffee58);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  grid-column: 1 / -1;
  text-align: center;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const CompetitionInfo = styled.div`
  background: rgba(26, 28, 42, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(240, 185, 11, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  h3 {
    margin-top: 0;
    margin-bottom: 0.8rem;
    color: #fff;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    margin: 0.7rem 0;
    font-size: 1rem;
    color: #B7BDC6;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .highlight {
    color: #f0b90b;
    font-weight: bold;
    font-size: 2rem;
    margin: 0.8rem 0;
    text-shadow: 0 2px 10px rgba(240, 185, 11, 0.3);
  }
  
  svg {
    color: #f0b90b;
  }
`;

const RewardAmount = styled.div`
  position: relative;
  display: inline-block;
  font-size: 3.2rem;
  font-weight: 900;
  color: transparent;
  margin: 1rem 0;
  
  /* Crisp, sharp gradient */
  background: linear-gradient(
    to right,
    #ffd700 0%,
    #ffec73 50%,
    #ffd700 100%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  animation: ${shimmerAnimation} 4s linear infinite;
  
  /* Sharper text shadow with minimal blur */
  text-shadow: 
    0 0 1px rgba(255, 215, 0, 1),
    0 0 2px rgba(255, 215, 0, 0.8);
  
  /* Static positioning instead of 3D transforms that can cause blur */
  transform: none;
  
  span {
    display: inline-block;
    /* Reduced movement animation to prevent blur */
    animation: ${numberPulse} 3s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.1s);
  }
  
  small {
    font-size: 1.8rem;
    font-weight: 800;
    margin-left: 0.5rem;
    vertical-align: middle;
  }
`;

// Add a component for decorative particles
const RewardParticle = styled.div`
  position: absolute;
  width: ${props => props.$size || '10px'};
  height: ${props => props.$size || '10px'};
  border-radius: 50%;
  background: ${props => props.$color || 'rgba(255, 215, 0, 0.8)'};
  top: ${props => props.$top || '0'};
  left: ${props => props.$left || '0'};
  transform-style: preserve-3d;
  filter: blur(1px);
  opacity: 0;
  animation: ${particleFloat} ${props => props.$duration || '4s'} ease-in-out infinite;
  animation-delay: ${props => props.$delay || '0s'};
  z-index: -1;
`;

const RewardTable = styled.div`
  position: relative;
  overflow: hidden;
  background: rgba(22, 22, 26, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  border: 1px solid rgba(255, 165, 0, 0.2);
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  &:hover {
    border: 1px solid rgba(255, 165, 0, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  }
  
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #f8f8f8;
    
    svg {
      color: #ffa500;
    }
  }
  
  .table {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  .row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 165, 0, 0.05);
      transform: translateX(5px);
    }
    
    &:last-child {
      border-bottom: none;
    }
  }
  
  .cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    &:first-child {
      color: #e0e0e0;
      font-weight: 500;
      
      svg {
        color: #ffa500;
      }
    }
    
    &:last-child {
      color: #ffa500;
      font-weight: 600;
      text-align: right;
      
      /* Add shimmer effect to reward amounts */
      background: linear-gradient(
        90deg, 
        rgba(255, 165, 0, 0.5) 0%, 
        rgba(255, 215, 0, 0.8) 25%, 
        rgba(255, 165, 0, 0.5) 50%, 
        rgba(255, 215, 0, 0.8) 75%, 
        rgba(255, 165, 0, 0.5) 100%
      );
      background-size: 200% auto;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: ${shimmerAnimation} 4s linear infinite;
    }
  }
`;

const PodiumContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1rem;
  margin: 2rem 0;
  perspective: 1000px;
  transform-style: preserve-3d;
  
  @media (max-width: 768px) {
    gap: 0.5rem;
  }
`;

const PodiumPosition = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-style: preserve-3d;
  transform: ${props => props.$position === 0 
    ? 'translateY(-10px) scale(1.05)' 
    : 'translateY(0) scale(1)'
  };
  animation: ${floatAnimation} ${props => 3 + props.$position}s ease-in-out infinite;
  transition: all 0.3s ease;
  z-index: ${props => props.$position === 0 ? 3 : props.$position === 1 ? 2 : 1};
  
  &:hover {
    transform: ${props => props.$position === 0 
      ? 'translateY(-15px) scale(1.08)' 
      : 'translateY(-5px) scale(1.03)'
    };
  }
`;

const TrophyIcon = styled.div`
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  color: ${props => 
    props.$position === 0 ? '#FFD700' : // Gold
    props.$position === 1 ? '#C0C0C0' : // Silver
    '#CD7F32' // Bronze
  };
  filter: drop-shadow(0 0 8px ${props => 
    props.$position === 0 ? 'rgba(255, 215, 0, 0.8)' : 
    props.$position === 1 ? 'rgba(192, 192, 192, 0.8)' : 
    'rgba(205, 127, 50, 0.8)'
  });
  animation: ${pulseGlow} 2s ease-in-out infinite;
  z-index: 5;
`;

const PodiumBox = styled.div`
  position: relative;
  width: ${props => props.$position === 0 ? '130px' : '110px'};
  background: rgba(30, 30, 35, 0.9);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border: 1px solid ${props => 
    props.$position === 0 ? 'rgba(255, 215, 0, 0.3)' : 
    props.$position === 1 ? 'rgba(192, 192, 192, 0.3)' : 
    'rgba(205, 127, 50, 0.3)'
  };
  text-align: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  h3 {
    font-size: 0.85rem;
    color: ${props => 
      props.$position === 0 ? '#FFD700' : 
      props.$position === 1 ? '#C0C0C0' : 
      '#CD7F32'
    };
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: linear-gradient(
      90deg, 
      ${props => props.$position === 0 
        ? 'rgba(255, 215, 0, 0.7) 0%, rgba(255, 236, 115, 1) 50%, rgba(255, 215, 0, 0.7) 100%' 
        : props.$position === 1 
          ? 'rgba(192, 192, 192, 0.7) 0%, rgba(220, 220, 220, 1) 50%, rgba(192, 192, 192, 0.7) 100%' 
          : 'rgba(205, 127, 50, 0.7) 0%, rgba(215, 155, 100, 1) 50%, rgba(205, 127, 50, 0.7) 100%'
      }
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: ${shimmerAnimation} 3s linear infinite;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    border: 1px solid ${props => 
      props.$position === 0 ? 'rgba(255, 215, 0, 0.6)' : 
      props.$position === 1 ? 'rgba(192, 192, 192, 0.6)' : 
      'rgba(205, 127, 50, 0.6)'
    };
  }
  
  @media (max-width: 768px) {
    width: ${props => props.$position === 0 ? '100px' : '90px'};
    padding: 0.75rem;
  }
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 0.8rem;
  background: #282B3E;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 3px solid ${props => 
    props.$rank === 1 ? '#f0b90b' : 
    props.$rank === 2 ? '#A3A3A3' : 
    props.$rank === 3 ? '#CD7F32' : 'transparent'};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .initials {
    color: ${props => 
      props.$rank === 1 ? '#f0b90b' : 
      props.$rank === 2 ? '#A3A3A3' : 
      props.$rank === 3 ? '#CD7F32' : '#ffffff'};
    font-size: 2rem;
    font-weight: bold;
  }
`;

const UserDetails = styled.div`
  text-align: center;
  margin-top: 0.5rem;
  
  .name {
    font-weight: bold;
    color: #fff;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }
  
  .amount {
    color: #f0b90b;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }
`;

const Podium = styled.div`
  width: 100%;
  height: ${props => props.$position === 0 ? '100px' : props.$position === 1 ? '75px' : '50px'};
  background: ${props => props.$position === 0 ? 
    'linear-gradient(135deg, #f0b90b, #ffd700)' : 
    props.$position === 1 ? 
    'linear-gradient(135deg, #A3A3A3, #d9d9d9)' : 
    'linear-gradient(135deg, #CD7F32, #e9967a)'};
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  font-size: 1.6rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    height: 50px;
  }
`;

const UserStatsContainer = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 35, 0.9), rgba(40, 40, 45, 0.9));
  background-size: 200% 200%;
  animation: ${gradientMove} 10s ease infinite;
  border-radius: 12px;
  padding: 1.2rem;
  margin: 1.5rem 0;
  text-align: center;
  border: 1px solid rgba(255, 165, 0, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    border: 1px solid rgba(255, 165, 0, 0.5);
    transform: translateY(-3px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  }
  
  h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: #ffa500;
  }
  
  p {
    font-size: 1.1rem;
    color: #e0e0e0;
    
    .highlight {
      color: #ffa500;
      font-weight: 700;
      animation: ${pulseGlow} 2s ease-in-out infinite;
    }
  }
`;

const LeaderboardContainer = styled.div`
  background: rgba(22, 22, 26, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  border: 1px solid rgba(255, 165, 0, 0.2);
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  
  &:hover {
    border: 1px solid rgba(255, 165, 0, 0.4);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  }
  
  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: #f8f8f8;
    
    svg {
      color: #ffa500;
    }
  }
`;

const LeaderboardHeader = styled.div`
  display: grid;
  grid-template-columns: 0.8fr 2fr 1fr;
  padding: 0.75rem 1rem;
  background: rgba(30, 30, 35, 0.7);
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  color: #e0e0e0;
  border-bottom: 2px solid rgba(255, 165, 0, 0.3);
  
  span {
    &:last-child {
      text-align: right;
    }
  }
`;

const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: 0.8fr 2fr 1fr;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${props => props.$isCurrentUser ? 'rgba(255, 165, 0, 0.1)' : 'transparent'};
  transition: all 0.2s ease;
  
  /* Add animation for row appearance */
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.3s forwards;
  animation-delay: ${props => props.$index * 0.05}s;
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &:hover {
    background: rgba(255, 165, 0, 0.05);
    transform: translateX(5px);
  }
  
  &:nth-child(even) {
    background: ${props => props.$isCurrentUser 
      ? 'rgba(255, 165, 0, 0.1)' 
      : 'rgba(30, 30, 35, 0.3)'
    };
    
    &:hover {
      background: rgba(255, 165, 0, 0.05);
    }
  }
`;

const RankCell = styled.div`
  font-weight: bold;
  color: ${props => props.$isTop3 ? (
    props.$rank === 1 ? '#f0b90b' : 
    props.$rank === 2 ? '#A3A3A3' : 
    '#CD7F32'
  ) : '#fff'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .rank-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${shimmer} 2s infinite ease-in-out;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, 
        ${props => props.$rank === 1 ? 'rgba(240, 185, 11, 0.4)' : 
          props.$rank === 2 ? 'rgba(163, 163, 163, 0.4)' : 
          'rgba(205, 127, 50, 0.4)'}, 
        transparent 70%);
      filter: blur(5px);
      animation: ${pulse} 2s infinite;
      opacity: ${props => props.$isTop3 ? '1' : '0'};
    }
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    background: #282B3E;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid ${props => 
      props.$rank === 1 ? '#f0b90b' : 
      props.$rank === 2 ? '#A3A3A3' : 
      props.$rank === 3 ? '#CD7F32' : 'transparent'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .initials {
      color: ${props => 
        props.$rank === 1 ? '#f0b90b' : 
        props.$rank === 2 ? '#A3A3A3' : 
        props.$rank === 3 ? '#CD7F32' : '#ffffff'};
      font-weight: bold;
    }
  }
  
  .name {
    color: #fff;
    font-size: 0.95rem;
  }
`;

const AmountCell = styled.div`
  color: #f0b90b;
  text-align: right;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: -10px;
    right: -10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(240, 185, 11, 0.4), transparent 70%);
    filter: blur(5px);
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  &:hover::after {
    opacity: 1;
  }
  
  svg {
    color: #f0b90b;
    animation: ${pulse} 3s infinite ease-in-out;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  
  .loader {
    width: 50px;
    height: 50px;
    border: 4px solid #282B3E;
    border-radius: 50%;
    border-top: 4px solid #f0b90b;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 20px rgba(240, 185, 11, 0.2);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #B7BDC6;
  background: rgba(26, 28, 42, 0.6);
  border-radius: 12px;
  border: 1px solid #282B3E;
  
  p {
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }
  
  svg {
    font-size: 3rem;
    color: #f0b90b;
    opacity: 0.5;
    margin-bottom: 1rem;
  }
`;

const Particle = styled.div`
  position: absolute;
  width: 6px;
  height: 6px;
  background: rgba(240, 185, 11, 0.5);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
  z-index: 1;
  animation: ${particleFloat} ${props => props.$duration || '3s'} ease-in-out infinite;
  animation-delay: ${props => props.$delay || '0s'};
  top: ${props => props.$top || '50%'};
  left: ${props => props.$left || '50%'};
`;

// Add new styled components for competition selection
const CompetitionSelectContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  animation: ${fadeIn} 0.5s ease-in-out;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CompetitionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CompetitionCard = styled.div`
  background: linear-gradient(135deg, #13141C, #1e2033);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #282B3E;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
    border-color: rgba(240, 185, 11, 0.5);
  }
`;

const CompetitionCardHeader = styled.div`
  padding: 1.5rem;
  background: rgba(20, 22, 36, 0.6);
  border-bottom: 1px solid #282B3E;
  position: relative;
  
  .coin-logo {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #f0b90b;
    background: #13141C;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 0 10px rgba(240, 185, 11, 0.3);
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  
  h3 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    color: #f0b90b;
  }
  
  p {
    margin: 0;
    color: #B7BDC6;
    font-size: 0.9rem;
  }
`;

const CompetitionCardBody = styled.div`
  padding: 1.5rem;
  
  .date-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.8rem;
    font-size: 0.9rem;
    
    .label {
      color: #8b949e;
    }
    
    .value {
      color: #e6edf3;
    }
  }
  
  .status {
    margin-top: 1rem;
    padding: 0.5rem 0;
    text-align: center;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.9rem;
    background: ${props => 
      props.status === 'active' ? 'rgba(76, 217, 100, 0.15)' : 
      props.status === 'upcoming' ? 'rgba(255, 204, 0, 0.15)' : 
      'rgba(255, 59, 48, 0.15)'
    };
    color: ${props => 
      props.status === 'active' ? '#4cd964' : 
      props.status === 'upcoming' ? '#ffcc00' : 
      '#ff3b30'
    };
  }
`;

const CompetitionCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: rgba(20, 22, 36, 0.4);
  border-top: 1px solid #282B3E;
  
  .rewards {
    font-size: 0.9rem;
    color: #B7BDC6;
  }
  
  .amount {
    font-weight: 500;
    color: #f0b90b;
  }
  
  .enter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #f0b90b;
    font-weight: 500;
  }
`;

const BackButtonContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #B7BDC6;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
  
  svg {
    font-size: 1.2rem;
  }
`;

const NoCompetitionsMessage = styled.div`
  text-align: center;
  padding: 3rem;
  background: rgba(26, 28, 42, 0.6);
  border-radius: 12px;
  border: 1px solid #282B3E;
  margin-top: 2rem;
  
  h3 {
    color: #e6edf3;
    margin-bottom: 1rem;
  }
  
  p {
    color: #B7BDC6;
  }
`;

const Competition = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitions, setCompetitions] = useState([]);
  const [selectedCompetition, setSelectedCompetition] = useState(null);
  const [users, setUsers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Fetch available competitions
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoadingCompetitions(true);
        const competitionsRef = collection(db, "competitions");
        const competitionsSnapshot = await getDocs(competitionsRef);
        
        if (!competitionsSnapshot.empty) {
          const competitionsData = competitionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort by created date, newest first
          const sortedCompetitions = competitionsData.sort((a, b) => {
            return b.createdAt?.seconds - a.createdAt?.seconds;
          });
          
          setCompetitions(sortedCompetitions);
          
          // If there's only one active competition, select it automatically
          const activeCompetitions = sortedCompetitions.filter(comp => {
            const now = new Date();
            const start = new Date(comp.startDate);
            const end = new Date(comp.endDate);
            return now >= start && now <= end;
          });
          
          if (activeCompetitions.length === 1) {
            setSelectedCompetition(activeCompetitions[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching competitions:", error);
      } finally {
        setLoadingCompetitions(false);
      }
    };
    
    fetchCompetitions();
  }, []);
  
  // Fetch users for the selected competition
  useEffect(() => {
    if (!selectedCompetition) return;
    
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Get all users
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const userData = [];
        querySnapshot.forEach(doc => {
          const user = doc.data();
          // Include all users, even with zero balance
          const coinBalance = user.balances?.[selectedCompetition.coinSymbol] || 0;
          
          userData.push({
            id: doc.id,
            name: user.displayName || 'Anonymous',
            email: user.email || '',
            photoURL: user.photoURL || '',
            balance: coinBalance
          });
        });
        
        // Sort by balance descending
        const sortedUsers = userData.sort((a, b) => b.balance - a.balance);
        
        // Get top 100 users
        const top100Users = sortedUsers.slice(0, 100);
        
        setUsers(top100Users);
        setTotalUsers(sortedUsers.length);
        
        // Find current user's rank if logged in
        if (currentUser) {
          const userIndex = sortedUsers.findIndex(user => user.id === currentUser.uid);
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          }
        }
        
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [currentUser, selectedCompetition]);
  
  const getInitials = (name) => {
    if (!name || name === 'Anonymous') return 'AN';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };
  
  // Get trophy icon based on rank
  const getTrophyIcon = (rank) => {
    switch(rank) {
      case 1:
        return <GiLaurelCrown size={30} />;
      case 2:
        return <FaTrophy size={26} />;
      case 3:
        return <FaMedal size={26} />;
      default:
        return null;
    }
  };
  
  // Calculate the status of a competition
  const getCompetitionStatus = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Handle competition selection
  const handleSelectCompetition = (competition) => {
    setSelectedCompetition(competition);
  };
  
  // Handle going back to competition selection
  const handleBackToList = () => {
    setSelectedCompetition(null);
  };
  
  // Get total reward amount
  const getTotalRewardAmount = (rewards) => {
    return rewards.reduce((total, reward) => total + parseFloat(reward.amount), 0);
  };
  
  // Render competition selection screen
  const renderCompetitionSelection = () => {
    if (loadingCompetitions) {
      return (
        <LoadingContainer>
          <div className="loader"></div>
        </LoadingContainer>
      );
    }
    
    if (competitions.length === 0) {
      return (
        <NoCompetitionsMessage>
          <h3>No Competitions Available</h3>
          <p>There are currently no competitions running or scheduled.</p>
        </NoCompetitionsMessage>
      );
    }
    
    return (
      <CompetitionSelectContainer>
        <PageHeader>
          <Label>COMPETITIONS</Label>
        </PageHeader>
        
        <Title style={{ textAlign: 'center', marginBottom: '2rem' }}>Select a Competition</Title>
        
        <CompetitionGrid>
          {competitions.map(competition => {
            const status = getCompetitionStatus(competition.startDate, competition.endDate);
            const totalReward = getTotalRewardAmount(competition.rewards);
            
            return (
              <CompetitionCard 
                key={competition.id} 
                onClick={() => handleSelectCompetition(competition)}
              >
                <CompetitionCardHeader>
                  <div className="coin-logo">
                    <img src={competition.coinLogoUrl} alt={competition.coinSymbol} />
                  </div>
                  <h3>{competition.title}</h3>
                  <p>{competition.subtitle}</p>
                </CompetitionCardHeader>
                <CompetitionCardBody status={status}>
                  <div className="date-row">
                    <span className="label">Start Date:</span>
                    <span className="value">{formatDate(competition.startDate)}</span>
                  </div>
                  <div className="date-row">
                    <span className="label">End Date:</span>
                    <span className="value">{formatDate(competition.endDate)}</span>
                  </div>
                  <div className="status">
                    {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Ended'}
                  </div>
                </CompetitionCardBody>
                <CompetitionCardFooter>
                  <div>
                    <div className="rewards">Total Rewards:</div>
                    <div className="amount">{totalReward.toLocaleString()} USDT</div>
                  </div>
                  <div className="enter">
                    View Details <FaChevronRight />
                  </div>
                </CompetitionCardFooter>
              </CompetitionCard>
            );
          })}
        </CompetitionGrid>
      </CompetitionSelectContainer>
    );
  };
  
  // Render competition details screen
  const renderCompetitionDetails = () => {
    if (!selectedCompetition) return null;
    
    // Get top 3 users for podium
    const topUsers = users.slice(0, 3);
    
    return (
      <Container>
        <BackButtonContainer>
          <BackButton onClick={handleBackToList}>
            <BiArrowBack /> Back to All Competitions
          </BackButton>
        </BackButtonContainer>
        
        {/* Add Coin Logo Box */}
        <LogoContainer>
          <LogoBox>
            <LogoImage>
              <img src={selectedCompetition.coinLogoUrl} alt={selectedCompetition.coinSymbol} />
            </LogoImage>
            <LogoText>{selectedCompetition.coinSymbol}</LogoText>
          </LogoBox>
        </LogoContainer>
        
        <PageHeader>
          <Label>COMPETITION</Label>
        </PageHeader>
      
        <CompetitionHeader>
          <Title>{selectedCompetition.title}</Title>
          <Subtitle>{selectedCompetition.subtitle}</Subtitle>
          
          <CompetitionInfo>
            <h3><BiDollar /> Reward Pool</h3>
            <div style={{ position: 'relative', padding: '0.5rem 0' }}>
              <RewardAmount>
                <span style={{ '--i': 1 }}>{getTotalRewardAmount(selectedCompetition.rewards).toLocaleString().split(',')[0]}</span>
                {getTotalRewardAmount(selectedCompetition.rewards).toLocaleString().includes(',') && (
                  <>
                    <span style={{ '--i': 2 }}>,</span>
                    {getTotalRewardAmount(selectedCompetition.rewards).toLocaleString().split(',')[1].split('').map((char, i) => (
                      <span key={i} style={{ '--i': i + 3 }}>{char}</span>
                    ))}
                  </>
                )}
                <small>USDT</small>
              </RewardAmount>
              {[...Array(8)].map((_, i) => (
                <RewardParticle
                  key={i}
                  $size={`${4 + Math.random() * 8}px`}
                  $color={`rgba(255, 215, ${Math.floor(Math.random() * 100)}, ${0.4 + Math.random() * 0.5})`}
                  $top={`${Math.random() * 100}%`}
                  $left={`${Math.random() * 100}%`}
                  $duration={`${3 + Math.random() * 5}s`}
                  $delay={`${Math.random() * 3}s`}
                />
              ))}
            </div>
            <p><FaCoins /> {selectedCompetition.subtitle}</p>
          </CompetitionInfo>
          
          <RewardTable>
            {[...Array(5)].map((_, i) => (
              <Particle 
                key={i}
                $duration={`${3 + i * 0.5}s`}
                $delay={`${i * 0.7}s`}
                $top={`${20 + i * 15}%`}
                $left={`${10 + i * 20}%`}
              />
            ))}
            <h3><FaCalendarAlt /> Competition Schedule</h3>
            <div className="table">
              <div className="row">
                <div className="cell"><FaClock /> Competition Period</div>
                <div className="cell">
                  {Math.ceil((new Date(selectedCompetition.endDate) - new Date(selectedCompetition.startDate)) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
              <div className="row">
                <div className="cell"><FaClock /> Start Date</div>
                <div className="cell">{formatDate(selectedCompetition.startDate)}</div>
              </div>
              <div className="row">
                <div className="cell"><FaClock /> End Date</div>
                <div className="cell">{formatDate(selectedCompetition.endDate)}</div>
              </div>
              <div className="row">
                <div className="cell"><FaClock /> Rewards Distribution</div>
                <div className="cell">{formatDate(selectedCompetition.rewardsDistributionDate)}</div>
              </div>
            </div>
          </RewardTable>
        </CompetitionHeader>
        
        {/* Additional Reward Breakdown */}
        <RewardTable style={{ marginBottom: '3rem' }}>
          {[...Array(5)].map((_, i) => (
            <Particle 
              key={i}
              $duration={`${3 + i * 0.5}s`}
              $delay={`${i * 0.7}s`}
              $top={`${10 + i * 15}%`}
              $left={`${5 + i * 20}%`}
            />
          ))}
          <h3><BiDollar /> Reward Breakdown</h3>
          <div className="table">
            {selectedCompetition.rewards.map((reward, index) => (
              <div className="row" key={reward.id || index}>
                <div className="cell">
                  {index === 0 ? <GiLaurelCrown /> : index === 1 ? <FaTrophy /> : index === 2 ? <FaMedal /> : null} {reward.description || `${reward.rank} Place`}
                </div>
                <div className="cell">{reward.amount} USDT</div>
              </div>
            ))}
          </div>
        </RewardTable>
        
        {loading ? (
          <LoadingContainer>
            <div className="loader"></div>
          </LoadingContainer>
        ) : (
          <>
            {topUsers.length > 0 ? (
              <PodiumContainer>
                {/* Order podium as 2nd, 1st, 3rd */}
                {[1, 0, 2].map((index) => {
                  const position = index;
                  const actualRank = position + 1;
                  const user = topUsers[position];
                  
                  if (!user) return null;
                  
                  return (
                    <PodiumPosition key={position} $position={position}>
                      <TrophyIcon $position={position}>
                        {getTrophyIcon(actualRank)}
                      </TrophyIcon>
                      
                      <PodiumBox $position={position}>
                        <h3>{position === 0 ? 'Skulldugger' : position === 1 ? 'Klaxxon' : 'Ultralex'}</h3>
                        <Avatar $rank={actualRank}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} />
                          ) : (
                            <div className="initials">{getInitials(user.name)}</div>
                          )}
                        </Avatar>
                        <UserDetails>
                          <div className="name">{user.name}</div>
                          <div className="amount">
                            <FaCoins /> {user.balance.toLocaleString()} {selectedCompetition.coinSymbol}
                          </div>
                        </UserDetails>
                      </PodiumBox>
                      
                      <Podium $position={position}>
                        {actualRank}
                      </Podium>
                    </PodiumPosition>
                  );
                })}
              </PodiumContainer>
            ) : null}
            
            {currentUser && userRank && (
              <UserStatsContainer>
                <h3>Your Ranking</h3>
                <p>
                  You are ranked <span className="highlight">#{userRank}</span> out of <span className="highlight">{totalUsers}</span> competitors
                </p>
              </UserStatsContainer>
            )}
            
            <LeaderboardContainer>
              <h2><GiPodium /> Leaderboard</h2>
              
              <LeaderboardHeader>
                <span>Rank</span>
                <span>User</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </LeaderboardHeader>
              
              {users.length > 0 ? (
                <>
                  {users.map((user, index) => {
                    const rank = index + 1;
                    const isCurrentUser = currentUser && user.id === currentUser.uid;
                    const isTop3 = rank <= 3;
                    
                    return (
                      <LeaderboardRow 
                        key={user.id}
                        $isCurrentUser={isCurrentUser}
                        $index={index}
                      >
                        <RankCell $isTop3={isTop3} $rank={rank}>
                          {isTop3 && <div className="rank-icon">{getTrophyIcon(rank)}</div>}
                          {rank}
                        </RankCell>
                        <UserCell $rank={rank}>
                          <div className="avatar">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} />
                            ) : (
                              <div className="initials">{getInitials(user.name)}</div>
                            )}
                          </div>
                          <div className="name">{user.name}</div>
                        </UserCell>
                        <AmountCell>
                          <FaCoins /> {user.balance.toLocaleString()} {selectedCompetition.coinSymbol}
                        </AmountCell>
                      </LeaderboardRow>
                    );
                  })}
                </>
              ) : (
                <EmptyState>
                  <FaCoins />
                  <p>No users found with {selectedCompetition.coinSymbol} tokens.</p>
                </EmptyState>
              )}
            </LeaderboardContainer>
          </>
        )}
      </Container>
    );
  };
  
  // Main render
  return selectedCompetition ? renderCompetitionDetails() : renderCompetitionSelection();
};

export default Competition; 