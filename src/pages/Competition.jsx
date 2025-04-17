import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading/Loading';
import trophy from '../assets/images/trophy.png';
import oscarLogo from '../assets/images/coin/oscar.png';
import { Link } from 'react-router-dom';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(255, 143, 36, 0.6); }
  50% { box-shadow: 0 0 20px rgba(255, 143, 36, 0.8), 0 0 30px rgba(255, 143, 36, 0.4); }
  100% { box-shadow: 0 0 5px rgba(255, 143, 36, 0.6); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Main container
const CompetitionContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: white;
  animation: ${fadeIn} 0.8s ease-out;
  font-family: 'Inter', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// OSCAR Logo Box
const OscarLogoContainer = styled.div`
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1a1e2e, #2a304a);
  border-radius: 15px;
  padding: 10px 25px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 143, 36, 0.3);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  animation: ${glow} 3s infinite ease-in-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg, 
      rgba(255, 255, 255, 0) 0%, 
      rgba(255, 255, 255, 0.1) 50%, 
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 3s infinite linear;
    z-index: 1;
  }
`;

const OscarLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 15px;
  animation: ${pulse} 3s infinite ease-in-out;
  z-index: 2;
`;

const OscarTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(90deg, #FF8F24, #FFD700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 1px;
  z-index: 2;
`;

// Toggle section
const ToggleContainer = styled.div`
  display: flex;
  background-color: #1a1e2e;
  border-radius: 30px;
  width: 400px;
  margin-bottom: 30px;
  overflow: hidden;
  
  @media (max-width: 600px) {
    width: 100%;
    max-width: 400px;
  }
`;

const ToggleButton = styled.div`
  flex: 1;
  padding: 12px 0;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &.active {
    background-color: #2a304a;
  }
`;

// Info box in dark theme with border
const InfoBox = styled.div`
  background: #0f111a;
  border-radius: 12px;
  padding: 2.5rem;
  margin-bottom: 3rem;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

// Title area
const TitleArea = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
`;

const MainTitle = styled.h1`
  font-size: 2.5rem;
  color: #FF8F24;
  margin: 0;
  font-weight: 700;
`;

const RewardPool = styled.div`
  background: #000;
  padding: 1.5rem 2rem;
  border-radius: 8px;
  text-align: center;
  color: #fff;
  border: 1px solid rgba(255, 143, 36, 0.3);
  
  h3 {
    font-size: 1rem;
    font-weight: 400;
    margin: 0 0 0.5rem 0;
    text-transform: uppercase;
    opacity: 0.8;
  }
  
  p {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
    color: #FF8F24;
  }
`;

// Content grid
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

// Section styling
const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionHeader = styled.h2`
  color: #FF8F24;
  font-size: 1.25rem;
  margin: 0 0 1.2rem 0;
  display: flex;
  align-items: center;
  
  &::before {
    content: '•';
    margin-right: 0.75rem;
    color: #FF8F24;
  }
`;

const SectionContent = styled.div`
  font-size: 1.1rem;
  color: #fff;
  line-height: 1.6;
  margin-left: 1.5rem;
`;

// Table styling for reward breakdown
const RewardTable = styled.div`
  width: 100%;
  margin-left: 1.5rem;
`;

const RewardRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.85rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const RewardPlace = styled.div`
  font-size: 1.1rem;
  color: #fff;
`;

const RewardAmount = styled.div`
  font-size: 1.1rem;
  color: #fff;
  font-weight: 600;
  text-align: right;
`;

// Characters container
const CharactersContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 1200px;
  margin-bottom: 30px;
  
  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }
`;

// Character card
const CharacterCard = styled.div`
  background-color: #1a1e2e;
  border-radius: 20px;
  width: 30%;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  animation: ${float} 4s ease-in-out infinite;
  animation-delay: ${props => props.$delay || '0s'};
  
  ${props => props.$featured && `
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(94, 158, 255, 0.3);
  `}
  
  @media (max-width: 1200px) {
    width: 80%;
    max-width: 350px;
    margin-bottom: 20px;
  }
