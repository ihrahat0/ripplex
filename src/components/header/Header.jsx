import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import DarkMode from './DarkMode';
import menus from '../../pages/menu';
import './styles.scss';
import defaultAvatar from '../../assets/user.png';
import logo from '../../assets/images/logo/logo.png';
import 'react-tabs/style/react-tabs.css';
import { useAuth } from '../../contexts/AuthContext';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import styled, { keyframes } from 'styled-components';
import Notifications from '../Notifications';
import { notificationService } from '../../services/notificationService';

const glowPulse = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(247, 147, 26, 0.2);
  }
  50% {
    box-shadow: 0 0 15px rgba(247, 147, 26, 0.5);
  }
  100% {
    box-shadow: 0 0 5px rgba(247, 147, 26, 0.2);
  }
`;

const textGlow = keyframes`
  0% {
    text-shadow: 0 0 5px rgba(247, 147, 26, 0.2);
  }
  50% {
    text-shadow: 0 0 15px rgba(247, 147, 26, 0.5);
  }
  100% {
    text-shadow: 0 0 5px rgba(247, 147, 26, 0.2);
  }
`;

const logoTextAnimate = keyframes`
  0% {
    opacity: 0.7;
    text-shadow: 0 0 10px #F7931A;
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 20px #F7931A, 0 0 30px rgba(247, 147, 26, 0.5);
  }
  100% {
    opacity: 0.7;
    text-shadow: 0 0 10px #F7931A;
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-5px) rotate(2deg);
  }
  50% {
    transform: translateY(0px) rotate(0deg);
  }
  75% {
    transform: translateY(5px) rotate(-2deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
`;

const shine = keyframes`
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const HeaderContainer = styled.header`
  background-color: #0b0b0f;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const HeaderWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 25px;
  height: 60px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: 992px) {
    display: flex;
    justify-content: space-between;
    padding-left: 50px;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  
  a {
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  
  @media (max-width: 992px) {
    margin-left: 20px;
    justify-content: flex-start;
  }
`;

const Logo = styled.img`
  height: 40px;
  width: auto;
  margin-right: 8px;
  transition: all 0.3s;
  
  @media (max-width: 768px) {
    height: 32px;
  }
  
  @media (max-width: 480px) {
    height: 28px;
  }
`;

const LogoText = styled.span`
  font-family: 'Poppins', 'Montserrat', sans-serif;
  font-weight: 800;
  font-size: 20px;
  color: #fff;
  margin-left: 4px;
  letter-spacing: 0.5px;
  transition: all 0.3s;
  position: relative;
  text-transform: uppercase;
  
  span {
    color: #F7931A;
    font-weight: 800;
  }
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
  
  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const MobileMenuToggle = styled.div`
  display: none;
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 28px;
  cursor: pointer;
  color: white;
  z-index: 99;
  
  @media (max-width: 992px) {
    display: block;
  }
`;

const Navigation = styled.nav`
  display: flex;
  gap: 20px;
  
  @media (max-width: 992px) {
    position: fixed;
    top: 0;
    left: ${({ isOpen }) => (isOpen ? '0' : '-100%')};
    width: 80%;
    max-width: 300px;
    height: 100vh;
    background: #1a1b23;
    flex-direction: column;
    padding: 60px 20px 20px;
    z-index: 98;
    transition: left 0.3s ease-in-out;
    overflow-y: auto;
  }
`;

const NavLink = styled.a`
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  padding: 0 20px;
  height: 100%;
  display: flex;
  align-items: center;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &:hover {
    color: #F7931A;
  }
  
  @media (max-width: 992px) {
    padding: 12px 0;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    height: auto;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  margin: 0 20px;
  
  @media (max-width: 992px) {
    width: auto;
    margin: 15px 0;
  }
`;

const SearchInput = styled.input`
  background-color: #1a1a1f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #fff;
  padding: 8px 18px 8px 40px;
  font-size: 14px;
  width: 180px;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    background-color: #25252d;
    border-color: rgba(247, 147, 26, 0.5);
    width: 220px;
    box-shadow: 0 0 10px rgba(247, 147, 26, 0.3);
  }
  
  @media (max-width: 992px) {
    width: 150px;
    
    &:focus {
      width: 180px;
    }
  }
  
  @media (max-width: 480px) {
    width: 120px;
    
    &:focus {
      width: 150px;
    }
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
`;

const SearchResults = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #1a1a1f;
  border-radius: 10px;
  margin-top: 5px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  padding: 10px;
  display: ${props => props.$visible ? 'block' : 'none'};
`;

const SearchResultItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &:hover {
    background-color: #25252d;
    box-shadow: 0 0 8px rgba(247, 147, 26, 0.3);
  }
`;

const ResultIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
`;

const ResultName = styled.div`
  font-size: 14px;
  color: #fff;
`;

const LoginButton = styled(Link)`
  color: #fff;
  text-decoration: none;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  margin-right: 12px;
  transition: all 0.3s;
  
  &:hover {
    color: #F7931A;
    animation: ${textGlow} 1.5s ease-in-out infinite;
  }
`;

const SignUpButton = styled(Link)`
  background-color: #F7931A;
  color: #fff;
  text-decoration: none;
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
  
  &:hover {
    background-color: #e88a18;
    box-shadow: 0 0 15px rgba(247, 147, 26, 0.5);
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  grid-column: 3;
  justify-content: flex-end;
  position: relative;
  
  @media (max-width: 992px) {
    margin-left: auto;
    position: static;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  margin-left: 16px;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s;
  
  &:hover {
    color: #F7931A;
    transform: scale(1.1);
    animation: ${textGlow} 1.5s ease-in-out infinite;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin-left: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #F7931A;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1f;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(247, 147, 26, 0.5);
  }

  @media (max-width: 768px) {
    margin-left: 8px;
    width: 36px;
    height: 36px;
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  
  &:not([src]), &[src=""] {
    &::after {
      content: attr(alt);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F7931A;
      color: #1a1a1f;
      font-weight: bold;
      font-size: 18px;
    }
  }
`;

const AdminLink = styled(Link)`
  color: #F7931A;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid #F7931A;
  border-radius: 4px;
  margin-right: 10px;
  font-size: 14px;
  transition: all 0.3s;
  
  &:hover {
    background: #F7931A;
    color: white;
    box-shadow: 0 0 15px rgba(247, 147, 26, 0.5);
  }
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 5px;
  background-color: ${props => props.$status === 'pending' ? '#F7931A' : 
                              props.$status === 'approved' ? '#03A9F4' : 
                              props.$status === 'rejected' ? '#F6465D' : 
                              '#0ECB81'};
  color: white;
  border-radius: 50%;
  width: 8px;
  height: 8px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(247, 147, 26, 0.4);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(247, 147, 26, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(247, 147, 26, 0);
    }
  }
`;

const NavContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 20px;
  
  @media (max-width: 992px) {
    display: none;
  }
`;

const Header = () => {
    const { currentUser, isEmailVerified, logout } = useAuth();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);
    const [userData, setUserData] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
    const [recentWithdrawalUpdates, setRecentWithdrawalUpdates] = useState([]);
    const searchInputRef = useRef(null);
    const searchResultsRef = useRef(null);
    const [openProfile, setOpenProfile] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [adminVerified, setAdminVerified] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const searchRef = useRef(null);
    const profileRef = useRef(null);
    const notificationRef = useRef(null);
    const [userAvatar, setUserAvatar] = useState(defaultAvatar);

    // Check if we're on login or register page
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    // Add the missing checkAdminStatus function
    const checkAdminStatus = async () => {
        if (!user) return false;
        
        try {
            // Check if user document exists and has admin role
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.data();
            const isUserAdmin = userDoc.exists() && userData.role === 'admin';
            
            setIsAdmin(isUserAdmin);
            return isUserAdmin;
        } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            
            if (user) {
                // Get user data including photoURL or profilePic
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
                
                // Now it's safe to call checkAdminStatus since it's defined
                await checkAdminStatus();
            } else {
                setUserData(null);
                setIsAdmin(false);
            }
        });
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setNotificationCount(0);
            return;
        }

        const fetchNotificationCount = async () => {
            try {
                const count = await notificationService.getUnreadCount(currentUser.uid);
                setNotificationCount(count);
            } catch (error) {
                console.error('Error fetching notification count:', error);
            }
        };

        fetchNotificationCount();

        // Set up a timer to periodically check for new notifications
        const intervalId = setInterval(fetchNotificationCount, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, [currentUser]);

    // Listen for withdrawal status changes
    useEffect(() => {
        if (!currentUser) return;
        
        // Listen for pending withdrawals
        const pendingWithdrawalsQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            where('type', '==', 'withdrawal'),
            where('status', '==', 'pending'),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        
        const pendingUnsubscribe = onSnapshot(pendingWithdrawalsQuery, (snapshot) => {
            const withdrawals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            setPendingWithdrawals(withdrawals);
        });
        
        // Listen for recent withdrawal status updates (approved, rejected, completed)
        const recentUpdatesQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            where('type', '==', 'withdrawal'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        
        const updatesUnsubscribe = onSnapshot(recentUpdatesQuery, (snapshot) => {
            const last24Hours = new Date();
            last24Hours.setHours(last24Hours.getHours() - 24);
            
            const recentUpdates = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                    approvedAt: doc.data().approvedAt?.toDate() || null,
                    rejectedAt: doc.data().rejectedAt?.toDate() || null,
                    completedAt: doc.data().completedAt?.toDate() || null
                }))
                .filter(withdrawal => {
                    // Include withdrawals with status changes in the last 24 hours
                    const statusChangeTime = withdrawal.approvedAt || withdrawal.rejectedAt || withdrawal.completedAt;
                    return statusChangeTime && statusChangeTime > last24Hours;
                });
                
            setRecentWithdrawalUpdates(recentUpdates);
        });
        
        return () => {
            pendingUnsubscribe();
            updatesUnsubscribe();
        };
    }, [currentUser]);
    
    const getWithdrawalNotificationStatus = () => {
        if (pendingWithdrawals.length > 0) return 'pending';
        if (recentWithdrawalUpdates.length > 0) {
            // Return the status of the most recent update
            if (recentWithdrawalUpdates[0].completedAt) return 'completed';
            if (recentWithdrawalUpdates[0].approvedAt) return 'approved';
            if (recentWithdrawalUpdates[0].rejectedAt) return 'rejected';
        }
        return null;
    };
    
    const hasWithdrawalNotifications = () => {
        return pendingWithdrawals.length > 0 || recentWithdrawalUpdates.length > 0;
    };

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (!term.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        try {
            // Normalize the search term to handle cases like "BTC/USDT" or "btcusdt"
            const normalizedTerm = term.toUpperCase();
            const searchWords = normalizedTerm.split(/[\s\/\-]+/).filter(word => word);
            
            // Query both collections: coins and tokens
            const coinsRef = collection(db, 'coins');
            const tokensRef = collection(db, 'tokens');
            
            const [coinsSnapshot, tokensSnapshot] = await Promise.all([
                getDocs(query(coinsRef)),
                getDocs(query(tokensRef))
            ]);
            
            // Combine results from both collections
            const allTokens = [
                ...coinsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'coins' })),
                ...tokensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'tokens' }))
            ];
            
            // Filter results based on the search term
            const results = allTokens
                .filter(coin => {
                    const symbol = (coin.symbol || '').toUpperCase();
                    const name = (coin.name || '').toUpperCase();
                    const id = (coin.id || '').toUpperCase();
                    
                    // Check if any search word matches any field
                    return searchWords.some(word => 
                        symbol.includes(word) || 
                        name.includes(word) || 
                        id.includes(word)
                    );
                })
                .map(coin => ({
                    ...coin,
                    // Ensure logo/icon is available by checking multiple fields
                    icon: coin.icon || coin.logoUrl || coin.logo || 
                          `https://coinicons-api.vercel.app/api/icon/${coin.symbol?.toLowerCase()}`
                }));
            
            setSearchResults(results);
            setShowResults(results.length > 0);
        } catch (error) {
            console.error('Error searching:', error);
        }
    };

    const handleResultClick = (result) => {
        try {
            // Instead of navigating directly, we'll redirect to the market page
            // with search parameters to improve matching
            console.log('Search result clicked:', result);
            
            // Reset search UI
            setShowResults(false);
            setSearchTerm('');
            
            // Include both name and symbol to improve matching chances
            const searchQuery = result.symbol || result.name;
            
            // Navigate to market page with search filter
            navigate(`/market?search=${encodeURIComponent(searchQuery)}`);
        } catch (error) {
            console.error('Error in handleResultClick:', error);
            navigate('/market');
        }
    };

    const handleProfileClick = (e) => {
        console.log('Profile icon clicked, email verified:', isEmailVerified);
        if (!isEmailVerified) {
            e.preventDefault();
            alert('Please verify your email before accessing your profile.');
        } else {
            // Use window.location.href instead of navigate
            console.log('Navigating to user profile using window.location.href');
            window.location.href = '/user-profile';
        }
    };

    const renderUserAvatar = () => {
        if (userData?.photoURL) {
            return userData.photoURL;
        } else if (userData?.profilePic) {
            return userData.profilePic;
        } else {
            // Use first letter of email or username as avatar fallback
            return defaultAvatar;
        }
    };

    const toggleNotifications = (e) => {
        e.stopPropagation();
        setShowNotifications(!showNotifications);
        
        // Reset notification count when opening notifications
        if (!showNotifications && notificationCount > 0) {
            setNotificationCount(0);
        }
    };

    // Close notifications when clicking anywhere else
    const handleClickOutside = () => {
        if (showNotifications) {
            setShowNotifications(false);
        }
    };

    useEffect(() => {
        if (showNotifications) {
            document.addEventListener('click', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showNotifications]);

    // Add this function to ensure all image URLs are properly loaded
    const ensureValidImageUrl = (url) => {
        if (!url) return defaultAvatar;
        
        // Check if URL is already absolute
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // Check if it's a storage URL
        if (url.startsWith('gs://')) {
            // Convert to a public URL if needed
            return url.replace('gs://', 'https://storage.googleapis.com/');
        }
        
        return url;
    };

    // Update handleNavLinkClick function to use navigate instead of window.location
    const handleNavLinkClick = (url) => {
        navigate(url);
        setMobileMenuOpen(false);
    };

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <HeaderContainer>
            <HeaderWrapper>
                <MobileMenuToggle onClick={toggleMobileMenu}>
                    {mobileMenuOpen ? '✕' : '☰'}
                </MobileMenuToggle>
                
                <NavContainer>
                    <Navigation isOpen={mobileMenuOpen}>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/market')}
                            className={location.pathname === '/market' ? 'active' : ''}
                        >
                            Market
                        </NavLink>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/airdrop')}
                            className={location.pathname === '/airdrop' ? 'active' : ''}
                        >
                            Airdrop
                            <span style={{
                                backgroundColor: '#FF9100',
                                color: 'black',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                marginLeft: '5px',
                                fontWeight: 'bold'
                            }}>
                                NEW
                            </span>
                        </NavLink>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/mylist')}
                            className={location.pathname === '/mylist' ? 'active' : ''}
                        >
                            My List
                        </NavLink>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/deposit')}
                            className={location.pathname === '/deposit' ? 'active' : ''}
                        >
                            Deposit
                        </NavLink>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/withdraw')}
                            className={location.pathname === '/withdraw' ? 'active' : ''}
                        >
                            Withdraw
                            {hasWithdrawalNotifications() && (
                                <span style={{
                                    position: 'relative',
                                    top: '-8px',
                                    right: '-2px',
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: getWithdrawalNotificationStatus() === 'pending' ? '#F7931A' : 
                                                    getWithdrawalNotificationStatus() === 'approved' ? '#03A9F4' : 
                                                    getWithdrawalNotificationStatus() === 'rejected' ? '#F6465D' : 
                                                    '#0ECB81',
                                    animation: 'pulse 2s infinite'
                                }}></span>
                            )}
                        </NavLink>
                        <NavLink 
                            onClick={() => handleNavLinkClick('/competition')}
                            className={location.pathname === '/competition' ? 'active' : ''}
                        >
                            Competition
                        </NavLink>
                    </Navigation>
                </NavContainer>
                
                <LogoContainer>
                    <Link onClick={() => window.location.href = '/'} to="#">
                        <Logo src={logo} alt="Ripple Exchange" />
                        <LogoText>Ripple <span>Exchange</span></LogoText>
                    </Link>
                </LogoContainer>

                <UserControls>
                    <SearchContainer>
                        <SearchIcon>🔍</SearchIcon>
                        <SearchInput 
                            placeholder="Search pair (e.g. BTC/USDT)" 
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => {
                                if (searchResults.length > 0) setShowResults(true);
                            }}
                            onBlur={() => {
                                // Delayed hiding to allow for item clicks
                                setTimeout(() => setShowResults(false), 200);
                            }}
                        />
                        <SearchResults $visible={showResults}>
                            {searchResults.map(result => (
                                <SearchResultItem
                                    key={result.id}
                                    onMouseDown={() => handleResultClick(result)}
                                >
                                    <ResultIcon 
                                        src={ensureValidImageUrl(result.icon || result.logoUrl || result.logo)}
                                        alt={result.symbol}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://coinicons-api.vercel.app/api/icon/${result.symbol?.toLowerCase()}`;
                                        }}
                                    />
                                    <ResultName>
                                        {result.name} ({result.symbol})
                                    </ResultName>
                                </SearchResultItem>
                            ))}
                        </SearchResults>
                    </SearchContainer>

                    {user ? (
                        <>
                            {!isAuthPage && isAdmin && (
                                <AdminLink to="/admin">
                                    Admin Panel
                                </AdminLink>
                            )}
                            <IconButton 
                                title="Notifications" 
                                onClick={toggleNotifications}
                                style={{ position: 'relative' }}
                            >
                                🔔
                                {notificationCount > 0 && (
                                    <NotificationBadge>{notificationCount > 9 ? '9+' : notificationCount}</NotificationBadge>
                                )}
                            </IconButton>
                            {showNotifications && (
                                <Notifications
                                    show={showNotifications}
                                    onClose={() => setShowNotifications(false)}
                                />
                            )}
                            <UserAvatar onClick={handleProfileClick} role="button" aria-label="User Profile">
                                <AvatarImage 
                                    src={ensureValidImageUrl(userData?.photoURL || userData?.profilePic)}
                                    alt={userData?.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = defaultAvatar;
                                    }}
                                />
                            </UserAvatar>
                        </>
                    ) : (
                        !isAuthPage && (
                            <>
                                <LoginButton to="/login">Log In</LoginButton>
                                <SignUpButton to="/register">Sign Up</SignUpButton>
                            </>
                        )
                    )}
                </UserControls>
            </HeaderWrapper>

            {/* Mobile Navigation Overlay */}
            <MobileNavOverlay $isOpen={mobileMenuOpen} onClick={toggleMobileMenu}>
                <MobileNavContent onClick={(e) => e.stopPropagation()}>
                    <MobileNavHeader>
                        <Logo src={logo} alt="Ripple Exchange" />
                        <CloseButton onClick={toggleMobileMenu}>
                            ✕
                        </CloseButton>
                    </MobileNavHeader>
                    
                    <MobileNavLinks>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/market');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/market' ? 'active' : ''}
                        >
                            Market
                        </MobileNavLink>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/airdrop');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/airdrop' ? 'active' : ''}
                        >
                            Airdrop
                            <span style={{ 
                                backgroundColor: '#FF9100', 
                                color: 'black', 
                                borderRadius: '4px', 
                                padding: '2px 5px', 
                                fontSize: '10px', 
                                marginLeft: '5px', 
                                fontWeight: 'bold' 
                            }}>
                                NEW
                            </span>
                        </MobileNavLink>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/mylist');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/mylist' ? 'active' : ''}
                        >
                            My List
                        </MobileNavLink>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/deposit');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/deposit' ? 'active' : ''}
                        >
                            Deposit
                        </MobileNavLink>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/withdraw');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/withdraw' ? 'active' : ''}
                        >
                            Withdraw
                            {hasWithdrawalNotifications() && (
                                <span style={{
                                    position: 'relative',
                                    top: '-8px',
                                    right: '-2px',
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: getWithdrawalNotificationStatus() === 'pending' ? '#F7931A' : 
                                                    getWithdrawalNotificationStatus() === 'approved' ? '#03A9F4' : 
                                                    getWithdrawalNotificationStatus() === 'rejected' ? '#F6465D' : 
                                                    '#0ECB81',
                                    animation: 'pulse 2s infinite'
                                }}></span>
                            )}
                        </MobileNavLink>
                        <MobileNavLink
                            onClick={() => {
                                handleNavLinkClick('/competition');
                                toggleMobileMenu();
                            }}
                            className={location.pathname === '/competition' ? 'active' : ''}
                        >
                            Competition
                        </MobileNavLink>
                    </MobileNavLinks>
                    
                    {currentUser && (
                        <MobileUserSection>
                            <MobileUserInfo onClick={() => navigate('/user-profile')}>
                                <img src={userAvatar} alt="User" />
                                <div>
                                    <h4>{userData?.displayName || currentUser.displayName || 'User'}</h4>
                                    <p>{userData?.email || currentUser.email}</p>
                                </div>
                            </MobileUserInfo>
                            <MobileActionButton onClick={() => navigate('/user-profile')}>
                                👤 Profile
                            </MobileActionButton>
                            <MobileActionButton onClick={() => {
                                auth.signOut();
                                navigate('/');
                                toggleMobileMenu();
                            }}>
                                🚪 Sign Out
                            </MobileActionButton>
                        </MobileUserSection>
                    )}
                    
                    {!currentUser && (
                        <MobileAuthButtons>
                            <MobileAuthButton primary onClick={() => {
                                navigate('/login');
                                toggleMobileMenu();
                            }}>
                                Login
                            </MobileAuthButton>
                            <MobileAuthButton onClick={() => {
                                navigate('/register');
                                toggleMobileMenu();
                            }}>
                                Register
                            </MobileAuthButton>
                        </MobileAuthButtons>
                    )}
                </MobileNavContent>
            </MobileNavOverlay>
        </HeaderContainer>
    );
};

