import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { db } from '../../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  increment, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { SUPPORTED_CHAINS } from '../../services/walletService';
import { toast } from 'react-toastify'; // Assuming you use react-toastify

const Container = styled.div`
  padding: 20px;
  color: var(--text);
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  margin-bottom: 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background: #3a5bd9;
  }
`;

const UserInfoCard = styled.div`
  background: var(--bg2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const InfoBlock = styled.div`
  padding: 16px;
  background: var(--bg);
  border-radius: 6px;
  border: 1px solid var(--line);
`;

const InfoTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-light);
  margin-bottom: 8px;
`;

const InfoValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
`;

const WalletGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const WalletCard = styled.div`
  background: var(--bg2);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--line);
`;

const WalletTitle = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  
  h3 {
    font-size: 16px;
    margin: 0;
    margin-left: 8px;
  }
`;

const NetworkBadge = styled.span`
  background: ${props => 
    props.network === 'ethereum' ? 'rgba(98, 126, 234, 0.2)' :
    props.network === 'bsc' ? 'rgba(243, 186, 47, 0.2)' :
    props.network === 'polygon' ? 'rgba(130, 71, 229, 0.2)' :
    props.network === 'solana' ? 'rgba(20, 241, 149, 0.2)' :
    props.network === 'arbitrum' ? 'rgba(40, 160, 240, 0.2)' :
    props.network === 'base' ? 'rgba(0, 137, 123, 0.2)' :
    'rgba(255, 255, 255, 0.1)'
  };
  color: ${props => 
    props.network === 'ethereum' ? '#627eea' :
    props.network === 'bsc' ? '#f3ba2f' :
    props.network === 'polygon' ? '#8247e5' :
    props.network === 'solana' ? '#14f195' :
    props.network === 'arbitrum' ? '#28a0f0' :
    props.network === 'base' ? '#00897b' :
    'white'
  };
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: auto;
`;

const AddressField = styled.div`
  background: var(--bg);
  padding: 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  margin-bottom: 12px;
  word-break: break-all;
  border: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const DepositTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--line);
  }
  
  th {
    background: var(--bg1);
    color: var(--text);
  }
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: ${props => 
    props.$status === 'completed' ? 'rgba(14, 203, 129, 0.2)' :
    props.$status === 'pending' ? 'rgba(243, 186, 47, 0.2)' :
    props.$status === 'failed' ? 'rgba(246, 70, 93, 0.2)' :
    'rgba(255, 255, 255, 0.1)'
  };
  color: ${props => 
    props.$status === 'completed' ? '#0ECB81' :
    props.$status === 'pending' ? '#f3ba2f' :
    props.$status === 'failed' ? '#F6465D' :
    'white'
  };
  
  i {
    margin-right: 4px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-light);
  
  i {
    font-size: 48px;
    margin-bottom: 16px;
    display: block;
    opacity: 0.5;
  }
  
  p {
    margin: 8px 0;
  }
`;

const ErrorMessage = styled.div`
  color: var(--error);
  background: rgba(246, 70, 93, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 20px;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--bg2);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: var(--bg1);
  }
`;

const SuccessMessage = styled.div`
  color: #0ECB81;
  background: rgba(14, 203, 129, 0.1);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 20px;
`;

const ManualDepositForm = styled.form`
  background: var(--bg2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--line);
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  color: var(--text-light);
`;

const Input = styled.input`
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text);
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const Select = styled.select`
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text);
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

const ScanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #7132DB;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background: #8644EA;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ScanResultsCard = styled.div`
  background: var(--bg2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--line);
`;

const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  
  &:last-child {
    border-bottom: none;
  }
`;

const ResultLabel = styled.div`
  color: var(--text-light);
`;

const ResultValue = styled.div`
  color: var(--text);
  font-weight: 500;
`;

