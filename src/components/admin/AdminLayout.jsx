import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import { initializeAdminMonitoring, stopAdminMonitoring } from '../../services/adminService';

const AdminContainer = styled.div`
  padding: 20px;
  color: var(--text);
  max-width: 1500px;
  margin: 0 auto;
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

/**
 * AdminLayout - Wrapper component for admin pages
 * Initializes real-time monitoring for deposits and wallets
 */
const AdminLayout = ({ children, title = "Admin Dashboard" }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
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
    
    // Cleanup on unmount
    return () => {
      stopAdminMonitoring();
    };
  }, [currentUser, navigate]);
  
  const handleNavClick = (path) => {
    navigate(path);
  };
  
  return (
    <AdminContainer>
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: 'rgba(14, 203, 129, 0.1)',
              color: '#0ECB81',
              border: '1px solid rgba(14, 203, 129, 0.2)',
            },
            iconTheme: {
              primary: '#0ECB81',
              secondary: '#000',
            },
          },
          error: {
            style: {
              background: 'rgba(246, 70, 93, 0.1)',
              color: '#F6465D',
              border: '1px solid rgba(246, 70, 93, 0.2)',
            },
            iconTheme: {
              primary: '#F6465D',
              secondary: '#000',
            },
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
        </AdminNav>
      </AdminHeader>
      
      {children}
    </AdminContainer>
  );
};

export default AdminLayout; 