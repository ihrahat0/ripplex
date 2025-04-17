import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, limit, writeBatch } from 'firebase/firestore';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { DEFAULT_COINS } from '../../utils/constants';

// Enhanced styling for balance management
const Container = styled.div`
  background: #161b22;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #30363d;
`;

const SearchForm = styled.form`
  display: flex;
  margin-bottom: 30px;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px 15px;
  border-radius: 6px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #ff725a;
    box-shadow: 0 0 0 2px rgba(255, 114, 90, 0.2);
  }
`;

const Button = styled.button`
  padding: 12px 20px;
  border-radius: 6px;
  border: none;
  background: #ff725a;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e65a42;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const UserInfo = styled.div`
  background: #0d1117;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  border: 1px solid #30363d;
`;

const UserDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  h4 {
    margin: 0 0 5px 0;
    color: #8b949e;
    font-size: 14px;
    font-weight: 500;
  }
  
  p {
    margin: 0;
    font-size: 16px;
    color: #e6edf3;
  }
`;

const BalancesTitle = styled.h3`
  color: #e6edf3;
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const BalancesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
`;

const BalanceCard = styled.div`
  background: ${props => props.$isHighlighted ? 'rgba(255, 114, 90, 0.1)' : 'rgba(13, 17, 23, 0.5)'};
  border: 1px solid ${props => props.$isHighlighted ? '#ff725a' : '#30363d'};
  border-radius: 8px;
  padding: 15px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  h4 {
    margin: 0 0 10px 0;
    color: ${props => props.$isHighlighted ? '#ff725a' : '#e6edf3'};
    font-size: 16px;
    font-weight: 500;
    display: flex;
    align-items: center;
    
    img {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      border-radius: 50%;
    }
  }
`;

const BalanceControls = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const BalanceInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const BalanceAmount = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: #e6edf3;
`;

const BalanceValue = styled.div`
  font-size: 14px;
  color: #8b949e;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 30px;
  color: #8b949e;
`;

const Tabs = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #30363d;
`;

const Tab = styled.button`
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: ${props => props.active ? '#ff725a' : '#8b949e'};
  font-weight: ${props => props.active ? '600' : '400'};
  border-bottom: 2px solid ${props => props.active ? '#ff725a' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.active ? '#ff725a' : '#e6edf3'};
  }
`;

const SaveAllButton = styled(Button)`
  background: #238636;
  margin-left: auto;
  
  &:hover {
    background: #2ea043;
  }
`;

const FilterControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SearchInput = styled(Input)`
  max-width: 300px;
`;

const StatusMessage = styled.div`
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 6px;
  color: ${props => props.$type === 'error' ? '#f85149' : '#3fb950'};
  background: ${props => props.$type === 'error' ? 'rgba(248, 81, 73, 0.1)' : 'rgba(63, 185, 80, 0.1)'};
  border: 1px solid ${props => props.$type === 'error' ? 'rgba(248, 81, 73, 0.2)' : 'rgba(63, 185, 80, 0.2)'};
`;

const AdminActions = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background: #1c2333;
  border-radius: 8px;
  border: 1px solid #30363d;
`;

const ActionTitle = styled.h3`
  color: #e6edf3;
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
`;

const ActionDescription = styled.p`
  color: #8b949e;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
`;

const ActionButton = styled(Button)`
  background: ${props => props.$variant === 'warning' ? '#bd3e1b' : props.$variant === 'info' ? '#0d6eff' : '#ff725a'};
  
  &:hover {
    background: ${props => props.$variant === 'warning' ? '#a42800' : props.$variant === 'info' ? '#0052cc' : '#e65a42'};
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  height: 6px;
  background: #30363d;
  border-radius: 3px;
  margin-top: 15px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.$progress || 0}%;
    background: #0d6eff;
    transition: width 0.3s ease;
  }
