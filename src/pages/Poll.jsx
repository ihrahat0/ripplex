import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, serverTimestamp, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create the missing components inline
const Container = styled.div`
  width: 100%;
  padding: 0 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const MainContent = styled.div`
  padding: 40px 0;
`;

const LoaderContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const SpinnerAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 114, 90, 0.2);
  border-top: 5px solid #ff725a;
  border-radius: 50%;
  animation: ${SpinnerAnimation} 1s linear infinite;
`;

const Loader = () => (
  <LoaderContainer>
    <Spinner />
  </LoaderContainer>
);

// Add the missing Label component
const Label = styled.label`
  font-size: 14px;
  color: #cbd5e1;
  margin-bottom: 8px;
  display: block;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

const PollPageTitle = styled.h1`
  font-size: 32px;
  margin-bottom: 30px;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  text-shadow: 0 2px 10px rgba(255, 114, 90, 0.3);
  animation: ${fadeIn} 0.6s ease-out;
  
  i {
    margin-right: 12px;
    color: #ff725a;
    animation: ${pulse} 2s infinite ease-in-out;
  }
`;

const PollsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
  animation: ${fadeIn} 0.8s ease-out;
`;

const cardEnter = keyframes`
  0% { 
    opacity: 0;
    transform: translateY(30px);
  }
  100% { 
    opacity: 1;
    transform: translateY(0);
  }
`;

const glowEffect = keyframes`
  0% { box-shadow: 0 0 10px rgba(255, 114, 90, 0.2); }
  50% { box-shadow: 0 0 20px rgba(255, 114, 90, 0.4); }
  100% { box-shadow: 0 0 10px rgba(255, 114, 90, 0.2); }
`;

const PollCard = styled.div`
  background: linear-gradient(145deg, #1e293b, #1a2234);
  border-radius: 16px;
  padding: 25px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(51, 65, 85, 0.6);
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: ${cardEnter} 0.5s forwards;
  animation-delay: ${props => props.$index * 0.1}s;
  opacity: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 6px;
    background: linear-gradient(90deg, #ff725a, #ff9f7e);
    opacity: ${props => props.$active ? 1 : 0.3};
  }
  
  ${props => props.$active && css`
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    }
  `}
  
  ${props => !props.$active && css`
    opacity: 0.7;
    background: linear-gradient(145deg, #1a2234, #161d2c);
    filter: grayscale(30%);
  `}
`;

const Badge = styled.span`
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: white;
  background: ${props => props.$active ? 
    'linear-gradient(90deg, #10b981, #059669)' : 
    'linear-gradient(90deg, #6b7280, #4b5563)'};
  box-shadow: ${props => props.$active ? 
    '0 3px 10px rgba(16, 185, 129, 0.2)' : 
    '0 3px 10px rgba(107, 114, 128, 0.2)'};
  text-transform: uppercase;
  animation: ${pulse} 2s infinite ease-in-out;
`;

const ParticipantsBadge = styled.span`
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: linear-gradient(90deg, #0284c7, #0369a1);
  box-shadow: 0 3px 10px rgba(2, 132, 199, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
  
  i {
    animation: ${pulse} 2s infinite ease-in-out;
    font-size: 14px;
  }
`;

const PollTitle = styled.h3`
  margin: 35px 0 15px;
  font-size: 20px;
  color: #f8fafc;
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: 1.4;
  position: relative;
  padding-bottom: 12px;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, #ff725a, transparent);
    border-radius: 3px;
  }
`;

const PollDescription = styled.p`
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 25px;
  flex-grow: 1;
`;

const buttonShine = keyframes`
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
`;

const PollButton = styled.button`
  background: ${props => props.$voted ? 
    'linear-gradient(90deg, #059669, #10b981)' : 
    'linear-gradient(90deg, #ff725a, #e65a45)'};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px 0;
  font-weight: 600;
  font-size: 15px;
  cursor: ${props => props.$active ? 'pointer' : 'not-allowed'};
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: ${props => props.$voted ? 
    '0 4px 15px rgba(16, 185, 129, 0.2)' : 
    '0 4px 15px rgba(255, 114, 90, 0.2)'};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: ${buttonShine} 3s infinite linear;
  }
  
  &:hover {
    background: ${props => props.$voted ? 
      'linear-gradient(90deg, #047857, #0d9488)' : 
      'linear-gradient(90deg, #e65a45, #f43f5e)'};
    transform: ${props => props.$active ? 'translateY(-3px)' : 'none'};
    box-shadow: ${props => props.$active ? 
      (props.$voted ? 
        '0 8px 20px rgba(16, 185, 129, 0.3)' : 
        '0 8px 20px rgba(255, 114, 90, 0.3)') : 
      'none'};
  }
  
  &:disabled {
    background: linear-gradient(90deg, #4b5563, #6b7280);
    cursor: not-allowed;
    box-shadow: none;
  }
  
  i {
    font-size: 16px;
    animation: ${pulse} 2s infinite ease-in-out;
  }
`;

const overlayFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const modalScaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  animation: ${overlayFadeIn} 0.3s ease-out;
`;

const ModalContainer = styled.div`
  background: linear-gradient(145deg, #1e293b, #172032);
  border-radius: 20px;
  padding: 35px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid rgba(51, 65, 85, 0.8);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 114, 90, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05);
  animation: ${modalScaleIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 114, 90, 0.5);
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 114, 90, 0.7);
  }
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  color: #f8fafc;
  margin-bottom: 8px;
  position: relative;
  padding-bottom: 15px;
  font-weight: 600;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #ff725a, transparent);
    border-radius: 3px;
  }
