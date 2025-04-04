import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Sale01 from '../components/sale/Sale01';
import { auth, db, googleProvider } from '../firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    sendEmailVerification,
    updateProfile,
    sendSignInLinkToEmail,
    signOut,
    deleteUser
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import PageTitle from '../components/pagetitle';
import OtpVerification from '../components/OtpVerification';
import {Link} from 'react-router-dom';
import { DEFAULT_COINS } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import { generateUserWallet } from '../services/walletService';
import { referralService } from '../services/referralService';
import styled from 'styled-components';
import VerificationScreen from '../components/VerificationScreen';
import axios from 'axios';

Register.propTypes = {
    
};

// Base API URL for server requests
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

function Register(props) {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('South Korea (+82)');
    const [countryCode, setCountryCode] = useState('+1');
    const [error, setError] = useState('');
    const [uidCode, setUidCode] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showOtpVerification, setShowOtpVerification] = useState(false);
    const [tempUserData, setTempUserData] = useState(null);
    const [verificationId, setVerificationId] = useState('');
    const [showMnemonic, setShowMnemonic] = useState(false);
    const [walletInfo, setWalletInfo] = useState(null);
    const [mnemonic, setMnemonic] = useState('');
    const [showMnemonicModal, setShowMnemonicModal] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [sentVerificationCode, setSentVerificationCode] = useState('');
    const [success, setSuccess] = useState('');
    const [isGoogleUser, setIsGoogleUser] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendError, setResendError] = useState('');
    const [resendSuccess, setResendSuccess] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    // Check for referral code in URL params when component mounts
    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const refCode = queryParams.get('ref');
        if (refCode) {
            setReferralCode(refCode);
        }
    }, [location]);

    const generateOTP = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const storeUserData = async (user, userData) => {
        try {
            // Get the referral code (either from input or URL)
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            const finalReferralCode = userData.referralCode || referralCode || urlRefCode;
            
            // Initialize user's balances
            const userWithBalances = {
                ...userData,
                uid: user.uid,
                balances: {
                    RIPPLEX: 0,
                    BTC: 0,
                    ETH: 0,
                    XRP: 0
                },
                referralStats: {
                    totalReferrals: 0,
                    activeReferrals: 0
                },
                joinedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                profileComplete: false
            };
            
            // Create a basic user document first (this ensures we have a document even if subsequent operations fail)
            try {
                await setDoc(doc(db, "users", user.uid), userWithBalances);
            } catch (createError) {
                throw createError;
            }
            
            // Try to create a wallet for the user
            try {
                // Generate new wallet for the user
                const newWallet = await generateUserWallet(user.uid);
                
                // If wallet generation was successful, update the user's wallet address
                if (newWallet) {
                    setWalletInfo(newWallet);
                }
            } catch (walletError) {
                // Continue even if wallet creation fails - we'll try again later
            }
            
            // Process referral if provided
            if (finalReferralCode) {
                try {
                    await referralService.registerReferral(finalReferralCode, user.uid);
                } catch (referralError) {
                    // Continue even if referral processing fails
                }
            }
            
            return true;
        } catch (err) {
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            setError('');
            
            // Validate form
            if (!email || !password || !confirmPassword || !nickname) {
                setError('All fields are required');
                return;
            }
            
            // Validate password length
            if (password.length < 8) {
                setError('Password must be at least 8 characters long');
                return;
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            
            // Get referral code from URL if present and none entered manually
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            const finalReferralCode = referralCode || urlRefCode;
            
            if (urlRefCode && !referralCode) {
                setReferralCode(urlRefCode);
            }
            
            // Generate verification code
            const verificationCode = generateOTP();
            setSentVerificationCode(verificationCode);
            
            // Send verification code via email
            const emailResponse = await axios.post(`${API_BASE_URL}/send-verification-code`, {
                email,
                code: verificationCode
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (emailResponse.data.success) {
                // Save email for later use
                setRegisteredEmail(email);
                setEmailSent(true);
                setSuccess('Verification code sent to your email');
                
                // Create user data object
                const userData = {
                    email,
                    nickname,
                    phone: '',
                    country,
                    authProvider: 'email',
                    emailVerified: false,
                    referralCode: finalReferralCode
                };
                
                // Store user data temporarily
                setTempUserData(userData);
                
                // Show OTP verification
                setShowOtpVerification(true);
            } else {
                throw new Error(emailResponse.data.error || 'Failed to send verification code');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmMnemonic = () => {
        setShowMnemonic(false);
        setShowMnemonicModal(false);
        
        // Continue to the verification screen or user profile
        if (showOtpVerification) {
            // If we're already showing OTP verification, stay there
            return;
        } else if (auth.currentUser?.emailVerified || isGoogleUser) {
            // Google users or already verified emails can go straight to profile
            navigate('/user-profile');
        } else {
            // Show OTP verification for email users
            setShowOtpVerification(true);
        }
    };

    const handleEmailSignup = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            setLoading(true);
            setError('');

            // First create the user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update the user's profile
            await updateProfile(user, {
                displayName: nickname
            });

            // Generate a verification code and send it
            await handleSendVerificationCode();
            
            // Extract referral code from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            
            // Use URL referral code if available and none entered manually
            if (urlRefCode && !referralCode) {
                setReferralCode(urlRefCode);
            }
            
            // Prepare user data with referral info
            const userData = {
                email,
                nickname,
                phone: `${countryCode}${phone}`,
                country,
                referralCode: referralCode || urlRefCode,
                authProvider: 'email',
                emailVerified: false
            };

            // Store user data in Firestore
            await storeUserData(user, userData);
            
            // Store temp data for verification
            setTempUserData(userData);

            // Show OTP verification screen
            setShowOtpVerification(true);
            setRegisteredEmail(email);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (otpInput) => {
        try {
            setLoading(true);
            setError('');

            // First check if the input matches our sent code - simple verification without server
            if (otpInput === sentVerificationCode) {
                // OTP matches, check if there's an existing account
                if (auth.currentUser) {
                    // Update the verified status in Firestore
                    try {
                        const userRef = doc(db, 'users', auth.currentUser.uid);
                        await updateDoc(userRef, {
                            emailVerified: true
                        });
                    } catch (dbError) {
                        // Continue with verification even if database update fails
                    }
                } else if (tempUserData) {
                    // No auth user but we have the data to create one
                    try {
                        // Create a Firebase Auth user
                        const userCredential = await createUserWithEmailAndPassword(auth, registeredEmail, password);
                        const newUser = userCredential.user;
                        
                        // Update profile
                        await updateProfile(newUser, {
                            displayName: tempUserData.nickname || 'User'
                        });
                        
                        // Create Firestore document
                        await storeUserData(newUser, {
                            ...tempUserData,
                            emailVerified: true
                        });
                    } catch (err) {
                        // Continue with verification even if user creation fails
                    }
                }
                
                // Show success and redirect
                setSuccess('Account verified successfully! You can now log in.');
                
                // Sign out the user
                if (auth.currentUser) {
                    await signOut(auth);
                }
                
                // Redirect to login
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
                
                return;
            }
            
            // If direct verification failed, try verifying through API
            try {
                // Build verification request
                const verificationData = {
                    email: registeredEmail,
                    otp: otpInput
                };
                
                // Add user ID if available
                if (auth.currentUser) {
                    verificationData.uid = auth.currentUser.uid;
                }
                
                // Send verification request
                const response = await axios.post(`${API_BASE_URL}/verify-otp`, verificationData, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data.success) {
                    // Update user status if we have a user
                    if (auth.currentUser) {
                        try {
                            const userRef = doc(db, 'users', auth.currentUser.uid);
                            await updateDoc(userRef, {
                                emailVerified: true
                            });
                        } catch (dbError) {
                            // Continue with verification even if database update fails
                        }
                    }
                    
                    setSuccess('Account verified successfully! You can now log in.');
                    
                    // Sign out
                    if (auth.currentUser) {
                        await signOut(auth);
                    }
                    
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    throw new Error(response.data.error || 'Invalid verification code. Please try again.');
                }
            } catch (apiError) {
                // Check one last time against sentVerificationCode
                if (otpInput === sentVerificationCode) {
                    setSuccess('Account verified successfully! You can now log in.');
                    
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    throw new Error(`Error verifying account: ${apiError.response?.data?.error || apiError.message}`);
                }
            }
        } catch (err) {
            setError(err.message || 'Error verifying account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Check if we have the email
            if (!registeredEmail) {
                setError('No email found for resending verification code');
                return;
            }
            
            const email = registeredEmail;
            
            // Generate a new code
            const newOtp = generateOTP();
            setSentVerificationCode(newOtp);
            
            // Try to update the code in Firebase first
            if (auth.currentUser) {
                try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await updateDoc(userRef, { otp: newOtp });
                } catch (dbError) {
                    // Continue with resend attempt even if database update fails
                }
            }
            
            // Send verification email via server API
            const response = await axios.post(`${API_BASE_URL}/send-verification-code`, { 
                email,
                code: newOtp
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                setSuccess('New verification code sent. Please check your email.');
            } else {
                setError(response.data.error || 'Failed to send new verification code. Please try again.');
            }
        } catch (err) {
            setError('Failed to resend verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setLoading(true);
            setError('');
            
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // For Google sign-ups, we skip OTP verification since Google already verifies emails
            // Prepare user data for Google sign-up
            const userData = {
                email: user.email,
                displayName: user.displayName,
                nickname: user.displayName,
                phone: user.phoneNumber || '',
                country: country,
                authProvider: 'google',
                emailVerified: true // Mark as verified since Google verifies emails
            };

            // Extract referral code from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            
            // Use URL referral code if available and none entered manually
            if (urlRefCode && !referralCode) {
                setReferralCode(urlRefCode);
            }

            // Store user data and wait for completion
            await storeUserData(user, userData);

            // Set success message
            setSuccess('Google sign-up successful! Redirecting to your profile...');
            
            // Navigate after a short delay
            setTimeout(() => {
                navigate('/user-profile');
            }, 1500);

            setIsGoogleUser(true);
        } catch (err) {
            setError(err.message || 'Google sign-up failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSignup = async (e) => {
        e.preventDefault();
        setError('Phone authentication requires additional Firebase setup.');
    };

    const handleSendVerificationCode = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Generate a code
            const verificationCode = generateOTP();
            setSentVerificationCode(verificationCode);
            
            const response = await axios.post(`${API_BASE_URL}/send-verification-code`, { 
                email,
                code: verificationCode
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                setVerificationSent(true);
                setRegisteredEmail(email);
                setSuccess('Verification code sent. Please check your email.');
            } else {
                setError(response.data.error || 'Failed to send verification code. Please try again.');
            }
        } catch (err) {
            setError('Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (showMnemonic && walletInfo) {
        return (
            <RegisterSection>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <RegisterCard>
                                <RegisterHeader>
                                    <h3>🔐 Save Your Recovery Phrase</h3>
                                    <p>This is your wallet's recovery phrase. Write it down and store it in a safe place.
                                    You will need this to recover your wallet if you lose access.</p>
                                </RegisterHeader>
                                
                                <MnemonicBox>
                                    {walletInfo.mnemonic}
                                </MnemonicBox>
                                
                                <WarningText>
                                    ⚠️ Never share this phrase with anyone! We will never ask for it.
                                </WarningText>
                                
                                <RegisterButton onClick={handleConfirmMnemonic}>
                                    I've Saved My Recovery Phrase
                                </RegisterButton>
                            </RegisterCard>
                        </div>
                    </div>
                </div>
            </RegisterSection>
        );
    }

    // Show verification screen if registration is complete
    if (showVerification) {
        return <VerificationScreen email={registeredEmail} />;
    }

    return (
        <div>
            <PageTitle heading='Register' title='Register' />
            <RegisterSection>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            {showOtpVerification ? (
                                <RegisterCard>
                                    <OtpVerification
                                        email={registeredEmail || email}
                                        onVerify={handleOtpVerify}
                                        onResendOtp={handleResendOtp}
                                        error={error}
                                        success={success}
                                    />
                                </RegisterCard>
                            ) : (
                                <RegisterCard>
                                    <RegisterHeader>
                                        <h3>Create Your Account</h3>
                                        <p>Join Ripple Exchange and start trading today</p>
                                    </RegisterHeader>
                                    
                                    <StyledTabs>
                                        <TabList>
                                            <Tab>Email</Tab>
                                            <Tab>Mobile</Tab>
                                        </TabList>

                                        <TabPanel>
                                            <RegisterForm onSubmit={handleSubmit}>
                                                {error && <ErrorMessage>{error}</ErrorMessage>}
                                                {success && <SuccessMessage>{success}</SuccessMessage>}
                                                
                                                <FormGroup>
                                                    <FormLabel htmlFor="email">Email Address</FormLabel>
                                                    <FormInput
                                                        type="email"
                                                        id="email"
                                                        placeholder="Enter your email"
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        required
                                                    />
                                                </FormGroup>
                                                
                                                <PasswordGroup>
                                                    <FormLabel>Password <HelperText>(8+ characters, include numbers & special characters)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="password"
                                                        placeholder="Create a password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        className="mb-2"
                                                    />
                                                    <FormInput
                                                        type="password"
                                                        placeholder="Confirm your password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                    />
                                                </PasswordGroup>

                                                <FormGroup>
                                                    <FormLabel>Nickname <HelperText>(No special characters)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="Choose a nickname"
                                                        value={nickname}
                                                        onChange={(e) => setNickname(e.target.value)}
                                                        required
                                                    />
                                                </FormGroup>
                                                
                                                <FormGroup>
                                                    <FormLabel>Country</FormLabel>
                                                    <FormSelect
                                                        value={country}
                                                        onChange={(e) => setCountry(e.target.value)}
                                                    >
                                                        <option value="Afghanistan">Afghanistan</option>
                <option value="Åland Islands">Åland Islands</option>
                <option value="Albania">Albania</option>
                <option value="Algeria">Algeria</option>
                <option value="American Samoa">American Samoa</option>
                <option value="Andorra">Andorra</option>
                <option value="Angola">Angola</option>
                <option value="Anguilla">Anguilla</option>
                <option value="Antarctica">Antarctica</option>
                <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                <option value="Argentina">Argentina</option>
                <option value="Armenia">Armenia</option>
                <option value="Aruba">Aruba</option>
                <option value="Australia">Australia</option>
                <option value="Austria">Austria</option>
                <option value="Azerbaijan">Azerbaijan</option>
                <option value="Bahamas">Bahamas</option>
                <option value="Bahrain">Bahrain</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Barbados">Barbados</option>
                <option value="Belarus">Belarus</option>
                <option value="Belgium">Belgium</option>
                <option value="Belize">Belize</option>
                <option value="Benin">Benin</option>
                <option value="Bermuda">Bermuda</option>
                <option value="Bhutan">Bhutan</option>
                <option value="Bolivia">Bolivia</option>
                <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                <option value="Botswana">Botswana</option>
                <option value="Bouvet Island">Bouvet Island</option>
                <option value="Brazil">Brazil</option>
                <option value="British Indian Ocean Territory">British Indian Ocean Territory</option>
                <option value="Brunei Darussalam">Brunei Darussalam</option>
                <option value="Bulgaria">Bulgaria</option>
                <option value="Burkina Faso">Burkina Faso</option>
                <option value="Burundi">Burundi</option>
                <option value="Cambodia">Cambodia</option>
                <option value="Cameroon">Cameroon</option>
                <option value="Canada">Canada</option>
                <option value="Cape Verde">Cape Verde</option>
                <option value="Cayman Islands">Cayman Islands</option>
                <option value="Central African Republic">Central African Republic</option>
                <option value="Chad">Chad</option>
                <option value="Chile">Chile</option>
                <option value="China">China</option>
                <option value="Christmas Island">Christmas Island</option>
                <option value="Cocos (Keeling) Islands">Cocos (Keeling) Islands</option>
                <option value="Colombia">Colombia</option>
                <option value="Comoros">Comoros</option>
                <option value="Congo">Congo</option>
                <option value="Congo, The Democratic Republic of The">Congo, The Democratic Republic of The</option>
                <option value="Cook Islands">Cook Islands</option>
                <option value="Costa Rica">Costa Rica</option>
                <option value="Cote D'ivoire">Cote D'ivoire</option>
                <option value="Croatia">Croatia</option>
                <option value="Cuba">Cuba</option>
                <option value="Cyprus">Cyprus</option>
                <option value="Czech Republic">Czech Republic</option>
                <option value="Denmark">Denmark</option>
                <option value="Djibouti">Djibouti</option>
                <option value="Dominica">Dominica</option>
                <option value="Dominican Republic">Dominican Republic</option>
                <option value="Ecuador">Ecuador</option>
                <option value="Egypt">Egypt</option>
                <option value="El Salvador">El Salvador</option>
                <option value="Equatorial Guinea">Equatorial Guinea</option>
                <option value="Eritrea">Eritrea</option>
                <option value="Estonia">Estonia</option>
                <option value="Ethiopia">Ethiopia</option>
                <option value="Falkland Islands (Malvinas)">Falkland Islands (Malvinas)</option>
                <option value="Faroe Islands">Faroe Islands</option>
                <option value="Fiji">Fiji</option>
                <option value="Finland">Finland</option>
                <option value="France">France</option>
                <option value="French Guiana">French Guiana</option>
                <option value="French Polynesia">French Polynesia</option>
                <option value="French Southern Territories">French Southern Territories</option>
                <option value="Gabon">Gabon</option>
                <option value="Gambia">Gambia</option>
                <option value="Georgia">Georgia</option>
                <option value="Germany">Germany</option>
                <option value="Ghana">Ghana</option>
                <option value="Gibraltar">Gibraltar</option>
                <option value="Greece">Greece</option>
                <option value="Greenland">Greenland</option>
                <option value="Grenada">Grenada</option>
                <option value="Guadeloupe">Guadeloupe</option>
                <option value="Guam">Guam</option>
                <option value="Guatemala">Guatemala</option>
                <option value="Guernsey">Guernsey</option>
                <option value="Guinea">Guinea</option>
                <option value="Guinea-bissau">Guinea-bissau</option>
                <option value="Guyana">Guyana</option>
                <option value="Haiti">Haiti</option>
                <option value="Heard Island and Mcdonald Islands">Heard Island and Mcdonald Islands</option>
                <option value="Holy See (Vatican City State)">Holy See (Vatican City State)</option>
                <option value="Honduras">Honduras</option>
                <option value="Hong Kong">Hong Kong</option>
                <option value="Hungary">Hungary</option>
                <option value="Iceland">Iceland</option>
                <option value="India">India</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Iran, Islamic Republic of">Iran, Islamic Republic of</option>
                <option value="Iraq">Iraq</option>
                <option value="Ireland">Ireland</option>
                <option value="Isle of Man">Isle of Man</option>
                <option value="Italy">Italy</option>
                <option value="Jamaica">Jamaica</option>
                <option value="Japan">Japan</option>
                <option value="Jersey">Jersey</option>
                <option value="Jordan">Jordan</option>
                <option value="Kazakhstan">Kazakhstan</option>
                <option value="Kenya">Kenya</option>
                <option value="Kiribati">Kiribati</option>
                <option value="Korea, Democratic People's Republic of">Korea, Democratic People's Republic of</option>
                <option value="Korea, Republic of">Korea, Republic of</option>
                <option value="Kuwait">Kuwait</option>
                <option value="Kyrgyzstan">Kyrgyzstan</option>
                <option value="Lao People's Democratic Republic">Lao People's Democratic Republic</option>
                <option value="Latvia">Latvia</option>
                <option value="Lebanon">Lebanon</option>
                <option value="Lesotho">Lesotho</option>
                <option value="Liberia">Liberia</option>
                <option value="Libyan Arab Jamahiriya">Libyan Arab Jamahiriya</option>
                <option value="Liechtenstein">Liechtenstein</option>
                <option value="Lithuania">Lithuania</option>
                <option value="Luxembourg">Luxembourg</option>
                <option value="Macao">Macao</option>
                <option value="Macedonia, The Former Yugoslav Republic of">Macedonia, The Former Yugoslav Republic of</option>
                <option value="Madagascar">Madagascar</option>
                <option value="Malawi">Malawi</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Maldives">Maldives</option>
                <option value="Mali">Mali</option>
                <option value="Malta">Malta</option>
                <option value="Marshall Islands">Marshall Islands</option>
                <option value="Martinique">Martinique</option>
                <option value="Mauritania">Mauritania</option>
                <option value="Mauritius">Mauritius</option>
                <option value="Mayotte">Mayotte</option>
                <option value="Mexico">Mexico</option>
                <option value="Micronesia, Federated States of">Micronesia, Federated States of</option>
                <option value="Moldova, Republic of">Moldova, Republic of</option>
                <option value="Monaco">Monaco</option>
                <option value="Mongolia">Mongolia</option>
                <option value="Montenegro">Montenegro</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Morocco">Morocco</option>
                <option value="Mozambique">Mozambique</option>
                <option value="Myanmar">Myanmar</option>
                <option value="Namibia">Namibia</option>
                <option value="Nauru">Nauru</option>
                <option value="Nepal">Nepal</option>
                <option value="Netherlands">Netherlands</option>
                <option value="Netherlands Antilles">Netherlands Antilles</option>
                <option value="New Caledonia">New Caledonia</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Nicaragua">Nicaragua</option>
                <option value="Niger">Niger</option>
                <option value="Nigeria">Nigeria</option>
                <option value="Niue">Niue</option>
                <option value="Norfolk Island">Norfolk Island</option>
                <option value="Northern Mariana Islands">Northern Mariana Islands</option>
                <option value="Norway">Norway</option>
                <option value="Oman">Oman</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Palau">Palau</option>
                <option value="Palestinian Territory, Occupied">Palestinian Territory, Occupied</option>
                <option value="Panama">Panama</option>
                <option value="Papua New Guinea">Papua New Guinea</option>
                <option value="Paraguay">Paraguay</option>
                <option value="Peru">Peru</option>
                <option value="Philippines">Philippines</option>
                <option value="Pitcairn">Pitcairn</option>
                <option value="Poland">Poland</option>
                <option value="Portugal">Portugal</option>
                <option value="Puerto Rico">Puerto Rico</option>
                <option value="Qatar">Qatar</option>
                <option value="Reunion">Reunion</option>
                <option value="Romania">Romania</option>
                <option value="Russian Federation">Russian Federation</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Saint Helena">Saint Helena</option>
                <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                <option value="Saint Lucia">Saint Lucia</option>
                <option value="Saint Pierre and Miquelon">Saint Pierre and Miquelon</option>
                <option value="Saint Vincent and The Grenadines">Saint Vincent and The Grenadines</option>
                <option value="Samoa">Samoa</option>
                <option value="San Marino">San Marino</option>
                <option value="Sao Tome and Principe">Sao Tome and Principe</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Senegal">Senegal</option>
                <option value="Serbia">Serbia</option>
                <option value="Seychelles">Seychelles</option>
                <option value="Sierra Leone">Sierra Leone</option>
                <option value="Singapore">Singapore</option>
                <option value="Slovakia">Slovakia</option>
                <option value="Slovenia">Slovenia</option>
                <option value="Solomon Islands">Solomon Islands</option>
                <option value="Somalia">Somalia</option>
                <option value="South Africa">South Africa</option>
                <option value="South Georgia and The South Sandwich Islands">South Georgia and The South Sandwich Islands</option>
                <option value="Spain">Spain</option>
                <option value="Sri Lanka">Sri Lanka</option>
                <option value="Sudan">Sudan</option>
                <option value="Suriname">Suriname</option>
                <option value="Svalbard and Jan Mayen">Svalbard and Jan Mayen</option>
                <option value="Swaziland">Swaziland</option>
                <option value="Sweden">Sweden</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Syrian Arab Republic">Syrian Arab Republic</option>
                <option value="Taiwan">Taiwan</option>
                <option value="Tajikistan">Tajikistan</option>
                <option value="Tanzania, United Republic of">Tanzania, United Republic of</option>
                <option value="Thailand">Thailand</option>
                <option value="Timor-leste">Timor-leste</option>
                <option value="Togo">Togo</option>
                <option value="Tokelau">Tokelau</option>
                <option value="Tonga">Tonga</option>
                <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                <option value="Tunisia">Tunisia</option>
                <option value="Turkey">Turkey</option>
                <option value="Turkmenistan">Turkmenistan</option>
                <option value="Turks and Caicos Islands">Turks and Caicos Islands</option>
                <option value="Tuvalu">Tuvalu</option>
                <option value="Uganda">Uganda</option>
                <option value="Ukraine">Ukraine</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="United States Minor Outlying Islands">United States Minor Outlying Islands</option>
                <option value="Uruguay">Uruguay</option>
                <option value="Uzbekistan">Uzbekistan</option>
                <option value="Vanuatu">Vanuatu</option>
                <option value="Venezuela">Venezuela</option>
                <option value="Viet Nam">Viet Nam</option>
                <option value="Virgin Islands, British">Virgin Islands, British</option>
                <option value="Virgin Islands, U.S.">Virgin Islands, U.S.</option>
                <option value="Wallis and Futuna">Wallis and Futuna</option>
                <option value="Western Sahara">Western Sahara</option>
                <option value="Yemen">Yemen</option>
                <option value="Zambia">Zambia</option>
                <option value="Zimbabwe">Zimbabwe</option>
                                                    </FormSelect>
                                                </FormGroup>
                                                
                                                <FormGroup>
                                                    <FormLabel>Phone Number <HelperText>(Numbers only)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="e.g., 5551234567 (no dashes or spaces)"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        required
                                                    />
                                                </FormGroup>

                                                <FormGroup>
                                                    <FormLabel>Referral Code <HelperText>(Optional)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="Enter referral code if you have one"
                                                        value={referralCode}
                                                        onChange={(e) => setReferralCode(e.target.value)}
                                                    />
                                                </FormGroup>
                                                
                                                <RegisterButton 
                                                    type="submit" 
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Creating Account...' : 'Create Account'}
                                                </RegisterButton>
                                                
                                                <Divider>
                                                    <span>or continue with</span>
                                                </Divider>
                                                
                                                <GoogleButton 
                                                    type="button" 
                                                    onClick={handleGoogleSignup} 
                                                    disabled={loading}
                                                >
                                                    <img 
                                                        src="https://www.google.com/favicon.ico" 
                                                        alt="Google" 
                                                    />
                                                    {loading ? 'Processing...' : 'Google'}
                                                </GoogleButton>
                                                
                                                <LoginPrompt>
                                                    <span>Already have an account?</span>
                                                    <Link to="/login">Login</Link>
                                                </LoginPrompt>
                                            </RegisterForm>
                                        </TabPanel>

                                        <TabPanel>
                                            <RegisterForm onSubmit={handlePhoneSignup}>
                                                <FormGroup>
                                                    <FormLabel>Mobile Phone</FormLabel>
                                                    <PhoneInputGroup>
                                                        <CountrySelect
                                                            value={countryCode}
                                                            onChange={(e) => setCountryCode(e.target.value)}
                                                        >
                                                            <option value="+1">+1</option>
                                                            <option value="+44">+44</option>
                                                            <option value="+61">+61</option>
                                                            <option value="+81">+81</option>
                                                            <option value="+82">+82</option>
                                                            <option value="+86">+86</option>
                                                            <option value="+91">+91</option>
                                                        </CountrySelect>
                                                        <PhoneInput
                                                            type="text"
                                                            placeholder="Your phone number"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                        />
                                                    </PhoneInputGroup>
                                                </FormGroup>
                                                
                                                <PasswordGroup>
                                                    <FormLabel>Password <HelperText>(8+ characters, include numbers & special characters)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="password"
                                                        placeholder="Create a password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                        className="mb-2"
                                                    />
                                                    <FormInput
                                                        type="password"
                                                        placeholder="Confirm your password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        required
                                                    />
                                                </PasswordGroup>

                                                <FormGroup>
                                                    <FormLabel>Nickname <HelperText>(No special characters)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="Choose a nickname"
                                                        value={nickname}
                                                        onChange={(e) => setNickname(e.target.value)}
                                                        required
                                                    />
                                                </FormGroup>
                                                
                                                <FormGroup>
                                                    <FormLabel>Country</FormLabel>
                                                    <FormSelect
                                                        value={country}
                                                        onChange={(e) => setCountry(e.target.value)}
                                                    >
                                                        <option value="United States">United States</option>
                                                        <option value="United Kingdom">United Kingdom</option>
                                                        <option value="Canada">Canada</option>
                                                        <option value="Australia">Australia</option>
                                                        <option value="South Korea">South Korea</option>
                                                    </FormSelect>
                                                </FormGroup>

                                                <FormGroup>
                                                    <FormLabel>Referral Code <HelperText>(Optional)</HelperText></FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="Enter referral code if you have one"
                                                        value={referralCode}
                                                        onChange={(e) => setReferralCode(e.target.value)}
                                                    />
                                                </FormGroup>

                                                <FormGroup>
                                                    <FormLabel>UID Code</FormLabel>
                                                    <FormInput
                                                        type="text"
                                                        placeholder="Enter your invitation code"
                                                        value={uidCode}
                                                        onChange={(e) => setUidCode(e.target.value)}
                                                    />
                                                </FormGroup>

                                                {error && <ErrorMessage>{error}</ErrorMessage>}

                                                <RegisterButton type="submit" disabled={loading}>
                                                    {loading ? 'Processing...' : 'Create Account'}
                                                </RegisterButton>
                                                
                                                <LoginPrompt>
                                                    <span>Already have an account?</span>
                                                    <Link to="/login">Login</Link>
                                                </LoginPrompt>
                                            </RegisterForm>
                                        </TabPanel>
                                    </StyledTabs>
                                </RegisterCard>
                            )}
                        </div>
                    </div>
                </div>
            </RegisterSection>
            <Sale01 />
        </div>
    );
}

const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f0f0;
`;

const Card = styled.div`
    background-color: #fff;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
`;

const Title = styled.h2`
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 20px;
`;

const Description = styled.p`
    font-size: 16px;
    margin-bottom: 20px;
`;

const MnemonicBox = styled.div`
    background: rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    font-family: 'Roboto Mono', monospace;
    color: #00ff9d;
    font-size: 16px;
    word-spacing: 8px;
    line-height: 1.6;
    text-align: center;
`;

const WarningText = styled.p`
    color: #ffc107;
    text-align: center;
    margin: 20px 0;
    font-size: 14px;
`;

const Button = styled.button`
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    width: 100%;
    margin-top: 20px;

    &:hover {
        background-color: #0056b3;
    }
`;

const ErrorAlert = styled.div`
    background-color: #ffcccc;
    border: 1px solid #ff0000;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 20px;
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
`;

const FormGroup = styled.div`
    margin-bottom: 20px;
`;

const Label = styled.label`
    font-weight: 600;
    margin-bottom: 5px;
`;

const Input = styled.input`
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
`;

const RegisterSection = styled.section`
    padding: 60px 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    min-height: 80vh;
`;

const RegisterCard = styled.div`
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    padding: 30px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 30px;
`;

const RegisterHeader = styled.div`
    text-align: center;
    margin-bottom: 30px;
    
    h3 {
        color: #fff;
        font-weight: 700;
        margin-bottom: 10px;
        font-size: 28px;
    }
    
    p {
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        max-width: 80%;
        margin: 0 auto;
    }
`;

const StyledTabs = styled(Tabs)`
    .react-tabs__tab-list {
        border-bottom: none;
        display: flex;
        margin-bottom: 25px;
    }
    
    .react-tabs__tab {
        color: rgba(255, 255, 255, 0.6);
        padding: 12px 20px;
        border: none;
        font-size: 16px;
        font-weight: 500;
        background: transparent;
        margin-right: 10px;
        border-radius: 8px;
        transition: all 0.3s ease;
        
        &:hover {
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.05);
        }
    }
    
    .react-tabs__tab--selected {
        color: #fff;
        background: rgba(79, 70, 229, 0.2);
        border-color: transparent;
        
        &:after {
            display: none;
        }
    }
`;

const RegisterForm = styled.form`
    padding: 10px 0;
`;

const FormLabel = styled.label`
    display: block;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    font-size: 14px;
`;

const FormInput = styled.input`
    width: 100%;
    padding: 15px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 16px;
    transition: all 0.3s ease;
    
    &:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
    }
    
    &::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }
    
    &.mb-2 {
        margin-bottom: 10px;
    }
`;

const PasswordGroup = styled(FormGroup)`
    margin-bottom: 20px;
    
    input:first-of-type {
        margin-bottom: 10px;
        border-radius: 8px;
    }
    
    input:last-of-type {
        border-radius: 8px;
    }
`;

const HelperText = styled.span`
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    font-weight: 400;
    margin-left: 6px;
`;

const FormSelect = styled.select`
    width: 100%;
    padding: 15px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 16px;
    transition: all 0.3s ease;
    
    &:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
    }
    
    option {
        background: #1e293b;
        color: #fff;
    }
`;

const PhoneInputGroup = styled.div`
    display: flex;
`;

const CountrySelect = styled.select`
    padding: 15px;
    border-radius: 8px 0 0 8px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    border-right: none;
    min-width: 80px;
    
    &:focus {
        outline: none;
        border-color: #4f46e5;
    }
    
    option {
        background: #1e293b;
        color: #fff;
    }
`;

const PhoneInput = styled.input`
    flex: 1;
    padding: 15px;
    border-radius: 0 8px 8px 0;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    
    &:focus {
        outline: none;
        border-color: #4f46e5;
    }
    
    &::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }
`;

const RegisterButton = styled.button`
    width: 100%;
    padding: 15px;
    background: linear-gradient(to right, #4f46e5, #7c3aed);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        background: linear-gradient(to right, #4338ca, #6d28d9);
        transform: translateY(-2px);
    }
    
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
    }
`;

const Divider = styled.div`
    position: relative;
    text-align: center;
    margin: 25px 0;
    
    &:before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
    }
    
    span {
        position: relative;
        background: #1e293b;
        padding: 0 15px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
    }
`;

const GoogleButton = styled.button`
    width: 100%;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    
    img {
        width: 24px;
        height: 24px;
        margin-right: 10px;
    }
    
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const LoginPrompt = styled.div`
    margin-top: 25px;
    text-align: center;
    font-size: 15px;
    
    span {
        color: rgba(255, 255, 255, 0.6);
        margin-right: 5px;
    }
    
    a {
        color: #4f46e5;
        text-decoration: none;
        font-weight: 500;
        
        &:hover {
            text-decoration: underline;
        }
    }
`;

const ErrorMessage = styled.div`
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    padding: 12px 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
`;

const SuccessMessage = styled.div`
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    padding: 12px 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
`;

export default Register;