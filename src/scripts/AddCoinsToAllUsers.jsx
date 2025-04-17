import React, { useState } from 'react';
import styled from 'styled-components';
import { collection, getDocs, doc, updateDoc, getDoc, query, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #FE8E2D;
  margin-bottom: 1.5rem;
`;

const Card = styled.div`
  background-color: #1F2A37;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
  background-color: #FE8E2D;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;
  
  &:hover {
    background-color: #E57D22;
  }
  
  &:disabled {
    background-color: #9CA3AF;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 5px;
  background-color: ${props => props.isError ? '#FEE2E2' : '#D1FAE5'};
  color: ${props => props.isError ? '#EF4444' : '#10B981'};
  font-weight: 500;
`;

const ProgressContainer = styled.div`
  margin: 1rem 0;
`;

const ProgressBar = styled.div`
  height: 8px;
  background-color: #4B5563;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #FE8E2D;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  font-size: 0.875rem;
  color: #9CA3AF;
`;

const LogContainer = styled.div`
  margin-top: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #374151;
  border-radius: 5px;
  padding: 0.5rem;
`;

const LogEntry = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid #374151;
  font-family: monospace;
  font-size: 0.875rem;
  color: ${props => props.type === 'error' ? '#EF4444' : props.type === 'success' ? '#10B981' : '#D1D5DB'};
  
  &:last-child {
    border-bottom: none;
  }
`;

const AddCoinsToAllUsers = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [processedUsers, setProcessedUsers] = useState(0);
  
  const addLog = (message, type = 'info') => {
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp: new Date().toISOString() }]);
  };
  
  const addCoinsToAllUsers = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus(null);
      setLogs([]);
      setProcessedUsers(0);
      
      // Get all coins from the coins collection
      addLog('Fetching all coins from the database...');
      const coinsSnapshot = await getDocs(collection(db, 'coins'));
      const allCoins = coinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      addLog(`Found ${allCoins.length} coins in the database.`, 'success');
      
      // Count total users first
      const totalUsersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsersCount = totalUsersSnapshot.size;
      setTotalUsers(totalUsersCount);
      addLog(`Found ${totalUsersCount} users in the database.`, 'success');
      
      // Process users in batches to avoid timeouts
      const batchSize = 20;
      let lastDocRef = null;
      let hasMoreUsers = true;
      
      while (hasMoreUsers) {
        let userQuery;
        if (lastDocRef) {
          userQuery = query(collection(db, 'users'), startAfter(lastDocRef), limit(batchSize));
        } else {
          userQuery = query(collection(db, 'users'), limit(batchSize));
        }
        
        const usersSnapshot = await getDocs(userQuery);
        const users = usersSnapshot.docs;
        
        if (users.length === 0) {
          hasMoreUsers = false;
          break;
        }
        
        addLog(`Processing batch of ${users.length} users...`);
        
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          const userData = user.data();
          
          addLog(`Processing user: ${userData.displayName || userData.email || user.id}`);
          
          // Check if the user has a balances field
          if (!userData.balances) {
            addLog(`User ${user.id} has no balances field. Creating it...`);
            userData.balances = {};
          }
          
          // Check which coins are missing
          const missingCoins = allCoins.filter(coin => !userData.balances[coin.symbol]);
          
          if (missingCoins.length > 0) {
            addLog(`Found ${missingCoins.length} missing coins for user ${user.id}`);
            
            // Add missing coins with 0 balance
            const updatedBalances = { ...userData.balances };
            missingCoins.forEach(coin => {
              updatedBalances[coin.symbol] = 0;
            });
            
            // Update the user document
            try {
              await updateDoc(doc(db, 'users', user.id), {
                balances: updatedBalances
              });
              addLog(`Updated user ${user.id} with ${missingCoins.length} new coins.`, 'success');
            } catch (error) {
              addLog(`Error updating user ${user.id}: ${error.message}`, 'error');
            }
          } else {
            addLog(`User ${user.id} already has all coins.`, 'success');
          }
          
          setProcessedUsers(prev => prev + 1);
          setProgress(((i + 1 + (usersSnapshot.docs.length * (!lastDocRef ? 0 : 1))) / totalUsersCount) * 100);
        }
        
        lastDocRef = users[users.length - 1];
      }
      
      addLog(`Finished processing all users.`, 'success');
      setStatus({ message: 'Successfully added missing coins to all users!', isError: false });
    } catch (error) {
      console.error('Error adding coins to users:', error);
      addLog(`Error: ${error.message}`, 'error');
      setStatus({ message: `Error: ${error.message}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Container>
      <Title>Add Missing Coins to All Users</Title>
      
      <Card>
        <p>This tool will add all coins from the 'coins' collection to all users in the database with a zero balance.</p>
        <p>This is useful when new coins are added to the system and need to be initialized for all existing users.</p>
        
        <Button 
          onClick={addCoinsToAllUsers}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Add Missing Coins to All Users'}
        </Button>
        
        {isProcessing && (
          <ProgressContainer>
            <ProgressBar>
              <ProgressFill progress={progress} />
            </ProgressBar>
            <ProgressText>
              Processing {processedUsers} of {totalUsers} users ({Math.round(progress)}%)
            </ProgressText>
          </ProgressContainer>
        )}
        
        {status && (
          <StatusMessage isError={status.isError}>
            {status.message}
          </StatusMessage>
        )}
      </Card>
      
      {logs.length > 0 && (
        <Card>
          <h3>Process Logs</h3>
          <LogContainer>
            {logs.map((log, index) => (
              <LogEntry key={index} type={log.type}>
                [{log.timestamp.slice(11, 19)}] {log.message}
              </LogEntry>
            ))}
          </LogContainer>
        </Card>
      )}
    </Container>
  );
};

export default AddCoinsToAllUsers; 