`;

const ModalDescription = styled.p`
  color: #cbd5e1;
  margin-bottom: 25px;
  font-size: 15px;
  line-height: 1.6;
`;

const closeRotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(90deg);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(15, 23, 42, 0.5);
  border: none;
  color: #cbd5e1;
  font-size: 20px;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  
  &:hover {
    color: white;
    background: rgba(255, 114, 90, 0.2);
    animation: ${closeRotate} 0.3s forwards;
  }
`;

const optionEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 25px;
`;

const OptionButton = styled.button`
  background: ${props => props.$selected ? 
    'linear-gradient(90deg, #ff725a, #e65a45)' : 
    'linear-gradient(145deg, #1a2234, #151d2d)'};
  color: white;
  border: 1px solid ${props => props.$selected ? 
    'transparent' : 
    'rgba(51, 65, 85, 0.8)'};
  border-radius: 12px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 15px;
  position: relative;
  overflow: hidden;
  box-shadow: ${props => props.$selected ? 
    '0 5px 15px rgba(255, 114, 90, 0.3)' : 
    '0 2px 5px rgba(0, 0, 0, 0.1)'};
  animation: ${optionEnter} 0.5s forwards;
  animation-delay: ${props => props.$index * 0.1}s;
  opacity: 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: all 0.5s ease;
  }
  
  &:hover {
    background: ${props => props.$selected ? 
      'linear-gradient(90deg, #e65a45, #f43f5e)' : 
      'linear-gradient(145deg, #1e293b, #192436)'};
    transform: translateY(-3px);
    box-shadow: ${props => props.$selected ? 
      '0 8px 20px rgba(255, 114, 90, 0.4)' : 
      '0 5px 15px rgba(0, 0, 0, 0.2)'};
    
    &::before {
      left: 100%;
    }
  }
  
  ${props => props.$selected && `
    &::after {
      content: '✓';
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
    }
  `}
`;

const CustomOptionContainer = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(51, 65, 85, 0.8);
  animation: ${fadeIn} 0.5s ease-out;
`;

const CustomOptionInput = styled.input`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 12px;
  padding: 14px 15px;
  width: 100%;
  color: white;
  margin-bottom: 15px;
  font-size: 15px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
    box-shadow: 0 0 0 3px rgba(255, 114, 90, 0.2);
  }
  
  &::placeholder {
    color: rgba(203, 213, 225, 0.4);
  }
`;

const TextResponseInput = styled.textarea`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(51, 65, 85, 0.8);
  border-radius: 12px;
  padding: 14px 15px;
  width: 100%;
  color: white;
  margin-bottom: 25px;
  resize: vertical;
  min-height: 120px;
  font-size: 15px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
    box-shadow: 0 0 0 3px rgba(255, 114, 90, 0.2);
  }
  
  &::placeholder {
    color: rgba(203, 213, 225, 0.4);
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(90deg, #ff725a, #e65a45);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-weight: 600;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(255, 114, 90, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    animation: ${buttonShine} 3s infinite linear;
  }
  
  &:hover {
    background: linear-gradient(90deg, #e65a45, #f43f5e);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(255, 114, 90, 0.3);
  }
  
  &:disabled {
    background: linear-gradient(90deg, #4b5563, #6b7280);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ResultsContainer = styled.div`
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(51, 65, 85, 0.8);
  animation: ${fadeIn} 0.6s ease-out;