// Add styled components for mobile menu
const MobileNavOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1001;
    display: ${props => props.$isOpen ? 'block' : 'none'};
    backdrop-filter: blur(4px);
    transition: all 0.3s ease;
`;

const MobileNavContent = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 80%;
    max-width: 320px;
    height: 100%;
    background: #0b0b0f;
    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.3);
    padding: 20px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const MobileNavHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    
    &:hover {
        color: #F7931A;
    }
`;

const MobileNavLinks = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 30px;
`;

const MobileNavLink = styled.a`
    display: flex;
    align-items: center;
    padding: 12px 0;
    color: #fff;
    font-size: 16px;
    font-weight: 500;
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    
    i {
        margin-right: 12px;
        font-size: 16px;
        width: 20px;
        text-align: center;
        opacity: 0.7;
    }
    
    &:hover, &.active {
        color: #F7931A;
    }
    
    &.active i {
        opacity: 1;
    }
`;

const MobileUserSection = styled.div`
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MobileUserInfo = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    
    img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 12px;
        object-fit: cover;
    }
    
    div {
        flex: 1;
        
        h4 {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px;
        }
        
        p {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
        }
    }
`;

const MobileActionButton = styled.button`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    
    i {
        margin-right: 10px;
        font-size: 16px;
    }
    
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

const MobileAuthButtons = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MobileAuthButton = styled.button`
    padding: 14px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    
    ${props => props.primary ? `
        background: linear-gradient(90deg, #F7931A, #FF9900);
        color: #000;
        
        &:hover {
            background: linear-gradient(90deg, #FF9900, #FFA94D);
        }
    ` : `
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        
        &:hover {
            background: rgba(255, 255, 255, 0.15);
        }
    `}
`;

export default Header; 