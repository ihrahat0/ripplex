// Competition component - Shows the leaderboard for OSCAR token holders
// Updated with improved visuals and trophy icons
import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import defaultAvatar from '../assets/images/avatar.png';
import oscarLogo from '../assets/images/coin/oscar.png';
import { FaTrophy, FaMedal, FaCoins, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { GiLaurelCrown, GiPodium } from 'react-icons/gi';
import { BiDollar } from 'react-icons/bi';

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

const RewardTable = styled.div`
  background: linear-gradient(135deg, rgba(26, 28, 42, 0.7), rgba(31, 33, 53, 0.7));
  background-size: 200% 200%;
  animation: ${gradientMove} 15s ease infinite;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(240, 185, 11, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2), 0 0 15px rgba(240, 185, 11, 0.2);
    transform: translateY(-3px);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #f0b90b, #ffee58, #f0b90b);
    background-size: 200% auto;
    animation: ${shine} 3s linear infinite;
    opacity: 0.8;
  }

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%);
    transform: rotate(45deg);
    animation: ${shine} 6s infinite;
    z-index: 1;
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #fff;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
    z-index: 2;
    
    svg {
      animation: ${pulse} 3s infinite ease-in-out;
    }
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
    position: relative;
    z-index: 2;
  }
  
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.8rem 0;
    border-bottom: 1px solid rgba(40, 43, 62, 0.5);
    transition: all 0.3s;
    position: relative;
    
    &:hover {
      background: rgba(240, 185, 11, 0.08);
      padding-left: 0.5rem;
    }
    
    &:after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(240, 185, 11, 0.5), transparent);
      transition: width 0.3s ease-in-out;
    }
    
    &:hover:after {
      width: 100%;
    }
  }
  
  .row:last-child {
    border-bottom: none;
  }
  
  .cell {
    font-size: 0.95rem;
    color: #B7BDC6;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s;
    
    svg {
      transition: transform 0.3s ease;
    }
    
    &:hover svg {
      transform: scale(1.2);
    }
  }
  
  .cell:last-child {
    text-align: right;
    color: #f0b90b;
    justify-content: flex-end;
    font-weight: 500;
    text-shadow: 0 0 10px rgba(240, 185, 11, 0.2);
    
    &:hover {
      text-shadow: 0 0 15px rgba(240, 185, 11, 0.4);
    }
  }
  
  svg {
    color: #f0b90b;
  }
`;

const PodiumContainer = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  margin: 4rem 0;
  perspective: 1000px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }
`;

const PodiumPosition = styled.div`
  position: relative;
  width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transform: translateY(${props => props.$position === 0 ? '-25px' : '0'}) 
             rotateY(${props => props.$position === 0 ? '0deg' : props.$position === 1 ? '-10deg' : '10deg'});
  animation: ${fadeIn} 0.5s ease-out ${props => props.$position * 0.3}s both;
  
  @media (max-width: 768px) {
    transform: none;
    order: ${props => props.$position === 0 ? '0' : props.$position === 1 ? '1' : '2'};
  }
