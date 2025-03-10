import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DashboardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ActivityCard = styled.div`
  background: rgba(22, 27, 34, 0.5);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  h3 {
    margin: 0 0 15px 0;
    color: #e6edf3;
    font-size: 18px;
    font-weight: 500;
  }
  
  .content {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.6;
  }
`;

const BalanceCard = styled(ActivityCard)`
  .balance-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .balance-item {
    padding: 10px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    
    .token {
      font-weight: 500;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .amount {
      font-size: 18px;
      font-weight: 600;
      color: #e6edf3;
    }
  }
  
  .last-updated {
    margin-top: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    text-align: right;
  }
  
  .refresh-button {
    margin-top: 15px;
    background: rgba(255, 114, 90, 0.1);
    color: #ff725a;
    border: 1px solid rgba(255, 114, 90, 0.2);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(255, 114, 90, 0.2);
    }
  }
`;

const ChartContainer = styled.div`
  background: rgba(22, 27, 34, 0.5);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  grid-column: 1 / -1;
  
  h3 {
    margin: 0 0 15px 0;
    color: #e6edf3;
    font-size: 18px;
    font-weight: 500;
  }
  
  .chart-placeholder {
    background: rgba(255, 255, 255, 0.05);
    height: 300px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
  }
`;

const StatsCard = styled(ActivityCard)`
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .stat-item {
    padding: 10px;
    
    .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 5px;
    }
    
    .value {
      font-size: 24px;
      font-weight: 600;
      color: #e6edf3;
    }
  }
`;

const RecentActivity = styled(ActivityCard)`
  .activity-item {
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    
    &:last-child {
      border-bottom: none;
    }
    
    .time {
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin-top: 4px;
    }
  }
`;

