import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { 
  checkForUserDeposits,
  checkUserDeposits,
  startAutoDepositChecking,
  stopAutoDepositChecking,
  getDepositScanStatus
} from '../../services/depositChecker';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { FiRefreshCw, FiPause, FiPlay, FiSearch, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

const Container = styled.div`
  background: #1a1c23;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #2d303e;
  padding-bottom: 16px;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: #e2e8f0;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button`
  background: ${props => props.primary ? '#3b82f6' : '#2d303e'};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.primary ? '#2563eb' : '#373a4a'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusCard = styled.div`
  background: #2d303e;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const StatusLabel = styled.span`
  color: #9ca3af;
`;

const StatusValue = styled.span`
  color: #e2e8f0;
  font-weight: 500;
`;

const WalletsList = styled.div`
  margin-top: 20px;
`;

const WalletItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  background: #2d303e;
  margin-bottom: 8px;
  
  &:hover {
    background: #373a4a;
  }
`;

const WalletInfo = styled.div`
  flex: 1;
`;

const WalletAddress = styled.div`
  color: #e2e8f0;
  font-family: monospace;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
`;

const WalletDetails = styled.div`
  color: #9ca3af;
  font-size: 12px;
  display: flex;
  gap: 12px;
  margin-top: 4px;
`;

const DetailItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const WalletControls = styled.div`
  display: flex;
  gap: 8px;
`;

const ScanResults = styled.div`
  margin-top: 24px;
  background: #2d303e;
  border-radius: 8px;
  padding: 16px;
`;

const ResultsTitle = styled.h3`
  font-size: 1rem;
  color: #e2e8f0;
  margin-top: 0;
  margin-bottom: 16px;
`;

const SearchForm = styled.form`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Input = styled.input`
  flex: 1;
  background: #2d303e;
  border: 1px solid #3b3f51;
  border-radius: 6px;
  padding: 10px 16px;
  color: white;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const ResultItem = styled.div`
  padding: 12px;
  background: #373a4a;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid ${props => props.success ? '#10b981' : '#ef4444'};
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.type === 'success' ? 'rgba(14, 203, 129, 0.15)' : 
    props.type === 'warning' ? 'rgba(246, 189, 96, 0.15)' : 
    props.type === 'error' ? 'rgba(246, 70, 93, 0.15)' : 'rgba(59, 130, 246, 0.15)'};
  color: ${props => props.type === 'success' ? '#0ECB81' : 
    props.type === 'warning' ? '#F6BD60' : 
    props.type === 'error' ? '#F6465D' : '#3B82F6'};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 0;
  color: #9ca3af;
  
  svg {
    margin-bottom: 12px;
    font-size: 24px;
  }
`;

const ScanResultTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 20px;
  
  th, td {
    padding: 12px 16px;
    text-align: left;
  }
  
  th {
    background: #2d303e;
    color: #9ca3af;
    font-weight: 500;
    font-size: 13px;
    border-bottom: 1px solid #3b3f51;
  }
  
  td {
    border-bottom: 1px solid #2d303e;
    color: #e2e8f0;
    font-size: 14px;
  }
  
  tr:hover td {
    background: rgba(45, 48, 62, 0.5);
  }
  
  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const ChainBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: #3b3f51;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
`;

const AddressText = styled.div`
  color: #e2e8f0;
  font-family: monospace;
  font-size: 14px;
  margin-top: 6px;
  word-break: break-all;
`;

/**
 * Admin component for scanning wallet deposits manually
 */
const WalletScanner = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [serverScanning, setServerScanning] = useState(false);
  
  // Load initial data
  useEffect(() => {
    fetchData();
    loadScanHistory();
    
    // Set up interval to refresh scan status
    const statusInterval = setInterval(() => {
      setScanStatus(getDepositScanStatus());
    }, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);
  
  const fetchData = async () => {
    try {
      // Get scan status
      setScanStatus(getDepositScanStatus());
      
      // Get users with wallet addresses
      const walletAddressesSnapshot = await getDocs(
        query(collection(db, 'walletAddresses'), limit(10))
      );
      
      if (!walletAddressesSnapshot.empty) {
        const usersWithWallets = [];
        
        for (const walletDoc of walletAddressesSnapshot.docs) {
          const userId = walletDoc.id;
          const walletData = walletDoc.data();
          
          // Get user details for name/email
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          usersWithWallets.push({
            id: userId,
            email: userData?.email || 'Unknown',
            displayName: userData?.displayName || 'Unknown User',
            wallets: walletData.wallets || {}
          });
        }
        
        setUsers(usersWithWallets);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load users with wallets');
    }
  };
  
  const loadScanHistory = async () => {
    try {
      // Get recent deposit scans
      const scansSnapshot = await getDocs(
        query(
          collection(db, 'depositScans'),
          orderBy('timestamp', 'desc'),
          limit(20)
        )
      );
      
      const scans = scansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setScanHistory(scans);
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  };
  
  const handleScanAll = async () => {
    setLoading(true);
    try {
      const result = await checkForUserDeposits({ force: true });
      
      if (result.success) {
        toast.success(`Scan completed: ${result.results?.totalDepositsFound || 0} deposits found`);
      } else {
        toast.error(`Scan failed: ${result.message || 'Unknown error'}`);
      }
      
      loadScanHistory();
      setScanStatus(getDepositScanStatus());
    } catch (error) {
      console.error('Error scanning all wallets:', error);
      toast.error('Failed to scan wallets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    setSearching(true);
    try {
      // First look for exact userId match
      const userDoc = await getDoc(doc(db, 'users', searchTerm));
      
      if (userDoc.exists()) {
        // Found user directly by ID
        const userData = userDoc.data();
        
        // Get wallet addresses
        const walletDoc = await getDoc(doc(db, 'walletAddresses', searchTerm));
        const wallets = walletDoc.exists() ? walletDoc.data().wallets || {} : {};
        
        setSelectedUser({
          id: searchTerm,
          email: userData.email || 'Unknown',
          displayName: userData.displayName || 'Unknown User',
          wallets
        });
        return;
      }
      
      // Otherwise, search by email/displayName
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('email', '==', searchTerm))
      );
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        const userId = usersSnapshot.docs[0].id;
        
        // Get wallet addresses
        const walletDoc = await getDoc(doc(db, 'walletAddresses', userId));
        const wallets = walletDoc.exists() ? walletDoc.data().wallets || {} : {};
        
        setSelectedUser({
          id: userId,
          email: userData.email || 'Unknown',
          displayName: userData.displayName || 'Unknown User',
          wallets
        });
      } else {
        toast.error('User not found');
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      toast.error('Error searching for user');
      setSelectedUser(null);
    } finally {
      setSearching(false);
    }
  };
  
  const handleScanUser = async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await checkUserDeposits(userId);
      
      if (result.success) {
        toast.success(`Found ${result.foundDeposits.length} deposits for user ${userId}`);
      } else {
        toast.error(`Failed to scan user: ${result.message}`);
      }
      
      loadScanHistory();
    } catch (error) {
      console.error('Error scanning user deposits:', error);
      toast.error('Error scanning user deposits');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAutoScan = () => {
    if (scanStatus?.active) {
      stopAutoDepositChecking();
    } else {
      startAutoDepositChecking();
    }
    
    setScanStatus(getDepositScanStatus());
    toast.success(scanStatus?.active ? 'Auto-scanning stopped' : 'Auto-scanning started');
  };
  
  const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };
  
  const handleServerScan = async (userId = null) => {
    setServerScanning(true);
    try {
      // Get admin key from localStorage or environment
      const adminKey = process.env.REACT_APP_ADMIN_KEY || localStorage.getItem('adminKey');
      
      if (!adminKey) {
        toast.error('Admin key not found. Please set REACT_APP_ADMIN_KEY environment variable or store in localStorage.');
        return;
      }
      
      // Call the server-side scan endpoint
      const response = await axios.post('/api/admin/scan-blockchain-deposits', {
        adminKey,
        userId: userId || null,
        dryRun: false
      });
      
      if (response.data.success) {
        toast.success(`Server scan initiated successfully. Scan ID: ${response.data.result.scanId}`);
        
        // Poll for scan completion
        const scanId = response.data.result.scanId;
        let attempts = 0;
        const maxAttempts = 10;
        
        const pollInterval = setInterval(async () => {
          try {
            attempts++;
            const scanDoc = await getDoc(doc(db, 'depositScans', scanId));
            
            if (scanDoc.exists()) {
              const scanData = scanDoc.data();
              
              if (scanData.status === 'completed') {
                clearInterval(pollInterval);
                toast.success(`Scan completed: Found ${scanData.result?.depositsFound || 0} deposits`);
                loadScanHistory();
              } else if (scanData.status === 'error') {
                clearInterval(pollInterval);
                toast.error(`Scan failed: ${scanData.error || 'Unknown error'}`);
                loadScanHistory();
              } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                toast.warning('Scan still in progress. Check history for results later.');
                loadScanHistory();
              }
            }
          } catch (pollError) {
            console.error('Error polling scan status:', pollError);
          }
        }, 5000);
      } else {
        toast.error(`Failed to start server scan: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error starting server scan:', error);
      toast.error(`Error starting server scan: ${error.response?.data?.error || error.message}`);
    } finally {
      setServerScanning(false);
    }
  };
  
  return (
    <>
      <Container>
        <Header>
          <Title>Wallet Deposit Scanner</Title>
          <Controls>
            <Button
              onClick={toggleAutoScan}
              disabled={loading || serverScanning}
            >
              {scanStatus?.active ? (
                <>
                  <FiPause /> Stop Auto-Scan
                </>
              ) : (
                <>
                  <FiPlay /> Start Auto-Scan
                </>
              )}
            </Button>
            <Button
              onClick={handleScanAll}
              disabled={loading || scanStatus?.scanning || serverScanning}
            >
              <FiRefreshCw /> Client Scan
            </Button>
            <Button
              primary
              onClick={() => handleServerScan()}
              disabled={loading || serverScanning}
            >
              <FiRefreshCw /> {serverScanning ? 'Scanning...' : 'Server Scan All Users'}
            </Button>
          </Controls>
        </Header>
        
        <StatusCard>
          <StatusRow>
            <StatusLabel>Auto-Scan Status:</StatusLabel>
            <StatusValue>
              <Badge type={scanStatus?.active ? 'success' : 'error'}>
                {scanStatus?.active ? 'Active' : 'Inactive'}
              </Badge>
            </StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>Last Scan:</StatusLabel>
            <StatusValue>{scanStatus?.lastScanTime || 'Never'}</StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>Next Scan:</StatusLabel>
            <StatusValue>{scanStatus?.formattedNextScan || 'Not scheduled'}</StatusValue>
          </StatusRow>
          {scanStatus?.lastScanResult && (
            <StatusRow>
              <StatusLabel>Last Result:</StatusLabel>
              <StatusValue>
                {scanStatus.lastScanResult.success ? (
                  <Badge type="success">Success</Badge>
                ) : (
                  <Badge type="error">Failed</Badge>
                )}
                {' '}
                {scanStatus.lastScanResult.success && scanStatus.lastScanResult.results && (
                  <>Found {scanStatus.lastScanResult.results.totalDepositsFound} deposits</>
                )}
              </StatusValue>
            </StatusRow>
          )}
        </StatusCard>
        
        <SearchForm onSubmit={handleSearchUser}>
          <Input
            type="text"
            placeholder="Search by user ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" disabled={searching || !searchTerm}>
            <FiSearch /> Search
          </Button>
        </SearchForm>
        
        {selectedUser && (
          <StatusCard>
            <Title style={{ fontSize: '18px', marginBottom: '16px' }}>
              User: {selectedUser.displayName} ({selectedUser.email})
            </Title>
            <StatusRow>
              <StatusLabel>User ID:</StatusLabel>
              <StatusValue>{selectedUser.id}</StatusValue>
            </StatusRow>
            <StatusRow>
              <StatusLabel>Wallet Addresses:</StatusLabel>
              <StatusValue>
                {Object.keys(selectedUser.wallets).length === 0 ? 'No wallets' : `${Object.keys(selectedUser.wallets).length} wallets`}
              </StatusValue>
            </StatusRow>
            
            {Object.keys(selectedUser.wallets).length > 0 && (
              <WalletsList>
                {Object.entries(selectedUser.wallets).map(([chain, address]) => (
                  <WalletItem key={chain}>
                    <div>
                      <ChainBadge>{chain.toUpperCase()}</ChainBadge>
                      <AddressText>{address}</AddressText>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        onClick={() => handleScanUser(selectedUser.id)}
                        disabled={loading || serverScanning}
                      >
                        <FiRefreshCw /> Client Scan
                      </Button>
                      <Button
                        primary
                        onClick={() => handleServerScan(selectedUser.id)}
                        disabled={loading || serverScanning}
                      >
                        <FiRefreshCw /> Server Scan
                      </Button>
                    </div>
                  </WalletItem>
                ))}
              </WalletsList>
            )}
          </StatusCard>
        )}
      </Container>
      
      <Container>
        <Header>
          <Title>Recent Scan History</Title>
          <Button onClick={loadScanHistory}>
            <FiRefreshCw /> Refresh
          </Button>
        </Header>
        
        {scanHistory.length > 0 ? (
          <ScanResultTable>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>User</th>
                <th>Mode</th>
                <th>Started By</th>
              </tr>
            </thead>
            <tbody>
              {scanHistory.map(scan => (
                <tr key={scan.id}>
                  <td>{scan.timestamp ? formatTimeAgo(scan.timestamp) : 'Unknown'}</td>
                  <td><Badge type="info">{scan.type || 'Unknown'}</Badge></td>
                  <td>{scan.userId || 'All Users'}</td>
                  <td>
                    {scan.dryRun ? (
                      <Badge type="warning">Dry Run</Badge>
                    ) : (
                      <Badge type="success">Live</Badge>
                    )}
                  </td>
                  <td>{scan.startedBy || 'System'}</td>
                </tr>
              ))}
            </tbody>
          </ScanResultTable>
        ) : (
          <EmptyState>
            <FiClock />
            <p>No scan history available</p>
          </EmptyState>
        )}
      </Container>
    </>
  );
};

export default WalletScanner; 