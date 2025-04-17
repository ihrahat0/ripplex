import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import defaultAvatar from '../assets/images/avatar.png';
import { FaTrophy, FaMedal } from 'react-icons/fa';
import { GiLaurelCrown } from 'react-icons/gi';

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

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  animation: ${fadeIn} 0.5s ease-in-out;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const CompetitionHeader = styled.div`
  background: #13141C;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #282B3E;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2.2rem;
  margin-bottom: 1rem;
  color: #f0b90b;
  grid-column: 1 / -1;
  text-align: center;
  letter-spacing: 0.5px;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const CompetitionInfo = styled.div`
  background: #1A1C2A;
  border-radius: 8px;
  padding: 1.2rem;
  
  h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: #fff;
    font-size: 1.2rem;
  }
  
  p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    color: #B7BDC6;
  }
  
  .highlight {
    color: #f0b90b;
    font-weight: bold;
    font-size: 1.5rem;
  }
`;

const RewardTable = styled.div`
  background: #1A1C2A;
  border-radius: 8px;
  padding: 1.2rem;
  
  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #fff;
    font-size: 1.2rem;
  }
  
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.6rem 0;
    border-bottom: 1px solid #282B3E;
  }
  
  .row:last-child {
    border-bottom: none;
  }
  
  .cell {
    font-size: 0.9rem;
    color: #B7BDC6;
  }
  
  .cell:last-child {
    text-align: right;
    color: #f0b90b;
  }
`;

const PodiumContainer = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  margin: 3rem 0;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
`;

const PodiumPosition = styled.div`
  position: relative;
  width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  transform: translateY(${props => props.$position === 0 ? '-15px' : '0'});
  
  @media (max-width: 768px) {
    transform: none;
    order: ${props => props.$position === 0 ? '0' : props.$position === 1 ? '1' : '2'};
  }
`;

const PodiumBox = styled.div`
  background: #1A1C2A;
  border-radius: 12px;
  width: 100%;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
  transform: scale(${props => props.$position === 0 ? '1.1' : '1'});
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${props => props.$position === 0 ? '4px' : '2px'};
    background: ${props => 
      props.$position === 0 
        ? 'linear-gradient(90deg, #f0b90b, #ffee58, #f0b90b)' 
        : props.$position === 1 
          ? 'linear-gradient(90deg, #A3A3A3, #FFFFFF, #A3A3A3)' 
          : 'linear-gradient(90deg, #CD7F32, #FFA07A, #CD7F32)'};
    background-size: 200% auto;
    animation: ${shine} 3s linear infinite;
  }
  
  h3 {
    margin: 0;
    color: ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
    font-size: 1.2rem;
  }
  
  @media (max-width: 768px) {
    transform: none;
    width: 220px;
  }
`;

const Avatar = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 0.5rem;
  background: #282B3E;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 2px solid ${props => 
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
    font-size: 1.5rem;
    font-weight: bold;
  }
`;

const Trophy = styled.div`
  position: absolute;
  top: -30px;
  z-index: 2;
  color: ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
  font-size: 2.2rem;
  animation: ${pulse} 2s infinite ease-in-out;
  background: rgba(26, 28, 42, 0.8);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
`;

const UserDetails = styled.div`
  text-align: center;
  margin-top: 0.5rem;
  
  .name {
    font-weight: bold;
    color: #fff;
    margin-bottom: 0.2rem;
  }
  
  .amount {
    color: #f0b90b;
    font-size: 1.1rem;
  }
`;

const Podium = styled.div`
  width: 100%;
  height: ${props => props.$position === 0 ? '80px' : props.$position === 1 ? '60px' : '40px'};
  background: ${props => props.$position === 0 ? '#f0b90b' : props.$position === 1 ? '#A3A3A3' : '#CD7F32'};
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  font-size: 1.2rem;
  
  @media (max-width: 768px) {
    height: 40px;
  }
`;

const UserStatsContainer = styled.div`
  background: #1A1C2A;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #282B3E;
  text-align: center;
  
  h3 {
    margin-top: 0;
    color: #fff;
  }
  
  p {
    margin: 0.5rem 0;
    color: #B7BDC6;
    font-size: 1rem;
  }
  
  .highlight {
    color: #f0b90b;
    font-weight: bold;
  }
`;

const LeaderboardContainer = styled.div`
  background: #13141C;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #282B3E;
  
  h2 {
    margin-top: 0;
    color: #fff;
    margin-bottom: 1.5rem;
  }
`;

const LeaderboardHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  padding: 0.5rem 1rem;
  background: #1A1C2A;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #B7BDC6;
  
  span {
    font-size: 0.9rem;
  }
`;

const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 1fr;
  padding: 0.8rem 1rem;
  background: ${props => props.$isCurrentUser ? 'rgba(240, 185, 11, 0.08)' : '#1A1C2A'};
  border-radius: 8px;
  margin-bottom: 0.5rem;
  align-items: center;
  animation: ${fadeIn} 0.3s ease-in-out;
  
  &:hover {
    background: ${props => props.$isCurrentUser ? 'rgba(240, 185, 11, 0.12)' : '#242738'};
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
  }
`;

const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    background: #282B3E;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${props => 
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
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  
  .loader {
    width: 40px;
    height: 40px;
    border: 4px solid #282B3E;
    border-radius: 50%;
    border-top: 4px solid #f0b90b;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #B7BDC6;
  
  p {
    margin-bottom: 1rem;
  }
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
        return <GiLaurelCrown size={28} />;
      case 2:
        return <FaTrophy size={24} />;
      case 3:
        return <FaMedal size={24} />;
      default:
        return null;
    }
  };
  
  // Get top 3 users for podium
  const topUsers = users.slice(0, 3);
  
  return (
    <Container>
      <CompetitionHeader>
        <Title>OSCAR Holders Competition</Title>
        
        <CompetitionInfo>
          <h3>Reward Pool</h3>
          <p className="highlight">5,000 OSCAR</p>
          <p>Hold OSCAR tokens to qualify for rewards</p>
        </CompetitionInfo>
        
        <RewardTable>
          <h3>Reward Distribution</h3>
          <div className="table">
            <div className="row">
              <div className="cell">1st Place</div>
              <div className="cell">2,000 OSCAR</div>
            </div>
            <div className="row">
              <div className="cell">2nd Place</div>
              <div className="cell">1,500 OSCAR</div>
            </div>
            <div className="row">
              <div className="cell">3rd Place</div>
              <div className="cell">1,000 OSCAR</div>
            </div>
            <div className="row">
              <div className="cell">4th-10th Places</div>
              <div className="cell">500 OSCAR</div>
            </div>
          </div>
        </RewardTable>
      </CompetitionHeader>
      
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
                    <Trophy $position={position}>
                      {getTrophyIcon(actualRank)}
                    </Trophy>
                    
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
                        <div className="amount">{user.balance.toLocaleString()} OSCAR</div>
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
                You are ranked <span className="highlight">#{userRank}</span> out of {totalUsers} competitors
              </p>
            </UserStatsContainer>
          )}
          
          <LeaderboardContainer>
            <h2>Leaderboard</h2>
            
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
                        {user.balance.toLocaleString()} OSCAR
                      </AmountCell>
                    </LeaderboardRow>
                  );
                })}
              </>
            ) : (
              <EmptyState>
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