const UserDeposits = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userWallets, setUserWallets] = useState({});
  const [deposits, setDeposits] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [foundDeposits, setFoundDeposits] = useState([]);
  
  // Form state for manual deposit
  const [manualDeposit, setManualDeposit] = useState({
    amount: '',
    token: 'USDT',
    chain: 'ethereum',
    txHash: `mock-tx-${Date.now()}`
  });

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchUserWallets();
      setupRealtimeDeposits();
    }
    
    // Cleanup subscription on unmount
    return () => {
      // If we stored the unsubscribe function somewhere, we would call it here
    };
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUser({
          id: userId,
          ...userDoc.data()
        });
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to fetch user details');
    }
  };

  const fetchUserWallets = async () => {
    try {
      const walletDoc = await getDoc(doc(db, 'walletAddresses', userId));
      if (walletDoc.exists()) {
        setUserWallets(walletDoc.data().wallets || {});
      }
    } catch (err) {
      console.error('Error fetching user wallets:', err);
      setError('Failed to fetch user wallet addresses');
    }
  };

  const setupRealtimeDeposits = () => {
    setLoading(true);
    
    // Create a query for this user's transactions (deposits only)
    const depositsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('type', '==', 'deposit'),
      orderBy('timestamp', 'desc')
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(depositsQuery, 
      (snapshot) => {
        const depositsList = [];
        
        snapshot.forEach((doc) => {
          depositsList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Update state with the new deposits
        setDeposits(depositsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching real-time deposits:", error);
        setError(`Failed to get real-time deposits: ${error.message}`);
        setLoading(false);
      }
    );
    
    // You could store this unsubscribe function in state if you need to call it elsewhere
    return unsubscribe;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString();
    }
    
    try {
      const jsDate = new Date(date);
      return jsDate.toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getExplorerUrl = (value, chain, type = 'tx') => {
    if (!value || !chain) return '#';
    
    const explorer = SUPPORTED_CHAINS[chain]?.explorer || 'https://etherscan.io';
    
    if (type === 'address') {
      return `${explorer}/address/${value}`;
    }
    
    return `${explorer}/tx/${value}`;
  };

  const truncateAddress = (address) => {
    if (!address) return 'N/A';
    if (address.length <= 14) return address;
    
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };
  
  const handleManualDepositChange = (e) => {
    const { name, value } = e.target;
    setManualDeposit(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const addManualDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const { amount, token, chain, txHash } = manualDeposit;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      // Add the transaction to the transactions collection
      await addDoc(collection(db, 'transactions'), {
        userId,
        type: 'deposit',
        amount: parseFloat(amount),
        token,
        chain,
        txHash: txHash || `manual-${Date.now()}`,
        status: 'completed',
        timestamp: serverTimestamp(),
        fromAddress: 'Manual Deposit',
        toAddress: userWallets[chain] || 'Unknown',
        isRealDeposit: true,
        confirmations: 100 // Already confirmed
      });
      
      // Update the user's balance
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`balances.${token}`]: increment(parseFloat(amount))
      });
      
      setSuccess(`Manually added ${amount} ${token} to user's balance`);
      
      // Reset form
      setManualDeposit({
        amount: '',
        token: 'USDT',
        chain: 'ethereum',
        txHash: `manual-${Date.now()}`
      });
      
      // Toast notification
      toast.success(`Successfully deposited ${amount} ${token} to user's account`);
    } catch (err) {
      console.error('Error adding manual deposit:', err);
      setError(`Failed to add manual deposit: ${err.message}`);
    }
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    
    try {
      await fetchUserDetails();
      await fetchUserWallets();
      // Real-time listener will automatically update deposits
      
      toast.success('Data refreshed successfully');
    } catch (err) {
      console.error('Error refreshing data:', err);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const scanBlockchainDeposits = async () => {
    setScanning(true);
    setScanResults(null);
    setFoundDeposits([]);
    
    try {
      // Using the new deposit system instead of the old scanning method
      const { checkUserDeposits } = await import('../../services/depositChecker');
      
      // Run an immediate check for this specific user
      const results = await checkUserDeposits(userId);
      
      if (results.success) {
        setScanResults({
          scannedAt: new Date(),
          depositsFound: results.depositsFound || 0,
          message: results.message || 'Scan completed successfully'
        });
        
        if (results.deposits && results.deposits.length > 0) {
          setFoundDeposits(results.deposits);
          toast.success(`Found and processed ${results.depositsFound} deposits`);
          
          // Refresh the data to show new deposits
          refreshData();
        } else {
          toast.info('No new deposits found');
        }
      } else {
        toast.error(`Error scanning user deposits: ${results.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error scanning blockchain:', error);
      toast.error(`Failed to scan blockchain: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Container>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <ActionButton onClick={() => navigate('/admin/users')}>
          ← Back to Users
        </ActionButton>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <ScanButton 
            onClick={scanBlockchainDeposits} 
            disabled={scanning || !userWallets || Object.keys(userWallets).length === 0}
          >
            <i className={`bi bi-search ${scanning ? 'spin' : ''}`}></i>
            {scanning ? 'Scanning Blockchain...' : 'Scan Blockchain for Deposits'}
          </ScanButton>
          
          <RefreshButton onClick={refreshData} disabled={refreshing}>
            <i className={`bi bi-arrow-repeat ${refreshing ? 'spin' : ''}`}></i>
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </RefreshButton>
        </div>
      </div>
      
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      
      {scanResults && (
        <ScanResultsCard>
          <h4>Blockchain Scan Results - {scanResults.scannedAt.toLocaleString()}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
            <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '4px', flex: '1' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Deposits Found</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#0ECB81' }}>
                {scanResults.depositsFound}
              </div>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg)', borderRadius: '4px', flex: '1' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Addresses Scanned</div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                {Object.keys(userWallets).length}
              </div>
            </div>
          </div>
          
          <h4>Wallet Addresses Scanned</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', marginBottom: '15px' }}>
            {Object.entries(userWallets).map(([chain, address]) => (
              <div key={chain} style={{ padding: '10px', background: 'var(--bg)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <NetworkBadge network={chain}>{chain}</NetworkBadge>
                  <div style={{ marginTop: '5px', fontSize: '12px', wordBreak: 'break-all' }}>
                    {truncateAddress(address)}
                  </div>
                </div>
                <a 
                  href={getExplorerUrl(address, chain, 'address')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '16px', color: 'var(--primary)' }}
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                </a>
              </div>
            ))}
          </div>
          
          {foundDeposits.length > 0 && (
            <>
              <h4>Found Deposits</h4>
              <DepositTable>
                <thead>
                  <tr>
                    <th>Chain</th>
                    <th>Token</th>
                    <th>Amount</th>
                    <th>From Address</th>
                    <th>Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {foundDeposits.map((deposit, index) => (
                    <tr key={index}>
                      <td>
                        <NetworkBadge network={deposit.chain}>
                          {SUPPORTED_CHAINS[deposit.chain]?.name || deposit.chain}
                        </NetworkBadge>
                      </td>
                      <td>{deposit.token}</td>
                      <td>{deposit.amount}</td>
                      <td>
                        {deposit.fromAddress ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span>{truncateAddress(deposit.fromAddress)}</span>
                            <CopyButton onClick={() => copyToClipboard(deposit.fromAddress)}>
                              {copiedAddress === deposit.fromAddress ? 
                                <i className="bi bi-check-circle"></i> : 
                                <i className="bi bi-clipboard"></i>}
                            </CopyButton>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <a 
                            href={getExplorerUrl(deposit.txHash, deposit.chain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)' }}
                          >
                            {truncateAddress(deposit.txHash)}
                          </a>
                          <CopyButton onClick={() => copyToClipboard(deposit.txHash)}>
                            {copiedAddress === deposit.txHash ? 
                              <i className="bi bi-check-circle"></i> : 
                              <i className="bi bi-clipboard"></i>}
                          </CopyButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DepositTable>
            </>
          )}
        </ScanResultsCard>
      )}
      
      {user && (
        <>
          <h2>Deposit Management for {user.email || user.displayName || userId}</h2>
          
          <UserInfoCard>
            <InfoBlock>
              <InfoTitle>Email</InfoTitle>
              <InfoValue>{user.email || 'N/A'}</InfoValue>
            </InfoBlock>
            <InfoBlock>
              <InfoTitle>Total Deposits</InfoTitle>
              <InfoValue>{deposits.length}</InfoValue>
            </InfoBlock>
            <InfoBlock>
              <InfoTitle>Account Created</InfoTitle>
              <InfoValue>
                {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </InfoValue>
            </InfoBlock>
            <InfoBlock>
              <InfoTitle>User ID</InfoTitle>
              <InfoValue style={{ fontSize: '14px' }}>{userId}</InfoValue>
            </InfoBlock>
          </UserInfoCard>
          
          <h3>Manual Deposit</h3>
          <ManualDepositForm onSubmit={addManualDeposit}>
            <FormGrid>
              <FormGroup>
                <Label>Amount</Label>
                <Input
                  type="number"
                  name="amount"
                  value={manualDeposit.amount}
                  onChange={handleManualDepositChange}
                  placeholder="0.00"
                  step="0.000001"
                  min="0"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Token</Label>
                <Select 
                  name="token"
                  value={manualDeposit.token}
                  onChange={handleManualDepositChange}
                  required
                >
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="BNB">BNB</option>
                  <option value="SOL">SOL</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Chain</Label>
                <Select 
                  name="chain"
                  value={manualDeposit.chain}
                  onChange={handleManualDepositChange}
                  required
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="bsc">BSC</option>
                  <option value="polygon">Polygon</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="base">Base</option>
                  <option value="solana">Solana</option>
                </Select>
              </FormGroup>
            </FormGrid>
            
            <FormGroup>
              <Label>Transaction Hash (Optional)</Label>
              <Input
                type="text"
                name="txHash"
                value={manualDeposit.txHash}
                onChange={handleManualDepositChange}
                placeholder="0x..."
              />
            </FormGroup>
            
            <ActionButton type="submit" style={{ marginTop: '16px' }}>
              <i className="bi bi-plus-circle"></i> Add Manual Deposit
            </ActionButton>
          </ManualDepositForm>
          
          <h3>User Wallet Addresses</h3>
          
          <WalletGrid>
            {Object.entries(userWallets).length > 0 ? (
              Object.entries(userWallets).map(([chain, address]) => (
                <WalletCard key={chain}>
                  <WalletTitle>
                    <h3>{SUPPORTED_CHAINS[chain]?.name || chain}</h3>
                    <NetworkBadge network={chain}>{chain}</NetworkBadge>
                  </WalletTitle>
                  <AddressField>
                    <span>{address}</span>
                    <CopyButton onClick={() => copyToClipboard(address)}>
                      {copiedAddress === address ? 
                        <i className="bi bi-check-circle"></i> : 
                        <i className="bi bi-clipboard"></i>}
                    </CopyButton>
                  </AddressField>
                  <a 
                    href={getExplorerUrl(address, chain, 'address')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', fontSize: '14px', textDecoration: 'none' }}
                  >
                    <i className="bi bi-box-arrow-up-right"></i> View on Explorer
                  </a>
                </WalletCard>
              ))
            ) : (
              <EmptyState>
                <i className="bi bi-wallet2"></i>
                <p><strong>No wallet addresses found</strong></p>
                <p>This user does not have any wallet addresses generated.</p>
              </EmptyState>
            )}
          </WalletGrid>
          
          <h3>Deposit History</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(255, 255, 255, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="spin" />
              <p>Loading deposits...</p>
            </div>
          ) : deposits.length > 0 ? (
            <DepositTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Token</th>
                  <th>Amount</th>
                  <th>Chain</th>
                  <th>From Address</th>
                  <th>To Address</th>
                  <th>Status</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map(deposit => (
                  <tr key={deposit.id}>
                    <td>{formatDate(deposit.timestamp)}</td>
                    <td>{deposit.token || deposit.currency || 'Unknown'}</td>
                    <td>{deposit.amount}</td>
                    <td>
                      <NetworkBadge network={deposit.chain || deposit.network}>
                        {SUPPORTED_CHAINS[deposit.chain || deposit.network]?.name || deposit.chain || deposit.network || 'Unknown'}
                      </NetworkBadge>
                    </td>
                    <td>
                      {deposit.fromAddress ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span>{truncateAddress(deposit.fromAddress)}</span>
                          <CopyButton onClick={() => copyToClipboard(deposit.fromAddress)}>
                            {copiedAddress === deposit.fromAddress ? 
                              <i className="bi bi-check-circle"></i> : 
                              <i className="bi bi-clipboard"></i>}
                          </CopyButton>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      {deposit.toAddress ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span>{truncateAddress(deposit.toAddress)}</span>
                          <CopyButton onClick={() => copyToClipboard(deposit.toAddress)}>
                            {copiedAddress === deposit.toAddress ? 
                              <i className="bi bi-check-circle"></i> : 
                              <i className="bi bi-clipboard"></i>}
                          </CopyButton>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <StatusBadge $status={deposit.status}>
                        <i className={
                          deposit.status === 'completed' ? 'bi bi-check-circle' :
                          deposit.status === 'pending' ? 'bi bi-clock' :
                          deposit.status === 'failed' ? 'bi bi-x-circle' :
                          'bi bi-question-circle'
                        }></i>
                        {deposit.status || 'Unknown'}
                      </StatusBadge>
                    </td>
                    <td>
                      {(deposit.txHash || deposit.transactionHash) ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <a 
                            href={getExplorerUrl(deposit.txHash || deposit.transactionHash, deposit.chain || deposit.network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary)' }}
                          >
                            {truncateAddress(deposit.txHash || deposit.transactionHash)}
                          </a>
                          <CopyButton onClick={() => copyToClipboard(deposit.txHash || deposit.transactionHash)}>
                            {copiedAddress === (deposit.txHash || deposit.transactionHash) ? 
                              <i className="bi bi-check-circle"></i> : 
                              <i className="bi bi-clipboard"></i>}
                          </CopyButton>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DepositTable>
          ) : (
            <EmptyState>
              <i className="bi bi-inbox"></i>
              <p><strong>No deposits found</strong></p>
              <p>This user has not made any deposits yet.</p>
            </EmptyState>
          )}
        </>
      )}
    </Container>
  );
};

export default UserDeposits; 