`;

const ResultBar = styled.div`
  margin-bottom: 18px;
  animation: ${fadeIn} 0.5s forwards;
  animation-delay: ${props => props.$index * 0.1}s;
  opacity: 0;
`;

const ResultLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  
  span:first-child {
    color: #f1f5f9;
    font-weight: 500;
  }
  
  span:last-child {
    color: #94a3b8;
    font-weight: 600;
  }
`;

const progressAnim = props => keyframes`
  from {
    width: 0%;
  }
  to {
    width: ${props.$percentage}%;
  }
`;

const ProgressBar = styled.div`
  height: 12px;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  
  div {
    height: 100%;
    background: linear-gradient(90deg, #ff725a, #e65a45);
    border-radius: 6px;
    width: ${props => props.$percentage}%;
    transition: width 1s ease-out;
    box-shadow: 0 0 10px rgba(255, 114, 90, 0.3);
    position: relative;
    overflow: hidden;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.1),
        transparent
      );
      animation: ${shimmer} 3s infinite linear;
      background-size: 200% 100%;
    }
  }
`;

const NoActivePolls = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
  font-size: 16px;
  animation: ${fadeIn} 0.6s ease-out;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 16px;
  border: 1px dashed rgba(51, 65, 85, 0.6);
  
  i {
    font-size: 60px;
    margin-bottom: 20px;
    display: block;
    color: rgba(255, 114, 90, 0.6);
    animation: ${floatAnimation} 3s infinite ease-in-out;
  }
  
  p {
    font-size: 18px;
    line-height: 1.6;
  }