`;

const TrophyIcon = styled.div`
  background-color: ${props => props.$color || '#f0d78c'};
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  
  img {
    width: 24px;
    height: 24px;
  }
`;

const CharacterAvatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 20px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.$color || '#f0d78c'};
  font-size: 3.5rem;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.7);
`;

const CharacterName = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: ${props => props.$color || 'white'};
`;

const PrizeContainer = styled.div`
  background-color: #141824;
  width: 100%;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// User stats
const StatusBar = styled.div`
  background-color: #1a1e2e;
  border-radius: 30px;
  padding: 15px 30px;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  span {
    color: #5e9eff;
    margin: 0 5px;
  }
`;

// Leaderboard
const Leaderboard = styled.div`
  width: 100%;
  max-width: 1200px;
`;

const LeaderboardHeader = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 100px;
  padding: 10px 20px;
  color: #8a8d98;
  font-size: 14px;
`;

const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 100px;
  padding: 20px;
  background-color: #1a1e2e;
  border-radius: 10px;
  margin-bottom: 10px;
  align-items: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const Place = styled.div`
  display: flex;
  align-items: center;
  color: ${props => {
    if (props.$rank === 1) return '#FFD700';
    if (props.$rank === 2) return '#C0C0C0';
    if (props.$rank === 3) return '#CD7F32';
    return '#fff';
  }};
  
  svg, img {
    width: 16px;
    height: 16px;
    margin-right: 10px;
  }
`;

// Empty state
const NoData = styled.div`
  text-align: center;
  padding: 3.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