`;

const BalanceManagement = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balances, setBalances] = useState({});
  const [originalBalances, setOriginalBalances] = useState({});
  const [balanceSearch, setBalanceSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, main, tokens, defi
  const [allCoins, setAllCoins] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationStats, setMigrationStats] = useState({ total: 0, updated: 0 });

  // Parse query parameters
  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');

  useEffect(() => {
    // Check for email parameter
    if (emailParam) {
      setSearchTerm(emailParam);
      searchUserByEmail(emailParam);
    } else if (userId) {
      fetchUserData(userId);
    }
    
    fetchAllCoins();
  }, [userId, emailParam]);

  const fetchAllCoins = async () => {
    try {
      const coinsRef = collection(db, 'tokens');
      const coinsSnapshot = await getDocs(coinsRef);
      const coinsData = coinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllCoins(coinsData);
    } catch (error) {
      console.error('Error fetching all coins:', error);
    }
  };

  const searchUserByEmail = async (email) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Query Firestore for the user with the given email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError(`No user found with email: ${email}`);
        setLoading(false);
        return;
      }
      
      // Get the first matching user
      const userData = querySnapshot.docs[0].data();
      const foundUserId = querySnapshot.docs[0].id;
      
      // Navigate to the user's balance page
      navigate(`/admin/balances/${foundUserId}`, { replace: true });
      
      // No need to set user data here, as navigation will trigger the userId effect
    } catch (error) {
      console.error('Error searching for user:', error);
      setError(`Error searching for user: ${error.message}`);
      setLoading(false);
    }
  };

  const fetchUserData = async (uid) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser(userData);
        
        // Initialize all possible balances
        const userBalances = userData.balances || {};
        setBalances(userBalances);
        setOriginalBalances(JSON.parse(JSON.stringify(userBalances))); // Deep copy
        setSuccess('User loaded successfully');
      } else {
        setError('User not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Error fetching user data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() === '') return;
    
    // Check if it looks like an email
    const isEmail = searchTerm.includes('@');
    
    if (isEmail) {
      // Search directly by email instead of navigating
      searchUserByEmail(searchTerm.trim());
    } else {
      // Assume it's a user ID
      navigate(`/admin/balances/${searchTerm.trim()}`);
    }
  };

  const updateBalance = (token, value) => {
    setBalances(prev => ({
      ...prev,
      [token]: value
    }));
    
    // Check if there are any changes from original
    const newBalances = {
      ...balances,
      [token]: value
    };
    
    const hasAnyChanges = Object.keys(newBalances).some(key => 
      newBalances[key] !== originalBalances[key]
    );
    
    setHasChanges(hasAnyChanges);
  };

  const saveAllChanges = async () => {
    if (!user || !hasChanges) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        balances: balances
      });
      
      // Update original balances after save
      setOriginalBalances(JSON.parse(JSON.stringify(balances)));
      setHasChanges(false);
      setSuccess('All balances updated successfully');
    } catch (error) {
      console.error('Error updating balances:', error);
      setError('Error updating balances: ' + error.message);
    }
  };

  const addNewCoinBalance = (coinId) => {
    if (balances[coinId] !== undefined) return;
    
    updateBalance(coinId, '0');
  };

  // Add all missing coins to current user
  const addAllCoinsToCurrentUser = async () => {
    if (!user || !userId) {
      setError('No user selected');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a copy of current balances
      const updatedBalances = { ...balances };
      
      // Get all possible coin symbols
      const allCoinSymbols = allCoins.map(coin => coin.symbol);
      let updated = false;
      
      // Add any missing coins with 0 balance
      for (const symbol of allCoinSymbols) {
        if (updatedBalances[symbol] === undefined) {
          updatedBalances[symbol] = '0';
          updated = true;
        }
      }
      
      if (!updated) {
        setSuccess('User already has all coins in their balance');
        setLoading(false);
        return;
      }
      
      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        balances: updatedBalances
      });
      
      // Update local state
      setBalances(updatedBalances);
      setOriginalBalances(JSON.parse(JSON.stringify(updatedBalances)));
      setSuccess('Successfully added all missing coins to user balance');
    } catch (error) {
      console.error('Error adding coins to user:', error);
      setError('Error adding coins: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add all missing coins to ALL users (batch process)
  const addAllCoinsToAllUsers = async () => {
    if (!window.confirm('This will add all missing coins with 0 balance to ALL users. This operation could take some time. Continue?')) {
      return;
    }
    
    try {
      setMigrationLoading(true);
      setMigrationProgress(0);
      setError('');
      setSuccess('');
      
      // Get all coin symbols from the tokens collection
      const allCoinSymbols = allCoins.map(coin => coin.symbol);
      
      // Get total count of users for progress tracking
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      let updatedUsers = 0;
      
      setMigrationStats({ total: totalUsers, updated: 0 });
      
      // Process in batches of 500 users
      const batchSize = 500;
      let processedUsers = 0;
      
      while (processedUsers < totalUsers) {
        const q = query(collection(db, 'users'), limit(batchSize));
        const batch = writeBatch(db);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) break;
        
        let batchUpdates = 0;
        
        for (const userDoc of querySnapshot.docs) {
          const userData = userDoc.data();
          const userBalances = userData.balances || {};
          let needsUpdate = false;
          
          // Check if any coins are missing
          for (const symbol of allCoinSymbols) {
            if (userBalances[symbol] === undefined) {
              userBalances[symbol] = '0';
              needsUpdate = true;
            }
          }
          
          // Add to batch if update needed
          if (needsUpdate) {
            batch.update(doc(db, 'users', userDoc.id), { balances: userBalances });
            batchUpdates++;
          }
          
          processedUsers++;
          setMigrationProgress(Math.floor((processedUsers / totalUsers) * 100));
        }
        
        // Commit batch if there are updates
        if (batchUpdates > 0) {
          await batch.commit();
          updatedUsers += batchUpdates;
          setMigrationStats({ total: totalUsers, updated: updatedUsers });
        }
      }
      
      setSuccess(`Migration complete. Added missing coins to ${updatedUsers} out of ${totalUsers} users.`);
    } catch (error) {
      console.error('Error in migration:', error);
      setError('Migration error: ' + error.message);
    } finally {
      setMigrationLoading(false);
      setMigrationProgress(100);
    }
  };

  // Filter coins based on active tab and search
  const getFilteredBalances = () => {
    const allBalanceTokens = new Set([
      ...Object.keys(balances || {}),
      ...allCoins.map(coin => coin.symbol)
    ]);
    
    let filtered = [...allBalanceTokens];
    
    // Apply tab filter
    if (activeTab === 'main') {
      filtered = filtered.filter(token => 
        ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP'].includes(token)
      );
    } else if (activeTab === 'tokens') {
      const mainCoins = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP'];
      filtered = filtered.filter(token => !mainCoins.includes(token));
    } else if (activeTab === 'defi') {
      filtered = filtered.filter(token => {
        const coin = allCoins.find(c => c.symbol === token);
        return coin?.type === 'defi' || token.includes('LP-');
      });
    }
    
    // Apply search filter
    if (balanceSearch) {
      filtered = filtered.filter(token => 
        token.toLowerCase().includes(balanceSearch.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getCoinInfo = (symbol) => {
    return allCoins.find(coin => coin.symbol === symbol) || {
      name: symbol,
      symbol: symbol,
      logo: null
    };
  };

  return (
    <Container>
      <SearchForm onSubmit={handleSearch}>
        <Input
          type="text"
          placeholder="Search by user ID or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button type="submit" disabled={loading || searchTerm.trim() === ''}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </SearchForm>
      
      <AdminActions>
        <ActionTitle>Administrator Actions</ActionTitle>
        <ActionDescription>
          Use these tools to manage coin balances across users. Handle with care as these actions affect multiple user accounts.
        </ActionDescription>
        
        <ActionButtons>
          {userId && (
            <ActionButton 
              onClick={addAllCoinsToCurrentUser} 
              disabled={loading}
              $variant="info"
            >
              Add All Coins to Current User
            </ActionButton>
          )}
          
          <ActionButton 
            onClick={addAllCoinsToAllUsers} 
            disabled={migrationLoading}
            $variant="warning"
          >
            {migrationLoading ? 'Processing...' : 'Add All Coins to ALL Users'}
          </ActionButton>
        </ActionButtons>
        
        {migrationLoading && (
          <>
            <div style={{ marginTop: '15px', color: '#8b949e' }}>
              Processing users: {migrationStats.updated} updated out of {migrationStats.total} total
            </div>
            <ProgressBar $progress={migrationProgress} />
          </>
        )}
      </AdminActions>
      
      {error && <StatusMessage $type="error">{error}</StatusMessage>}
      {success && <StatusMessage $type="success">{success}</StatusMessage>}
      
      {user && (
        <>
          <UserInfo>
            <UserDetails>
              <DetailItem>
                <h4>Display Name</h4>
                <p>{user.displayName || 'N/A'}</p>
              </DetailItem>
              <DetailItem>
                <h4>Email</h4>
                <p>{user.email || 'N/A'}</p>
              </DetailItem>
              <DetailItem>
                <h4>User ID</h4>
                <p>{userId}</p>
              </DetailItem>
            </UserDetails>
          </UserInfo>
          
          <FilterControls>
            <Tabs>
              <Tab 
                active={activeTab === 'all'} 
                onClick={() => setActiveTab('all')}
              >
                All Coins
              </Tab>
              <Tab 
                active={activeTab === 'main'} 
                onClick={() => setActiveTab('main')}
              >
                Main Coins
              </Tab>
              <Tab 
                active={activeTab === 'tokens'} 
                onClick={() => setActiveTab('tokens')}
              >
                Tokens
              </Tab>
              <Tab 
                active={activeTab === 'defi'} 
                onClick={() => setActiveTab('defi')}
              >
                DeFi
              </Tab>
            </Tabs>
            <SearchInput
              type="text"
              placeholder="Search coins..."
              value={balanceSearch}
              onChange={(e) => setBalanceSearch(e.target.value)}
            />
          </FilterControls>
          
          <BalancesTitle>
            User Balances
            {hasChanges && (
              <SaveAllButton onClick={saveAllChanges}>
                Save All Changes
              </SaveAllButton>
            )}
          </BalancesTitle>
          
          <BalancesGrid>
            {getFilteredBalances().map(token => {
              const coinInfo = getCoinInfo(token);
              const balance = balances[token] || '0';
              const isChanged = balance !== (originalBalances[token] || '0');
              
              return (
                <BalanceCard key={token} $isHighlighted={isChanged}>
                  <h4>
                    {coinInfo.logo && <img src={coinInfo.logo} alt={token} />}
                    {coinInfo.name || token}
                  </h4>
                  <BalanceInfo>
                    <BalanceAmount>{balance} {token}</BalanceAmount>
                  </BalanceInfo>
                  <BalanceControls>
                    <Input
                      type="number"
                      value={balance}
                      onChange={(e) => updateBalance(token, e.target.value)}
                      step="0.0000001"
                    />
                  </BalanceControls>
                </BalanceCard>
              );
            })}
          </BalancesGrid>
          
          {getFilteredBalances().length === 0 && (
            <NoResults>
              No coins found matching your filter criteria.
            </NoResults>
          )}
        </>
      )}
      
      {!userId && !user && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '30px' }}>
          <p>Enter a user ID or email address to search for a user</p>
        </div>
      )}
    </Container>
  );
};

export default BalanceManagement; 