`;

const PodiumBox = styled.div`
  background: linear-gradient(135deg, #1A1C2A, #242738);
  border-radius: 16px;
  width: 100%;
  padding: 1.8rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  border: 1px solid ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
  transform: scale(${props => props.$position === 0 ? '1.1' : '1'});
  position: relative;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: scale(${props => props.$position === 0 ? '1.15' : '1.05'});
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${props => props.$position === 0 ? '6px' : '4px'};
    background: ${props => 
      props.$position === 0 
        ? 'linear-gradient(90deg, #f0b90b, #ffee58, #f0b90b)' 
        : props.$position === 1 
          ? 'linear-gradient(90deg, #A3A3A3, #FFFFFF, #A3A3A3)' 
          : 'linear-gradient(90deg, #CD7F32, #FFA07A, #CD7F32)'};
    background-size: 200% auto;
    animation: ${shine} 3s linear infinite;
  }
  
  &::after {
    content: '${props => props.$position === 0 ? '1st' : props.$position === 1 ? '2nd' : '3rd'}';
    position: absolute;
    top: 10px;
    right: 10px;
    background: ${props => 
      props.$position === 0 ? '#f0b90b' : 
      props.$position === 1 ? '#A3A3A3' : 
      '#CD7F32'};
    color: #000;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    opacity: 0.9;
  }
  
  h3 {
    margin: 0 0 0.8rem;
    color: ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  @media (max-width: 768px) {
    transform: none;
    width: 240px;
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

const TrophyIcon = styled.div`
  position: absolute;
  top: -35px;
  z-index: 2;
  color: ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
  font-size: ${props => props.$position === 0 ? '2.5rem' : '2.2rem'};
  animation: ${float} 4s infinite ease-in-out;
  background: radial-gradient(circle, rgba(26, 28, 42, 0.95), rgba(19, 20, 31, 0.9));
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), 
              0 0 10px ${props => 
                props.$position === 0 ? 'rgba(240, 185, 11, 0.5)' : 
                props.$position === 1 ? 'rgba(163, 163, 163, 0.5)' : 
                'rgba(205, 127, 50, 0.5)'};
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
  background: linear-gradient(135deg, #1A1C2A, #242738);
  border-radius: 16px;
  padding: 1.8rem;
  margin-bottom: 2.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid #282B3E;
  text-align: center;
  animation: ${fadeIn} 0.8s ease-out;
  
  h3 {
    margin-top: 0;
    color: #fff;
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
  
  p {
    margin: 0.8rem 0;
    color: #B7BDC6;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .highlight {
    color: #f0b90b;
    font-weight: bold;
    font-size: 1.4rem;
    text-shadow: 0 0 10px rgba(240, 185, 11, 0.3);
  }
`;

const LeaderboardContainer = styled.div`
  background: linear-gradient(135deg, #13141C, #1e2033, #13141C);
  background-size: 200% 200%;
  animation: ${gradientMove} 15s ease infinite;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border: 1px solid #282B3E;
  animation: ${fadeIn} 1s ease-out;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #f0b90b, #ffee58, #f0b90b);
    background-size: 200% auto;
    animation: ${shine} 3s linear infinite;
    opacity: 0.8;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 100%);
    transform: rotate(45deg);
    animation: ${shine} 7s infinite;
    z-index: 1;
  }
  
  h2 {
    margin-top: 0;
    color: #fff;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    position: relative;
    z-index: 2;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  }
  
  svg {
    color: #f0b90b;
    animation: ${pulse} 3s infinite ease-in-out;
  }
`;

const LeaderboardHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  padding: 0.8rem 1.2rem;
  background: linear-gradient(135deg, rgba(26, 28, 42, 0.8), rgba(31, 33, 53, 0.8));
  background-size: 200% 200%;
  animation: ${gradientMove} 10s ease infinite;
  border-radius: 10px;
  margin-bottom: 0.8rem;
  font-weight: bold;
  color: #B7BDC6;
  border: 1px solid rgba(40, 43, 62, 0.8);
  position: relative;
  z-index: 2;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  
  span {
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    transition: all 0.3s;
    
    &:hover {
      color: #f0b90b;
    }
  }
`;

const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  padding: 1rem 1.2rem;
  background: ${props => props.$isCurrentUser ? 
    'linear-gradient(90deg, rgba(240, 185, 11, 0.1), rgba(240, 185, 11, 0.05))' : 
    'linear-gradient(90deg, rgba(26, 28, 42, 0.6), rgba(36, 39, 56, 0.6))'};
  background-size: 200% 200%;
  animation: ${props => props.$isCurrentUser ? 
    css`${gradientMove} 8s ease infinite, ${fadeIn} 0.3s ease-in-out ${props => props.$index * 0.03}s both` : 
    css`${fadeIn} 0.3s ease-in-out ${props => props.$index * 0.03}s both`};
  border-radius: 10px;
  margin-bottom: 0.6rem;
  align-items: center;
  border: 1px solid ${props => props.$isCurrentUser ? 'rgba(240, 185, 11, 0.3)' : 'transparent'};
  transition: transform 0.3s, box-shadow 0.3s, background 0.3s;
  position: relative;
  z-index: 2;
  
  &:hover {
    background: ${props => props.$isCurrentUser ? 
      'linear-gradient(90deg, rgba(240, 185, 11, 0.15), rgba(240, 185, 11, 0.1))' : 
      'linear-gradient(90deg, rgba(36, 39, 56, 0.8), rgba(46, 49, 66, 0.8))'};
    transform: translateX(5px) scale(1.01);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 3;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: ${props => props.$isCurrentUser ? '100%' : '0'};
    height: 1px;
    background: linear-gradient(90deg, #f0b90b, transparent);
    transition: width 0.4s ease-in-out;
  }
  
  &:hover::after {
    width: 100%;
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

const Competition = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Fetch users with OSCAR token balances
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Get all users and filter for those with OSCAR balance
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        const userData = [];
        querySnapshot.forEach(doc => {
          const user = doc.data();
          // Check if user has OSCAR balance
          const oscarBalance = user.balances?.OSCAR || 0;
          
          if (oscarBalance > 0) {
            userData.push({
              id: doc.id,
              name: user.displayName || 'Anonymous',
              email: user.email || '',
              photoURL: user.photoURL || '',
              balance: oscarBalance
            });
          }
        });
        
        // Sort by OSCAR balance descending
        const sortedUsers = userData.sort((a, b) => b.balance - a.balance);
        
        setUsers(sortedUsers);
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
  }, [currentUser]);
  
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
  
  // Get top 3 users for podium
  const topUsers = users.slice(0, 3);
  
  return (
    <Container>
      {/* Add Oscar Logo Box */}
      <LogoContainer>
        <LogoBox>
          <LogoImage>
            <img src={oscarLogo} alt="OSCAR" />
          </LogoImage>
          <LogoText>OSCAR</LogoText>
        </LogoBox>
      </LogoContainer>
      
      <PageHeader>
        <Label>COMPETITION</Label>
      </PageHeader>
    
      <CompetitionHeader>
        <Title>$OSCAR Deposit Competition</Title>
        
        <CompetitionInfo>
          <h3><BiDollar /> Reward Pool</h3>
          <p className="highlight">20,000 USDT</p>
          <p><FaCoins /> Top 100 users who deposit the highest amount of $OSCAR</p>
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
              <div className="cell">6 days</div>
            </div>
            <div className="row">
              <div className="cell"><FaClock /> Start Date</div>
              <div className="cell">16th April 4pm UTC</div>
            </div>
            <div className="row">
              <div className="cell"><FaClock /> End Date</div>
              <div className="cell">22nd April 4pm UTC</div>
            </div>
            <div className="row">
              <div className="cell"><FaClock /> Rewards Distribution</div>
              <div className="cell">23rd April 4pm UTC</div>
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
          <div className="row">
            <div className="cell"><GiLaurelCrown /> 1st Place</div>
            <div className="cell">2,000 USDT</div>
          </div>
          <div className="row">
            <div className="cell"><FaTrophy /> 2nd Place</div>
            <div className="cell">1,000 USDT</div>
          </div>
          <div className="row">
            <div className="cell"><FaMedal /> 3rd Place</div>
            <div className="cell">800 USDT</div>
          </div>
          <div className="row">
            <div className="cell">4th Place</div>
            <div className="cell">700 USDT</div>
          </div>
          <div className="row">
            <div className="cell">5th Place</div>
            <div className="cell">500 USDT</div>
          </div>
          <div className="row">
            <div className="cell">6th - 10th Places</div>
            <div className="cell">400 USDT/each</div>
          </div>
          <div className="row">
            <div className="cell">11th - 50th Places</div>
            <div className="cell">200 USDT/each</div>
          </div>
          <div className="row">
            <div className="cell">51st - 100th Places</div>
            <div className="cell">100 USDT/each</div>
          </div>
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
                          <FaCoins /> {user.balance.toLocaleString()} OSCAR
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
                        <FaCoins /> {user.balance.toLocaleString()} OSCAR
                      </AmountCell>
                    </LeaderboardRow>
                  );
                })}
              </>
            ) : (
              <EmptyState>
                <FaCoins />
                <p>No users found with OSCAR tokens.</p>
              </EmptyState>
            )}
          </LeaderboardContainer>
        </>
      )}
    </Container>
  );
};

export default Competition; 