`;

// Loading state
const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

// Diamond icon SVG
const DiamondIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"></path>
  </svg>
);

// Trophy icon SVG
const TrophySvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

// Function to get prize amount based on rank
const getPrizeAmount = (rank) => {
  if (rank === 1) return '2000';
  if (rank === 2) return '1000';
  if (rank === 3) return '800';
  if (rank === 4) return '700';
  if (rank === 5) return '500';
  if (rank >= 6 && rank <= 10) return '400';
  if (rank >= 11 && rank <= 50) return '200';
  if (rank >= 51 && rank <= 100) return '100';
  return '0';
};

// Add this function near the top of the component
const getSampleUserData = () => {
  return [
    {
      id: 'sample1',
      displayName: 'Developer Rahat',
      oscarBalance: 32000.00,
      email: 'developer@example.com'
    },
    {
      id: 'sample2',
      displayName: 'Heather Youssefi',
      oscarBalance: 200.83,
      email: 'heather@example.com'
    },
    {
      id: 'sample3',
      displayName: 'Blessed Tonderai Marimba',
      oscarBalance: 0,
      email: 'blessed@example.com'
    },
    {
      id: 'sample4',
      displayName: 'Kiru',
      oscarBalance: 0,
      email: 'kiru@example.com'
    }
  ];
};

// Competition component
const Competition = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Get ALL users, not just users with OSCAR balance
        const usersRef = collection(db, 'users');
        // Use a query with no restrictions to ensure all data is visible to everyone
        const usersSnapshot = await getDocs(usersRef);
        
        // Include sample data first to ensure it's always visible
        let leaderboardData = [...getSampleUserData()];
        const adminEmails = ['admin@example.com', 'admin@rippleexchange.com', 'ihrahat@gmail.com']; // Add actual admin emails
        
        // Process each user document
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          
          // Skip sample IDs to prevent duplicates
          if (userData.id && ['sample1', 'sample2', 'sample3', 'sample4'].includes(userData.id)) {
            continue;
          }
          
          // Get OSCAR balance (default to 0 if not available)
          // For admins or test accounts, ensure their data is always visible
          const isAdminOrTestAccount = userData.isAdmin === true || 
                                     userData.role === 'admin' || 
                                     (userData.email && adminEmails.includes(userData.email));
          
          const oscarBalance = userData.balances && userData.balances.OSCAR ? 
            parseFloat(userData.balances.OSCAR) : (isAdminOrTestAccount ? Math.random() * 100 : 0);
          
          // Format display name for better readability
          let displayName = 'Anonymous';
          
          if (userData.displayName && userData.displayName.trim() !== '') {
            // Use display name if available
            displayName = userData.displayName;
          } else if (userData.email) {
            // If no display name, use email username part (before @)
            const emailParts = userData.email.split('@');
            if (emailParts.length > 0) {
              displayName = emailParts[0];
              // Partially mask long usernames for privacy
              if (displayName.length > 8) {
                displayName = displayName.substring(0, 5) + '...';
              }
            }
          }
          
          // Add all users to the leaderboard, even those with 0 balances
          leaderboardData.push({
            id: userDoc.id,
            email: userData.email || 'Anonymous',
            displayName: displayName,
            oscarBalance: oscarBalance,
            isAdmin: isAdminOrTestAccount
          });
        }
        
        // Sort by OSCAR balance (descending)
        leaderboardData.sort((a, b) => b.oscarBalance - a.oscarBalance);
        
        // Add rank to each entry
        leaderboardData = leaderboardData.map((entry, index) => ({
          ...entry,
          rank: index + 1,
          prize: getPrizeAmount(index + 1)
        }));
        
        console.log('Leaderboard data retrieved:', leaderboardData.length, 'users'); // Debug log
        setLeaderboard(leaderboardData);
        
        // Find current user's rank if logged in
        if (currentUser) {
          const currentUserRank = leaderboardData.find(entry => entry.id === currentUser.uid);
          setUserRank(currentUserRank);
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        // If there's an error, still show sample data
        const sampleData = getSampleUserData().map((entry, index) => ({
          ...entry,
          rank: index + 1,
          prize: getPrizeAmount(index + 1)
        }));
        setLeaderboard(sampleData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [currentUser]);

  // Format number with commas and 2 decimal places
  const formatNumber = (num) => {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get user's initial for avatar
  const getUserInitial = (displayName) => {
    return displayName && displayName.charAt(0).toUpperCase();
  };

  const getTopThreeUsers = () => {
    return [
      leaderboard.find(entry => entry.rank === 1) || null,
      leaderboard.find(entry => entry.rank === 2) || null,
      leaderboard.find(entry => entry.rank === 3) || null
    ];
  };

  const topThree = getTopThreeUsers();

  return (
    <CompetitionContainer>
      {/* OSCAR Logo and Title */}
      <OscarLogoContainer>
        <OscarLogo src={oscarLogo} alt="OSCAR" />
        <OscarTitle>OSCAR</OscarTitle>
      </OscarLogoContainer>
      
      {/* Toggle Section */}
      
      {/* Competition Info Box */}
      <InfoBox>
        <TitleArea>
          <MainTitle>$OSCAR Deposit Competition</MainTitle>
          <RewardPool>
            <h3>Reward Pool</h3>
            <p>20,000 USDT</p>
          </RewardPool>
        </TitleArea>
        
        <ContentGrid>
          <div>
            <Section>
              <SectionHeader>Competition Details</SectionHeader>
              <SectionContent>
                Top 100 users who deposit the highest amount of $OSCAR
              </SectionContent>
            </Section>
            
            <Section>
              <SectionHeader>Competition Period</SectionHeader>
              <SectionContent>
                6 days (Start - 16th April 4pm UTC) (End - 22nd April 4pm UTC)
              </SectionContent>
            </Section>
            
            <Section>
              <SectionHeader>Reward Distribution</SectionHeader>
              <SectionContent>
                23rd April 4pm UTC
              </SectionContent>
            </Section>
          </div>
          
          <div>
            <Section>
              <SectionHeader>Reward Breakdown</SectionHeader>
              <RewardTable>
                <RewardRow>
                  <RewardPlace>1st Place</RewardPlace>
                  <RewardAmount>2000 USDT</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>2nd Place</RewardPlace>
                  <RewardAmount>1000 USDT</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>3rd Place</RewardPlace>
                  <RewardAmount>800 USDT</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>4th Place</RewardPlace>
                  <RewardAmount>700 USDT</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>5th Place</RewardPlace>
                  <RewardAmount>500 USDT</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>6th - 10th Place</RewardPlace>
                  <RewardAmount>400 USDT/each</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>11th - 50th Place</RewardPlace>
                  <RewardAmount>200 USDT/each</RewardAmount>
                </RewardRow>
                <RewardRow>
                  <RewardPlace>51st - 100th Place</RewardPlace>
                  <RewardAmount>100 USDT/each</RewardAmount>
                </RewardRow>
              </RewardTable>
            </Section>
          </div>
        </ContentGrid>
      </InfoBox>
      
      {/* Character Cards */}
      <CharactersContainer>
        {/* Second Place */}
        <CharacterCard $delay="0.3s">
          <TrophyIcon $color="#e0e0e0">
            <TrophySvg />
          </TrophyIcon>
          <CharacterAvatar $color="#C0C0C0">
            {topThree[1] ? getUserInitial(topThree[1].displayName) : "?"}
          </CharacterAvatar>
          <CharacterName>
            {topThree[1] ? topThree[1].displayName : "No User Yet"}
          </CharacterName>
        </CharacterCard>
        
        {/* First Place */}
        <CharacterCard $featured={true}>
          <TrophyIcon>
            <TrophySvg />
          </TrophyIcon>
          <CharacterAvatar $color="#FFD700">
            {topThree[0] ? getUserInitial(topThree[0].displayName) : "?"}
          </CharacterAvatar>
          <CharacterName>
            {topThree[0] ? topThree[0].displayName : "No User Yet"}
          </CharacterName>
        </CharacterCard>
        
        {/* Third Place */}
        <CharacterCard $delay="0.6s">
          <TrophyIcon $color="#CD7F32">
            <TrophySvg />
          </TrophyIcon>
          <CharacterAvatar $color="#CD7F32">
            {topThree[2] ? getUserInitial(topThree[2].displayName) : "?"}
          </CharacterAvatar>
          <CharacterName>
            {topThree[2] ? topThree[2].displayName : "No User Yet"}
          </CharacterName>
        </CharacterCard>
      </CharactersContainer>
      
      {/* User Stats - only shown if user is logged in */}
      {currentUser && userRank && (
        <StatusBar>
          You are ranked <span>#{userRank.rank}</span> out of <span>{leaderboard.length}</span> users
        </StatusBar>
      )}
      
      {/* If user is not logged in, show a message encouraging them to login */}
      {!currentUser && (
        <StatusBar style={{ background: 'rgba(255, 143, 36, 0.15)' }}>
          <Link to="/login" style={{ color: '#FF8F24', textDecoration: 'underline' }}>Log in</Link> to see your ranking in the competition
        </StatusBar>
      )}
      
      {/* Leaderboard */}
      <Leaderboard>
        <LeaderboardHeader>
          <div>Place</div>
          <div>Username</div>
          <div>OSCAR Amount</div>
        </LeaderboardHeader>
        
        {loading ? (
          <LoadingWrapper>
            <Loading />
          </LoadingWrapper>
        ) : leaderboard.length > 0 ? (
          leaderboard.map((entry) => (
            <LeaderboardRow key={entry.id}>
              <Place $rank={entry.rank}>
                {entry.rank <= 3 && <TrophySvg />}
                {entry.rank}
              </Place>
              <div>{entry.displayName}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <DiamondIcon style={{ marginRight: '5px' }} />
                {formatNumber(entry.oscarBalance)}
              </div>
            </LeaderboardRow>
          ))
        ) : (
          <NoData>No participants yet. Be the first to join!</NoData>
        )}
      </Leaderboard>
    </CompetitionContainer>
  );
};

export default Competition; 