`;

const pulse2 = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

const EarnLabel = styled.span`
  background: linear-gradient(90deg, #ff725a, #f43f5e);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 30px;
  margin-left: 10px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 3px 10px rgba(255, 114, 90, 0.3);
  animation: ${pulse2} 2s infinite ease-in-out;
`;

const RewardBadge = styled.span`
  position: absolute;
  top: 55px;
  right: 20px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: linear-gradient(90deg, #ff725a, #f43f5e);
  box-shadow: 0 3px 10px rgba(255, 114, 90, 0.3);
  display: flex;
  align-items: center;
  gap: 4px;
  animation: ${pulse} 2s infinite ease-in-out;
  
  i {
    font-size: 14px;
  }
`;

// Popup styled components
const PopupOverlay = styled(ModalOverlay)`
  z-index: 1100;
`;

const PopupContainer = styled.div`
  background: linear-gradient(145deg, #1e293b, #172032);
  border-radius: 20px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  position: relative;
  border: 1px solid rgba(51, 65, 85, 0.8);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  animation: ${modalScaleIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
`;

const SuccessIcon = styled.div`
  font-size: 60px;
  color: #10b981;
  margin-bottom: 20px;
  animation: ${pulse} 1s ease-in-out;
`;

const PopupTitle = styled.h3`
  font-size: 22px;
  color: #f8fafc;
  margin-bottom: 15px;
  font-weight: 600;
`;

const PopupText = styled.p`
  color: #cbd5e1;
  margin-bottom: 25px;
  font-size: 16px;
  line-height: 1.6;
`;

const PopupButton = styled(SubmitButton)`
  max-width: 200px;
  margin: 0 auto;
`;

const Poll = () => {
  const { currentUser } = useAuth();
  const [polls, setPolls] = useState([]);
  const [userResponses, setUserResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [customOption, setCustomOption] = useState('');
  const [textResponse, setTextResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pollResults, setPollResults] = useState({});
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [earnedReward, setEarnedReward] = useState(0);
  const [userBalances, setUserBalances] = useState({ RIPPLEX: 0 });
  
  useEffect(() => {
    if (currentUser) {
      fetchPolls();
      fetchUserBalances();
    }
  }, [currentUser]);
  
  const fetchUserBalances = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserBalances(userData.balances || { RIPPLEX: 0 });
      }
    } catch (error) {
      console.error('Error fetching user balances:', error);
    }
  };
  
  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // Get all active and ended polls
      const pollsQuery = query(
        collection(db, 'polls'),
        orderBy('status'),
        orderBy('createdAt', 'desc')
      );
      const pollsSnapshot = await getDocs(pollsQuery);
      
      // Get user's responses
      const userResponsesQuery = query(
        collection(db, 'pollResponses'),
        where('userId', '==', currentUser.uid)
      );
      const userResponsesSnapshot = await getDocs(userResponsesQuery);
      
      const responsesMap = {};
      userResponsesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        responsesMap[data.pollId] = {
          id: doc.id,
          ...data
        };
      });
      
      const pollsData = [];
      for (const doc of pollsSnapshot.docs) {
        const poll = {
          id: doc.id,
          ...doc.data()
        };
        
        console.log("Fetched poll:", poll.id, poll.title, "Reward:", poll.rewardAmount || 0);
        
        // If poll results should be visible, fetch results
        if (shouldShowResults(poll, responsesMap[poll.id])) {
          await fetchPollResults(poll.id);
        }
        
        pollsData.push(poll);
      }
      
      setPolls(pollsData);
      setUserResponses(responsesMap);
    } catch (error) {
      console.error("Error fetching polls:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const shouldShowResults = (poll, userResponse) => {
    if (!poll) return false;
    
    // Admin only - never show
    if (poll.resultsVisibility === 'admin_only') return false;
    
    // Show instantly
    if (poll.resultsVisibility === 'instant') return true;
    
    // Show after user votes
    if (poll.resultsVisibility === 'after_vote' && userResponse) return true;
    
    // Show after poll ends
    if (poll.resultsVisibility === 'after_end' && poll.status === 'ended') return true;
    
    // Show at scheduled time
    if (poll.resultsVisibility === 'scheduled' && poll.resultsVisibleDate) {
      const visibleDate = poll.resultsVisibleDate.toDate ? 
        poll.resultsVisibleDate.toDate() : new Date(poll.resultsVisibleDate);
      return new Date() >= visibleDate;
    }
    
    return false;
  };
  
  const fetchPollResults = async (pollId) => {
    try {
      // Get the poll first
      const pollDoc = await getDoc(doc(db, 'polls', pollId));
      if (!pollDoc.exists()) return;
      
      const poll = pollDoc.data();
      
      // Get all responses for this poll
      const responsesQuery = query(
        collection(db, 'pollResponses'),
        where('pollId', '==', pollId)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      
      if (poll.type === 'options') {
        // Count each option
        const optionCounts = {};
        poll.options.forEach(option => {
          optionCounts[option] = 0;
        });
        
        // Count custom options too
        responsesSnapshot.docs.forEach(doc => {
          const response = doc.data();
          if (response.option) {
            if (!optionCounts[response.option]) {
              optionCounts[response.option] = 0;
            }
            optionCounts[response.option]++;
          }
        });
        
        // Calculate percentages
        const totalResponses = responsesSnapshot.size;
        const optionResults = Object.entries(optionCounts).map(([option, count]) => ({
          option,
          count,
          percentage: totalResponses ? Math.round((count / totalResponses) * 100) : 0
        })).sort((a, b) => b.count - a.count);
        
        setPollResults(prevResults => ({
          ...prevResults,
          [pollId]: {
            options: optionResults,
            totalResponses
          }
        }));
      } else {
        // For text responses, just count the total
        setPollResults(prevResults => ({
          ...prevResults,
          [pollId]: {
            totalResponses: responsesSnapshot.size
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching poll results:", error);
    }
  };
  
  const handleOpenPoll = (poll) => {
    console.log("Opening poll:", poll.id, poll.title, "Reward:", poll.rewardAmount || 0);
    setSelectedPoll(poll);
    setSelectedOption(null);
    setCustomOption('');
    setTextResponse('');
    setShowModal(true);
    
    // If user has already responded, pre-select their response
    const userResponse = userResponses[poll.id];
    if (userResponse) {
      console.log("User has already responded to this poll:", userResponse);
      if (poll.type === 'options') {
        setSelectedOption(userResponse.option);
      } else {
        setTextResponse(userResponse.text || '');
      }
    }
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPoll(null);
  };
  
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setCustomOption('');
  };
  
  const handleSubmit = async () => {
    if (!selectedPoll || !currentUser) return;
    
    // Validate inputs
    if (selectedPoll.type === 'options' && !selectedOption && !customOption) {
      alert('Please select an option or enter your own');
      return;
    }
    
    if (selectedPoll.type === 'text' && !textResponse.trim()) {
      alert('Please enter your response');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const existingResponse = userResponses[selectedPoll.id];
      const isNewResponse = !existingResponse;
      
      const responseData = {
        userId: currentUser.uid,
        pollId: selectedPoll.id,
        timestamp: serverTimestamp()
      };
      
      if (selectedPoll.type === 'options') {
        responseData.option = customOption || selectedOption;
        responseData.isCustomOption = !!customOption;
      } else {
        responseData.text = textResponse;
      }
      
      console.log("Submitting response:", responseData);
      
      if (existingResponse) {
        // Update existing response
        console.log("Updating existing response:", existingResponse.id);
        await updateDoc(doc(db, 'pollResponses', existingResponse.id), responseData);
      } else {
        // Create new response
        console.log("Creating new response");
        await addDoc(collection(db, 'pollResponses'), responseData);
        
        // Update poll response count
        console.log("Updating poll response count for:", selectedPoll.id);
        await updateDoc(doc(db, 'polls', selectedPoll.id), {
          responses: (selectedPoll.responses || 0) + 1
        });
        
        // Add reward if it's a new response and the poll has a reward
        if (selectedPoll.rewardAmount && selectedPoll.rewardAmount > 0) {
          console.log("Processing reward of", selectedPoll.rewardAmount, "RIPPLEX tokens");
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const balances = userData.balances || {};
            
            console.log("Current user balances:", balances);
            
            // Add reward to user's RIPPLEX balance
            await updateDoc(userRef, {
              'balances.RIPPLEX': (balances.RIPPLEX || 0) + selectedPoll.rewardAmount
            });
            
            console.log("Reward added to user balance");
            
            // Update local state
            setEarnedReward(selectedPoll.rewardAmount);
            setUserBalances({
              ...userBalances,
              RIPPLEX: (userBalances.RIPPLEX || 0) + selectedPoll.rewardAmount
            });
          } else {
            console.error("User document does not exist");
          }
        }
      }
      
      // If results should be visible after vote, fetch results
      if (selectedPoll.resultsVisibility === 'after_vote' || selectedPoll.resultsVisibility === 'instant') {
        await fetchPollResults(selectedPoll.id);
      }
      
      // Refresh polls and user responses
      await fetchPolls();
      
      // Close modal
      setShowModal(false);
      
      // Show success popup if new response with reward
      if (isNewResponse && selectedPoll.rewardAmount && selectedPoll.rewardAmount > 0) {
        setShowSuccessPopup(true);
      }
      
      setSelectedPoll(null);
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Failed to submit your response. Please try again: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setEarnedReward(0);
  };
  
  const renderPollResults = (pollId) => {
    const results = pollResults[pollId];
    if (!results) return null;
    
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.type !== 'options') return null;
    
    return (
      <ResultsContainer>
        <h4 style={{ marginBottom: '18px', color: '#f1f5f9', fontSize: '17px', fontWeight: '600' }}>
          Poll Results ({results.totalResponses} responses)
        </h4>
        {results.options.map(({ option, count, percentage }, index) => (
          <ResultBar key={option} $index={index}>
            <ResultLabel>
              <span>{option}</span>
              <span>{percentage}% ({count})</span>
            </ResultLabel>
            <ProgressBar $percentage={percentage}>
              <div />
            </ProgressBar>
          </ResultBar>
        ))}
      </ResultsContainer>
    );
  };
  
  if (loading) {
    return (
      <Container>
        <MainContent>
          <Loader />
        </MainContent>
      </Container>
    );
  }
  
  return (
    <Container>
      <MainContent>
        <PollPageTitle>
          <i className="bi bi-bar-chart-line"></i> Polls <EarnLabel>Earn</EarnLabel>
        </PollPageTitle>
        
        {polls.length === 0 ? (
          <NoActivePolls>
            <i className="bi bi-bar-chart-line"></i>
            <p>No polls available at the moment. Check back later!</p>
          </NoActivePolls>
        ) : (
          <PollsContainer>
            {polls.map((poll, index) => {
              const userResponse = userResponses[poll.id];
              const hasResponded = !!userResponse;
              const isActive = poll.status === 'active';
              const canShowResults = shouldShowResults(poll, userResponse);
              
              return (
                <PollCard key={poll.id} $active={isActive} $index={index}>
                  <Badge $active={isActive}>
                    {isActive ? 'Active' : 'Ended'}
                  </Badge>
                  
                  <ParticipantsBadge>
                    <i className="bi bi-people-fill"></i>
                    {poll.responses || 0}
                  </ParticipantsBadge>
                  
                  {poll.rewardAmount > 0 && isActive && (
                    <RewardBadge>
                      <i className="bi bi-coin"></i>
                      {poll.rewardAmount} RIPPLEX (${poll.rewardAmount})
                    </RewardBadge>
                  )}
                  
                  <PollTitle>{poll.title}</PollTitle>
                  <PollDescription>
                    {poll.description || 'No description provided.'}
                  </PollDescription>
                  
                  {canShowResults && (
                    renderPollResults(poll.id)
                  )}
                  
                  <PollButton 
                    onClick={() => handleOpenPoll(poll)} 
                    $active={isActive}
                    $voted={hasResponded}
                    disabled={!isActive}
                  >
                    {hasResponded ? (
                      <>
                        <i className="bi bi-check-circle-fill"></i> 
                        {canShowResults ? 'View Results' : 'Update Response'}
                      </>
                    ) : (
                      <>
                        Participate
                        {poll.rewardAmount > 0 && isActive && (
                          <span style={{ fontSize: '12px', marginLeft: '5px' }}>
                            • Earn {poll.rewardAmount} RIPPLEX (${poll.rewardAmount})
                          </span>
                        )}
                      </>
                    )}
                  </PollButton>
                </PollCard>
              );
            })}
          </PollsContainer>
        )}
        
        {showModal && selectedPoll && (
          <ModalOverlay onClick={handleCloseModal}>
            <ModalContainer onClick={e => e.stopPropagation()}>
              <CloseButton onClick={handleCloseModal}>
                <i className="bi bi-x-lg"></i>
              </CloseButton>
              
              <ModalTitle>{selectedPoll.title}</ModalTitle>
              {selectedPoll.description && (
                <ModalDescription>{selectedPoll.description}</ModalDescription>
              )}
              
              {selectedPoll.rewardAmount > 0 && (
                <div style={{ 
                  marginBottom: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255, 114, 90, 0.1)', 
                  padding: '12px', 
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 114, 90, 0.2)'
                }}>
                  <i className="bi bi-coin" style={{ color: '#ff725a', fontSize: '22px', marginRight: '12px' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#f8fafc' }}>Earn {selectedPoll.rewardAmount} RIPPLEX tokens (${selectedPoll.rewardAmount})</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Complete this poll to earn rewards</div>
                  </div>
                </div>
              )}
              
              {selectedPoll.type === 'options' ? (
                <>
                  <OptionsList>
                    {selectedPoll.options.map((option, index) => (
                      <OptionButton
                        key={option}
                        $selected={selectedOption === option}
                        onClick={() => handleOptionSelect(option)}
                        $index={index}
                      >
                        {option}
                      </OptionButton>
                    ))}
                  </OptionsList>
                  
                  {selectedPoll.allowUserOptions && (
                    <CustomOptionContainer>
                      <Label>Or add your own option:</Label>
                      <CustomOptionInput
                        type="text"
                        value={customOption}
                        onChange={(e) => {
                          setCustomOption(e.target.value);
                          if (e.target.value) setSelectedOption(null);
                        }}
                        placeholder="Enter your own option..."
                      />
                    </CustomOptionContainer>
                  )}
                </>
              ) : (
                <TextResponseInput
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder="Type your response here..."
                />
              )}
              
              <SubmitButton 
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Response'}
              </SubmitButton>
              
              {/* Show results if applicable */}
              {shouldShowResults(selectedPoll, userResponses[selectedPoll.id]) && pollResults[selectedPoll.id] && (
                renderPollResults(selectedPoll.id)
              )}
            </ModalContainer>
          </ModalOverlay>
        )}
        
        {showSuccessPopup && (
          <PopupOverlay onClick={handleCloseSuccessPopup}>
            <PopupContainer onClick={e => e.stopPropagation()}>
              <SuccessIcon>
                <i className="bi bi-check-circle-fill"></i>
              </SuccessIcon>
              <PopupTitle>Response Submitted!</PopupTitle>
              <PopupText>
                Your response has been successfully submitted.
                {earnedReward > 0 && (
                  <>
                    <br /><br />
                    <strong>Congratulations!</strong> You've earned {earnedReward} RIPPLEX tokens (${earnedReward})!
                  </>
                )}
              </PopupText>
              <PopupButton onClick={handleCloseSuccessPopup}>
                Close
              </PopupButton>
            </PopupContainer>
          </PopupOverlay>
        )}
      </MainContent>
    </Container>
  );
};

export default Poll; 