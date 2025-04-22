import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { initializeAdminMonitoring, stopAdminMonitoring, getMonitoringStatus } from '../../services/adminService';
import { Bell } from 'react-bootstrap-icons';

const AdminContainer = styled.div`
  padding: 20px;
  color: var(--text);
  max-width: 1500px;
  margin: 0 auto;
  position: relative;
`;

const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
`;

const AdminTitle = styled.h1`
  font-size: 24px;
  color: var(--text);
  margin: 0;
`;

const AdminNav = styled.nav`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const NavLink = styled.button`
  background: none;
  border: none;
  color: var(--text-light);
  padding: 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--bg2);
    color: var(--text);
  }
  
  &.active {
    background: var(--primary);
    color: white;
  }
`;

const NotificationIcon = styled.div`
  position: relative;
  cursor: pointer;
  margin-left: 15px;
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: var(--primary);
  color: white;
  font-size: 10px;
  font-weight: bold;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NotificationsPanel = styled.div`
  position: absolute;
  top: 60px;
  right: 20px;
  width: 300px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--bg1);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 0;
  display: ${props => props.visible ? 'block' : 'none'};
`;

const NotificationHeader = styled.div`
  padding: 10px 15px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h4 {
    margin: 0;
    font-size: 16px;
  }
  
  button {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }
`;

const NotificationItem = styled.div`
  padding: 10px 15px;
  border-bottom: 1px solid var(--line);
  
  &:last-child {
    border-bottom: none;
  }
  
  .title {
    font-weight: 500;
    margin-bottom: 5px;
  }
  
  .time {
    font-size: 12px;
    color: var(--text-light);
  }
  
  .deposit-amount {
    color: var(--primary);
    font-weight: 500;
  }
`;

const EmptyNotifications = styled.div`
  padding: 20px;
  text-align: center;
  color: var(--text-light);
`;

/**
 * AdminLayout - Wrapper component for admin pages
 * Initializes real-time monitoring for deposits and wallets
 */
const AdminLayout = ({ children, title = "Admin Dashboard" }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Initialize admin monitoring when component mounts
  useEffect(() => {
    // Check if user is authenticated and has admin rights
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Initialize real-time monitoring services
    const monitoringInitialized = initializeAdminMonitoring();
    console.log(`Admin monitoring services ${monitoringInitialized ? 'initialized' : 'already running'}`);
    
    // Setup a listener for the custom deposit event
    const handleDeposit = (event) => {
      const deposit = event.detail;
      setNotifications(prev => [
        {
          id: Date.now(),
          title: `New deposit received`,
          amount: deposit.amount,
          token: deposit.token,
          userId: deposit.userId,
          time: new Date()
        },
        ...prev.slice(0, 9) // Keep only the 10 most recent notifications
      ]);
    };
    
    // Listen for the custom deposit event
    window.addEventListener('deposit-received', handleDeposit);
    
    // Cleanup on unmount
    return () => {
      stopAdminMonitoring();
      window.removeEventListener('deposit-received', handleDeposit);
    };
  }, [currentUser, navigate]);
  
  const handleNavClick = (path) => {
    navigate(path);
  };
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };
  
  const clearNotifications = () => {
    setNotifications([]);
  };
  
  return (
    <AdminContainer>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          success: {
            style: {
              background: 'rgba(14, 203, 129, 0.9)',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            iconTheme: {
              primary: '#FFFFFF',
              secondary: '#0ECB81',
            },
            duration: 3000,
          },
          error: {
            style: {
              background: 'rgba(246, 70, 93, 0.9)',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            iconTheme: {
              primary: '#FFFFFF',
              secondary: '#F6465D',
            },
            duration: 3000,
          },
        }}
      />
      
      <AdminHeader>
        <AdminTitle>{title}</AdminTitle>
        <AdminNav>
          <NavLink onClick={() => handleNavClick('/admin/dashboard')}>Dashboard</NavLink>
          <NavLink onClick={() => handleNavClick('/admin/users')}>Users</NavLink>
          <NavLink onClick={() => handleNavClick('/admin/deposits')}>Deposits</NavLink>
          <NavLink onClick={() => handleNavClick('/admin/pair-management')}>Pair Management</NavLink>
          <NavLink onClick={() => handleNavClick('/admin/settings')}>Settings</NavLink>
          
          <NotificationIcon onClick={toggleNotifications}>
            <Bell size={18} />
            {notifications.length > 0 && (
              <NotificationBadge>{notifications.length}</NotificationBadge>
            )}
          </NotificationIcon>
        </AdminNav>
      </AdminHeader>
      
      <NotificationsPanel visible={showNotifications}>
        <NotificationHeader>
          <h4>Recent Deposits</h4>
          <button onClick={clearNotifications}>Clear All</button>
        </NotificationHeader>
        
        {notifications.length === 0 ? (
          <EmptyNotifications>No new deposits</EmptyNotifications>
        ) : (
          notifications.map(notification => (
            <NotificationItem key={notification.id}>
              <div className="title">
                <span className="deposit-amount">
                  {notification.amount} {notification.token}
                </span> deposit received
              </div>
              <div className="time">
                {notification.time.toLocaleTimeString()}
              </div>
            </NotificationItem>
          ))
        )}
      </NotificationsPanel>
      
      {children}
    </AdminContainer>
  );
};

export default AdminLayout; 