const DepositStatsCard = styled(ActivityCard)`
  .stat-item {
    padding: 12px 0;
    margin-bottom: 10px;
    
    .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 5px;
    }
    
    .value {
      font-size: 20px;
      font-weight: 600;
      color: #e6edf3;
    }
  }
  
  .recent-deposits {
    margin-top: 15px;
    
    h4 {
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: 500;
      color: #e6edf3;
    }
    
    .deposit-item {
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      margin-bottom: 8px;
      
      .deposit-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      
      .deposit-user {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .deposit-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }
    }
  }
`;

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    pendingWithdrawals: 0,
    totalTransactions: 0,
    activeUsers: 0
  });
  const [balances, setBalances] = useState({
    ETH: 0,
    BNB: 0,
    MATIC: 0,
    SOL: 0,
    lastUpdated: null,
    walletCount: 0,
    userCount: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('');
  const [depositStats, setDepositStats] = useState({
    totalDeposits: 0,
    totalDepositAmount: 0,
    recentDeposits: [],
    hasMore: false,
    latestDeposits: []
  });

  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      fetchDepositStats();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user count
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userCount = usersSnapshot.size;
      
      // Fetch pending withdrawals
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      
      let pendingWithdrawals = 0;
      let totalTransactions = 0;
      let recentActivityList = [];
      
      // Process transactions in memory
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalTransactions++;
        
        // Count pending withdrawals
        if (data.type === 'withdrawal' && data.status === 'pending') {
          pendingWithdrawals++;
        }
        
        // Add to recent activity
        recentActivityList.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      // Sort by timestamp and limit to 5 most recent
      recentActivityList.sort((a, b) => b.timestamp - a.timestamp);
      recentActivityList = recentActivityList.slice(0, 5);
      
      // Update state
      setStats({
        users: userCount,
        pendingWithdrawals,
        totalTransactions,
        activeUsers: Math.round(userCount * 0.7) // Estimated active users
      });
      
      setRecentActivity(recentActivityList);
      
      // Fetch deposit stats separately
      await fetchDepositStats();
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDepositStats = async () => {
    try {
      // Make the initial request to get the first page and total pages
      const response = await axios.get('/api/admin/deposit-stats?page=1&pageSize=20');
      
      if (response.data && response.data.success) {
        // Extract deposit information from the response
        const { deposits, summary } = response.data;
        
        // Update the stats state with the summary data
        setDepositStats({
          totalDeposits: summary.totalCount || 0,
          totalDepositAmount: summary.totalAmount || 0,
          recentDeposits: deposits || [],
          hasMore: summary.hasMore || false,
          latestDeposits: deposits || []
        });
      } else {
        console.error('Error fetching deposit stats:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching deposit stats:', error);
    }
  };
  
  const formatBalanceTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const formatActivityItem = (activity) => {
    if (!activity) return '';
    
    const time = activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time';
    
    switch (activity.type) {
      case 'withdrawal':
        return `Withdrawal request: ${activity.amount} ${activity.token} (${activity.status})`;
      case 'deposit':
        return `Deposit: ${activity.amount} ${activity.token} (${activity.status})`;
      default:
        return `Transaction: ${activity.id}`;
    }
  };
  
  const refreshAllBalances = async () => {
    try {
      setRefreshing(true);
      
      // Make the initial request to get the first page and total pages
      const refreshResponse = await axios.get('/api/admin/refresh-all-balances?page=1&pageSize=20');
      
      if (refreshResponse.data && refreshResponse.data.success) {
        // Get pagination info from first request
        const { totalPages, processed: firstPageProcessed } = refreshResponse.data;
        let totalProcessed = firstPageProcessed;
        
        // Update status with progress info
        setRefreshStatus(`Processing page 1 of ${totalPages}... (${totalProcessed} users)`);
        
        // Process remaining pages if there are any
        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page++) {
            setRefreshStatus(`Processing page ${page} of ${totalPages}... (${totalProcessed} users so far)`);
            
            try {
              const pageResponse = await axios.get(`/api/admin/refresh-all-balances?page=${page}&pageSize=20`);
              
              if (pageResponse.data && pageResponse.data.success) {
                totalProcessed += pageResponse.data.processed;
              } else {
                console.error(`Error processing page ${page}:`, pageResponse.data);
              }
            } catch (pageError) {
              console.error(`Error processing page ${page}:`, pageError);
            }
          }
        }
        
        setRefreshStatus(`Completed refreshing balances for ${totalProcessed} users`);
        toast.success(`Successfully refreshed balances for ${totalProcessed} users`);
        
        // Refresh data after updating balances
        fetchDashboardData();
      } else {
        setRefreshStatus('Failed to refresh balances');
        toast.error('Failed to refresh balances');
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
      setRefreshStatus('Error refreshing balances');
      toast.error('Error refreshing balances');
    } finally {
      setRefreshing(false);
      
      // Clear status after a delay
      setTimeout(() => {
        setRefreshStatus('');
      }, 5000);
    }
  };

  return (
    <div>
      <DashboardContainer>
        <StatsCard>
          <h3>Platform Status</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <div className="label">Users</div>
              <div className="value">{stats.users}</div>
            </div>
            <div className="stat-item">
              <div className="label">Active Users</div>
              <div className="value">{stats.activeUsers}</div>
            </div>
            <div className="stat-item">
              <div className="label">Transactions</div>
              <div className="value">{stats.totalTransactions}</div>
            </div>
            <div className="stat-item">
              <div className="label">Pending Withdrawals</div>
              <div className="value">{stats.pendingWithdrawals}</div>
            </div>
          </div>
        </StatsCard>
        
        <DepositStatsCard>
          <h3>Deposit Statistics</h3>
          <div className="stat-item">
            <div className="label">Total Deposits</div>
            <div className="value">{depositStats.totalDeposits}</div>
          </div>
          <div className="stat-item">
            <div className="label">Total Amount</div>
            <div className="value">${depositStats.totalDepositAmount.toFixed(2)}</div>
          </div>
          
          <div className="recent-deposits">
            <h4>Recent Deposits</h4>
            {depositStats.recentDeposits && depositStats.recentDeposits.length > 0 ? (
              depositStats.recentDeposits.slice(0, 5).map((deposit, index) => (
                <div key={index} className="deposit-item">
                  <div className="deposit-details">
                    <span>{deposit.amount} {deposit.token}</span>
                    <span className="deposit-status">{deposit.status}</span>
                  </div>
                  <div className="deposit-user">User: {deposit.userId || 'Unknown'}</div>
                  <div className="deposit-time">
                    {deposit.timestamp ? new Date(deposit.timestamp).toLocaleString() : 'Unknown time'}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '10px 0' }}>
                No recent deposits
              </div>
            )}
          </div>
        </DepositStatsCard>
        
        <BalanceCard>
          <h3>Latest Balances</h3>
          <div className="balance-grid">
            <div className="balance-item">
              <div className="token">ETH <img src="/images/tokens/eth.svg" width="16" alt="ETH" /></div>
              <div className="amount">{balances.ETH.toFixed(4)}</div>
            </div>
            <div className="balance-item">
              <div className="token">BNB <img src="/images/tokens/bnb.svg" width="16" alt="BNB" /></div>
              <div className="amount">{balances.BNB.toFixed(4)}</div>
            </div>
            <div className="balance-item">
              <div className="token">MATIC <img src="/images/tokens/matic.svg" width="16" alt="MATIC" /></div>
              <div className="amount">{balances.MATIC.toFixed(4)}</div>
            </div>
            <div className="balance-item">
              <div className="token">SOL <img src="/images/tokens/sol.svg" width="16" alt="SOL" /></div>
              <div className="amount">{balances.SOL.toFixed(4)}</div>
            </div>
          </div>
          <div className="last-updated">
            Last updated: {formatBalanceTimestamp(balances.lastUpdated)}
          </div>
          <button 
            className="refresh-button" 
            onClick={refreshAllBalances}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Balances'}
          </button>
        </BalanceCard>
        
        <RecentActivity>
          <h3>Recent Activity</h3>
          <div className="content">
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div>{formatActivityItem(activity)}</div>
                  <div className="time">{new Date(activity.timestamp).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </RecentActivity>
      </DashboardContainer>
    </div>
  );
}

export default Dashboard; 