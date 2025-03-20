import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SUPPORTED_CHAINS } from '../../services/walletService';

const Container = styled.div`
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

const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--bg2);
  color: var(--text);
  border: 1px solid var(--line);
`;

const DepositsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  th {
    background-color: rgba(0, 0, 0, 0.2);
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  tr:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .amount-cell {
    text-align: right;
    font-family: monospace;
    font-weight: 600;
    font-size: 14px;
    color: #00c853;
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
`;

const AddressLink = styled.a`
  color: var(--primary);
  text-decoration: none;
  font-family: monospace;
  font-size: 14px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 4px;
  margin-left: 4px;
  border-radius: 4px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const UserLink = styled(Link)`
  color: var(--primary);
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  gap: 8px;
`;

const PageButton = styled.button`
  padding: 8px 12px;
  background: ${props => props.active ? 'var(--primary)' : 'var(--bg2)'};
  color: ${props => props.active ? 'white' : 'var(--text)'};
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

const Card = styled.div`
  background: var(--bg2);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--line);
  
  h3 {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
    margin-bottom: 8px;
  }
  
  .value {
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px;
  
  .spinner {
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const RefreshButton = styled.button`
  background: rgba(255, 114, 90, 0.1);
  color: #ff725a;
  border: 1px solid rgba(255, 114, 90, 0.2);
  border-radius: 4px;
  padding: 8px 15px;
  margin-right: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  
  &:hover {
    background: rgba(255, 114, 90, 0.2);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  i {
    margin-right: 6px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .left {
    display: flex;
    align-items: center;
  }
  
  .right {
    display: flex;
    align-items: center;
  }
  
  .last-updated {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    margin-right: 15px;
  }
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  
  .empty-icon {
    font-size: 60px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 20px;
  }
  
  .message {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 30px;
  }
  
  .create-button {
    background: rgba(255, 114, 90, 0.1);
    color: #ff725a;
    border: 1px solid rgba(255, 114, 90, 0.2);
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 114, 90, 0.2);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`;

const TableContainer = styled.div`
  .transaction-hash {
    max-width: 150px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
`;

const Title = styled.h2`
  margin: 0;
  color: #e6edf3;
  font-size: 18px;
  font-weight: 500;
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
`;

const SearchContainer = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  padding: 8px 12px 8px 36px;
  font-size: 14px;
  width: 250px;
  
  &:focus {
    outline: none;
    border-color: #58a6ff;
  }
`;

const SearchIcon = styled.i`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #8b949e;
`;

const FilterButton = styled.button`
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  padding: 8px 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  
  &:hover {
    background: #30363d;
  }
`;

const FilterMenu = styled.div`
  position: absolute;
  top: 40px;
  right: 0;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  width: 240px;
  padding: 12px;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
`;

const FilterGroup = styled.div`
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: #8b949e;
  margin-bottom: 6px;
`;

const FilterOption = styled.div`
  display: flex;
  align-items: center;
  padding: 6px 0;
  
  input {
    margin-right: 8px;
  }
  
  label {
    color: #c9d1d9;
    font-size: 14px;
    cursor: pointer;
  }
`;

const FilterActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid #30363d;
  padding-top: 12px;
`;

const FilterButton2 = styled.button`
  background: ${props => props.primary ? '#238636' : 'transparent'};
  border: 1px solid ${props => props.primary ? '#238636' : '#30363d'};
  border-radius: 6px;
  color: ${props => props.primary ? '#fff' : '#c9d1d9'};
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.primary ? '#2ea043' : '#30363d'};
  }
`;

const DetailValue = styled.div`
  color: var(--text);
  font-size: 16px;
`;

// Helper function to verify transaction hash validity
const isValidTransactionHash = (hash, chain) => {
  if (!hash || !chain) return false;
  
  // Ignore validation for specific hash formats (these are our internal identifiers)
  if (hash.includes('_')) return true;
  
  // Basic format validation based on chain
  switch (chain) {
    case 'ethereum':
    case 'bsc':
    case 'polygon':
    case 'arbitrum':
    case 'base':
      // EVM chains use 0x + 64 hex characters
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    case 'solana':
      // Solana transactions are base58 encoded and typically 88 characters
      return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(hash);
    default:
      return true; // Be lenient with unknown chains
  }
};

// Function to get blockchain explorer URL based on chain and tx hash
const getExplorerUrl = (value, chain, type = 'tx') => {
  if (!value || !chain) return '#';
  
  const explorers = {
    ethereum: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    solana: 'https://solscan.io',
    arbitrum: 'https://arbiscan.io',
    base: 'https://basescan.org'
  };
  
  const explorer = explorers[chain] || '#';
  
  if (explorer === '#') return '#';
  
  // Handle different URL formats based on type
  if (type === 'address') {
    return `${explorer}/address/${value}`;
  } else {
    return `${explorer}/tx/${value}`;
  }
};

// Function to truncate transaction hash for display
const truncateHash = (hash) => {
  if (!hash) return 'N/A';
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

// Add a new styled component for the dummy indicator
const DummyIndicator = styled.span`
  background-color: rgba(255, 87, 51, 0.15);
  color: #ff5733;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  vertical-align: middle;
  font-weight: bold;
`;

const AllDeposits = () => {
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    network: null,
    status: null,
    timeRange: 'all'
  });
  const [filter, setFilter] = useState('all');
  const [users, setUsers] = useState({});
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showOnlyReal, setShowOnlyReal] = useState(true);

  // Add a new fetchDeposits function that can be called on demand
  const fetchDeposits = async () => {
    setLoading(true);
    try {
      console.log('Fetching deposits...');
      
      // Get all users first for reference
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = {};
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData[doc.id] = userData;
      });
      
      console.log(`Fetched ${Object.keys(usersData).length} users for reference`);
      
      let depositsQuery;
      
      if (showOnlyReal) {
        // Try to fetch only real deposits first
        try {
          // Note: Firestore has limitations with compound queries
          // We can't use multiple inequality queries on different fields
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            where('isRealDeposit', '==', true),
            where('status', '==', 'completed'), // Only show completed deposits
            orderBy('timestamp', 'desc')
          );
    } catch (error) {
          console.error('Error with real deposits query:', error);
          // Fallback to basic query
          depositsQuery = query(
            collection(db, 'transactions'),
            where('type', '==', 'deposit'),
            where('status', '==', 'completed'), // Only show completed deposits
            orderBy('timestamp', 'desc')
          );
        }
      } else {
        // Get all deposits but still only completed ones
        depositsQuery = query(
          collection(db, 'transactions'),
          where('type', '==', 'deposit'),
          where('status', '==', 'completed'),
          orderBy('timestamp', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(depositsQuery);
      const fetchedDeposits = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only include transactions with a userId AND a valid transaction hash
        if (data.userId && data.transactionHash && data.transactionHash !== 'Pending...') {
          const user = usersData[data.userId] || {};
          
          // If showOnlyReal is true, only include deposits with isRealDeposit=true
          if (!showOnlyReal || data.isRealDeposit === true) {
            fetchedDeposits.push({
              id: doc.id,
              ...data,
              // Add user information
              userEmail: user.email || 'Unknown',
              userName: user.displayName || 'Unknown User',
              timestamp: data.timestamp?.toDate() || new Date(),
              // Mark as dummy if not explicitly marked as real
              potentiallyDummy: showOnlyReal ? false : data.isRealDeposit !== true
            });
          }
        }
      });
      
      console.log(`Loaded ${fetchedDeposits.length} deposits with user data`);
      setDeposits(fetchedDeposits);
      setLastRefresh(new Date());
      
      // If no deposits were found and we're in "real only" mode, switch to showing all
      if (fetchedDeposits.length === 0 && showOnlyReal) {
        console.log('No real deposits found, fetching all deposits...');
        setShowOnlyReal(false);
        // Recursively call again, but now it will get all deposits
        await fetchDeposits();
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast.error('Failed to load deposits');
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to call the new function
  useEffect(() => {
    fetchDeposits();
  }, [showOnlyReal]);

  // Add a toggle function for real/all deposits
  const toggleRealDeposits = () => {
    setShowOnlyReal(!showOnlyReal);
  };

  // Filter deposits based on search term and filters
  const filteredDeposits = deposits.filter(deposit => {
    // Filter by search term
    const searchMatch = 
      deposit.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.toAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by network (use both filters.network and filter)
    const networkMatch = 
      (!filters.network || deposit.chainId === filters.network) && 
      (filter === 'all' || deposit.network === filter || deposit.chain === filter);
    
    // Filter by status
    const statusMatch = !filters.status || deposit.status === filters.status;
    
    // Filter by time range
    let timeMatch = true;
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const depositDate = deposit.timestamp?.toDate() || new Date();
      
      if (filters.timeRange === 'today') {
        timeMatch = depositDate.toDateString() === now.toDateString();
      } else if (filters.timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        timeMatch = depositDate >= weekAgo;
      } else if (filters.timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        timeMatch = depositDate >= monthAgo;
      }
    }
    
    return searchMatch && networkMatch && statusMatch && timeMatch;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDeposits = filteredDeposits.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const resetFilters = () => {
    setFilters({
      network: null,
      status: null,
      timeRange: 'all'
    });
    setFilterOpen(false);
  };

  const handleViewDetails = (deposit) => {
    setSelectedDeposit(deposit);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDeposit(null);
  };

  if (loading) {
      return (
      <Container>
        <Header>
          <Title>All Deposits</Title>
        </Header>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </Container>
    );
  }

    return (
    <Container>
      <Header>
        <Title>All Deposits</Title>
        <Controls>
          <SearchContainer>
            <SearchIcon className="bi bi-search"></SearchIcon>
            <SearchInput 
              type="text" 
              placeholder="Search users or transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>
          <div style={{ position: 'relative' }}>
            <FilterButton onClick={() => setFilterOpen(!filterOpen)}>
              <i className="bi bi-funnel"></i>
              Filter
            </FilterButton>
            
            {filterOpen && (
              <FilterMenu>
                <FilterGroup>
                  <FilterLabel>Network</FilterLabel>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="network-all" 
                      name="network"
                      checked={!filters.network}
                      onChange={() => setFilters({...filters, network: null})}
                    />
                    <label htmlFor="network-all">All Networks</label>
                  </FilterOption>
                  {Object.entries(SUPPORTED_CHAINS).map(([chainId, chainData]) => (
                    <FilterOption key={chainId}>
                      <input 
                        type="radio" 
                        id={`network-${chainId}`}
                        name="network"
                        checked={filters.network === chainId}
                        onChange={() => setFilters({...filters, network: chainId})}
                      />
                      <label htmlFor={`network-${chainId}`}>{chainData?.name || chainId}</label>
                    </FilterOption>
                  ))}
                </FilterGroup>
                
                <FilterGroup>
                  <FilterLabel>Status</FilterLabel>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="status-all" 
                      name="status"
                      checked={!filters.status}
                      onChange={() => setFilters({...filters, status: null})}
                    />
                    <label htmlFor="status-all">All Statuses</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="status-confirmed" 
                      name="status"
                      checked={filters.status === 'confirmed'}
                      onChange={() => setFilters({...filters, status: 'confirmed'})}
                    />
                    <label htmlFor="status-confirmed">Confirmed</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="status-pending" 
                      name="status"
                      checked={filters.status === 'pending'}
                      onChange={() => setFilters({...filters, status: 'pending'})}
                    />
                    <label htmlFor="status-pending">Pending</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="status-failed" 
                      name="status"
                      checked={filters.status === 'failed'}
                      onChange={() => setFilters({...filters, status: 'failed'})}
                    />
                    <label htmlFor="status-failed">Failed</label>
                  </FilterOption>
                </FilterGroup>
                
                <FilterGroup>
                  <FilterLabel>Time Range</FilterLabel>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="time-all" 
                      name="timeRange"
                      checked={filters.timeRange === 'all'}
                      onChange={() => setFilters({...filters, timeRange: 'all'})}
                    />
                    <label htmlFor="time-all">All Time</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="time-today" 
                      name="timeRange"
                      checked={filters.timeRange === 'today'}
                      onChange={() => setFilters({...filters, timeRange: 'today'})}
                    />
                    <label htmlFor="time-today">Today</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="time-week" 
                      name="timeRange"
                      checked={filters.timeRange === 'week'}
                      onChange={() => setFilters({...filters, timeRange: 'week'})}
                    />
                    <label htmlFor="time-week">Last 7 Days</label>
                  </FilterOption>
                  <FilterOption>
                    <input 
                      type="radio" 
                      id="time-month" 
                      name="timeRange"
                      checked={filters.timeRange === 'month'}
                      onChange={() => setFilters({...filters, timeRange: 'month'})}
                    />
                    <label htmlFor="time-month">Last 30 Days</label>
                  </FilterOption>
                </FilterGroup>
                
                <FilterActions>
                  <FilterButton2 onClick={resetFilters}>Reset</FilterButton2>
                  <FilterButton2 primary onClick={() => setFilterOpen(false)}>Apply</FilterButton2>
                </FilterActions>
              </FilterMenu>
            )}
        </div>
        </Controls>
      </Header>
      
      <ActionBar>
        <div className="left">
          <RefreshButton onClick={fetchDeposits} disabled={loading}>
            <i className="fas fa-sync-alt"></i> Refresh Data
          </RefreshButton>
          <button
            onClick={toggleRealDeposits}
            style={{
              marginRight: '15px',
              padding: '8px 12px',
              background: showOnlyReal ? 'rgba(14, 203, 129, 0.2)' : 'rgba(255, 87, 51, 0.2)',
              color: showOnlyReal ? '#0ECB81' : '#ff5733',
              border: `1px solid ${showOnlyReal ? 'rgba(14, 203, 129, 0.3)' : 'rgba(255, 87, 51, 0.3)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showOnlyReal ? 'Showing Real Deposits' : 'Showing All Deposits'}
          </button>
          <div className="last-updated">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <div className="right">
          <FilterContainer>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Networks</option>
              <option value="ethereum">Ethereum</option>
              <option value="bsc">BNB Chain</option>
              <option value="polygon">Polygon</option>
              <option value="solana">Solana</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="base">Base</option>
            </Select>
          </FilterContainer>
        </div>
      </ActionBar>
      
      {filteredDeposits.length > 0 ? (
        <>
          <TableContainer>
            <DepositsTable>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Network</th>
                  <th>To Address</th>
                  <th>From Address</th>
                  <th>Transaction ID</th>
                  <th className="amount-cell">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentDeposits.map((deposit) => (
                  <tr 
                    key={deposit.id} 
                    onClick={() => handleViewDetails(deposit)} 
                    style={{ 
                      cursor: 'pointer',
                      // Add a subtle background color for dummy deposits
                      backgroundColor: deposit.potentiallyDummy ? 'rgba(255, 87, 51, 0.05)' : 'transparent'
                    }}
                  >
                    <td>
                      {deposit.timestamp?.toDate ? deposit.timestamp.toDate().toLocaleString() : new Date(deposit.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <UserLink to={`/admin/deposits/${deposit.userId}`}>
                        {deposit.userName || 'Unknown User'}
                      </UserLink>
                      <div style={{ color: '#8b949e', fontSize: '12px' }}>
                        {deposit.userEmail || 'No email'}
                      </div>
                    </td>
                    <td>
                      <NetworkBadge network={deposit.network || deposit.chain}>
                        {typeof SUPPORTED_CHAINS[deposit.network || deposit.chain] === 'object' 
                          ? SUPPORTED_CHAINS[deposit.network || deposit.chain]?.name 
                          : deposit.network || deposit.chain || 'Unknown'}
                      </NetworkBadge>
                    </td>
                    <td>
                      <AddressLink 
                        href={getExplorerUrl(deposit.toAddress, deposit.network || deposit.chain, 'address')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {truncateHash(deposit.toAddress)}
                      </AddressLink>
                    </td>
                    <td>
                      {deposit.fromAddress && deposit.fromAddress !== 'N/A' ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <AddressLink 
                            href={getExplorerUrl(deposit.fromAddress, deposit.network || deposit.chain, 'address')} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {truncateHash(deposit.fromAddress)}
                          </AddressLink>
                          <CopyButton
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(deposit.fromAddress);
                              toast.success('From address copied!');
                            }}
                          >
                            <i className="far fa-copy"></i>
                          </CopyButton>
                        </div>
                      ) : (
                        <span style={{ color: '#8b949e' }}>—</span>
                      )}
                    </td>
                    <td>
                      {deposit.transactionHash && deposit.transactionHash !== 'Pending...' ? (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <AddressLink 
                            href={getExplorerUrl(deposit.transactionHash, deposit.network || deposit.chain)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="transaction-hash"
                          >
                            {truncateHash(deposit.transactionHash)}
                          </AddressLink>
                          <CopyButton
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(deposit.transactionHash);
                              toast.success('Transaction hash copied!');
                            }}
                          >
                            <i className="far fa-copy"></i>
                          </CopyButton>
                          {deposit.potentiallyDummy && (
                            <DummyIndicator>TEST</DummyIndicator>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#8b949e' }}>Pending...</span>
                      )}
                    </td>
                    <td className="amount-cell">
                      {parseFloat(deposit.amount).toFixed(6)}
                    </td>
                    <td>
                      <StatusBadge $status={deposit.status || 'pending'}>
                        <i className={`fas fa-${
                          deposit.status === 'completed' ? 'check-circle' : 
                          deposit.status === 'pending' ? 'clock' :
                          deposit.status === 'failed' ? 'times-circle' :
                          'question-circle'
                        }`} />
                        {deposit.status || 'pending'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DepositsTable>
          </TableContainer>
          
          <Pagination>
            <PageButton 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i> Previous
            </PageButton>
            
            <PageButton 
              onClick={handleNextPage}
              disabled={currentDeposits.length < itemsPerPage} 
            >
              Next <i className="fas fa-chevron-right"></i>
            </PageButton>
          </Pagination>

          {/* Details Modal */}
          {showDetailsModal && selectedDeposit && (
            <ModalOverlay onClick={closeDetailsModal}>
              <ModalContent onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <h3>Deposit Details</h3>
                  <CloseButton onClick={closeDetailsModal}>×</CloseButton>
                </ModalHeader>
                <ModalBody>
                  <DetailRow>
                    <DetailLabel>User:</DetailLabel>
                    <DetailValue>
                      <Link to={`/admin/deposits/${selectedDeposit.userId}`} style={{ color: '#58a6ff' }}>
                        {selectedDeposit.userName || 'Unknown'}
                      </Link> 
                      <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                        {selectedDeposit.userEmail || 'No email'} ({selectedDeposit.userId})
                      </div>
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Amount:</DetailLabel>
                    <DetailValue>{selectedDeposit.amount} {selectedDeposit.token}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Network:</DetailLabel>
                    <DetailValue>
                      <NetworkBadge network={selectedDeposit.network || selectedDeposit.chain}>
                        {typeof SUPPORTED_CHAINS[selectedDeposit.network || selectedDeposit.chain] === 'object' 
                          ? SUPPORTED_CHAINS[selectedDeposit.network || selectedDeposit.chain]?.name 
                          : selectedDeposit.network || selectedDeposit.chain || 'Unknown'}
                      </NetworkBadge>
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Status:</DetailLabel>
                    <DetailValue>
                      <StatusBadge status={selectedDeposit.status || 'pending'}>
                        {selectedDeposit.status || 'pending'}
                      </StatusBadge>
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Date:</DetailLabel>
                    <DetailValue>
                      {selectedDeposit.timestamp?.toDate ? selectedDeposit.timestamp.toDate().toLocaleString() : 
                        (selectedDeposit.timestamp ? new Date(selectedDeposit.timestamp).toLocaleString() : 'N/A')}
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Transaction Hash:</DetailLabel>
                    <DetailValue>
                      {selectedDeposit.transactionHash ? (
                        <div>
                          <code style={{ wordBreak: 'break-all' }}>{selectedDeposit.transactionHash}</code>
                          <div style={{ marginTop: '8px' }}>
                            <a 
                              href={getExplorerUrl(selectedDeposit.transactionHash, selectedDeposit.network || selectedDeposit.chain)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#58a6ff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              View on Explorer <i className="bi bi-box-arrow-up-right"></i>
                            </a>
                          </div>
                        </div>
                      ) : 'N/A'}
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>To Address:</DetailLabel>
                    <DetailValue>
                      <code style={{ wordBreak: 'break-all' }}>{selectedDeposit.toAddress || 'N/A'}</code>
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>From Address:</DetailLabel>
                    <DetailValue>
                      <code style={{ wordBreak: 'break-all' }}>{selectedDeposit.fromAddress || 'N/A'}</code>
                    </DetailValue>
                  </DetailRow>
                </ModalBody>
                <ModalFooter>
                  <button 
                    style={{ 
                      background: '#21262d',
                      border: '1px solid #30363d',
                      borderRadius: '6px',
                      color: '#c9d1d9',
                      padding: '8px 16px',
                      cursor: 'pointer'
                    }}
                    onClick={closeDetailsModal}
                  >
                    Close
                  </button>
                </ModalFooter>
              </ModalContent>
            </ModalOverlay>
          )}
        </>
      ) : (
        <EmptyState>
          <i className="bi bi-inbox"></i>
          <h3>No deposits found</h3>
          <p>
            {searchTerm ? 
              `No deposits match your search for "${searchTerm}"` : 
              'No deposits have been recorded yet'}
          </p>
        </EmptyState>
      )}
    </Container>
  );
};

// Define new styled components for modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.div`
  background: #161b22;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid #30363d;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
  
  h3 {
    margin: 0;
    color: #e6edf3;
    font-size: 18px;
    font-weight: 500;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 24px;
  cursor: pointer;
  
  &:hover {
    color: #e6edf3;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #30363d;
  display: flex;
  justify-content: flex-end;
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.div`
  width: 140px;
  flex-shrink: 0;
  color: #8b949e;
  font-weight: 500;
`;

const DepositDetailsModal = ({ isOpen, onClose, deposit }) => {
  if (!isOpen || !deposit) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg2)',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Deposit Details</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text)', 
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '15px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>Transaction ID</div>
          <div style={{ wordBreak: 'break-all' }}>
            {deposit.transactionHash ? (
              <AddressLink 
                href={getExplorerUrl(deposit.transactionHash, deposit.network || deposit.chain)} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {deposit.transactionHash}
              </AddressLink>
            ) : 'Not available'}
          </div>
        </div>
        
        <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>User</div>
            <DetailValue>
              <Link to={`/admin/deposits/${deposit.userId}`} style={{ color: '#58a6ff' }}>
                {deposit.userName || 'Unknown'}
              </Link> 
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                {deposit.userEmail || 'No email'}
              </div>
            </DetailValue>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>Amount</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#0ECB81' }}>
              {parseFloat(deposit.amount).toFixed(6)}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>Network</div>
            <NetworkBadge network={deposit.network || deposit.chain}>
              {typeof SUPPORTED_CHAINS[deposit.network || deposit.chain] === 'object' 
                ? SUPPORTED_CHAINS[deposit.network || deposit.chain]?.name 
                : deposit.network || deposit.chain || 'Unknown'}
            </NetworkBadge>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>Status</div>
            <StatusBadge $status={deposit.status || 'pending'}>
              <i className={`fas fa-${
                deposit.status === 'completed' ? 'check-circle' :
                deposit.status === 'pending' ? 'clock' :
                deposit.status === 'failed' ? 'times-circle' :
                'question-circle'
              }`} />
              {deposit.status || 'pending'}
            </StatusBadge>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>Timestamp</div>
            <div>{deposit.timestamp?.toDate ? deposit.timestamp.toDate().toLocaleString() : new Date(deposit.timestamp).toLocaleString()}</div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>To Address</div>
            <div style={{ wordBreak: 'break-all', fontSize: '14px' }}>
              <AddressLink 
                href={getExplorerUrl(deposit.toAddress, deposit.network || deposit.chain, 'address')} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {deposit.toAddress}
              </AddressLink>
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '5px' }}>From Address</div>
            <div style={{ wordBreak: 'break-all', fontSize: '14px' }}>
              {deposit.fromAddress && deposit.fromAddress !== 'blockchain' && deposit.fromAddress !== 'N/A' ? (
                <AddressLink 
                  href={getExplorerUrl(deposit.fromAddress, deposit.network || deposit.chain, 'address')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {deposit.fromAddress}
                </AddressLink>
              ) : (
                <span>Unknown</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllDeposits; 