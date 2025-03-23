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
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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

    // Check for referral code in URL params when component mounts
    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const refCode = queryParams.get('ref');
        if (refCode) {
            setReferralCode(refCode);
            console.log('Referral code found in URL:', refCode);
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
            
            if (finalReferralCode) {
                console.log("Processing referral code during registration:", finalReferralCode);
            }
            
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
                console.log("User document created successfully");
            } catch (createError) {
                console.error("Error creating user document:", createError);
                throw createError;
            }
            
            // Try to create a wallet for the user
            try {
                // Generate new wallet for the user
                const newWallet = await generateUserWallet(user.uid);
                
                // If wallet generation was successful, update the user's wallet address
                if (newWallet) {
                    console.log("Wallet created successfully:", newWallet.address);
                    setWalletInfo(newWallet);
                }
            } catch (walletError) {
                console.error("Error creating wallet:", walletError);
                // Continue even if wallet creation fails - we'll try again later
            }
            
            // Process referral if provided
            if (finalReferralCode) {
                try {
                    const referralResult = await referralService.registerReferral(finalReferralCode, user.uid);
                    if (referralResult) {
                        console.log("Referral processed successfully");
                    } else {
                        console.warn("Referral processing returned false");
                    }
                } catch (referralError) {
                    console.error("Error processing referral:", referralError);
                    // Continue even if referral processing fails
                }
            }
            
            return true;
        } catch (err) {
            console.error("Error in storeUserData:", err);
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
                console.log("Using referral code from URL:", urlRefCode);
                setReferralCode(urlRefCode);
            }
            
            // Generate verification code
            const verificationCode = generateOTP();
            setSentVerificationCode(verificationCode);
            
            try {
                // Send verification code via email
                const emailResponse = await axios.post('/send-verification-code', {
                    email,
                    verificationCode
                });
                
                if (emailResponse.data.success) {
                    // Save email and password for later use
                    setRegisteredEmail(email);
                    setRegisteredPassword(password);
                    
                    // Create user data object
                    const userData = {
                        email,
                        nickname,
                        phone: '',
                        country,
                        authProvider: 'email',
                        emailVerified: false,
                        referralCode: finalReferralCode // Use the final referral code
                    };
                    
                    // Store user data temporarily
                    setTempUserData(userData);
                    
                    // Show OTP verification
                    setShowOtpVerification(true);
                    setSuccess('Verification code sent to your email');
                } else {
                    throw new Error(emailResponse.data.error || 'Failed to send verification code');
                }
            } catch (apiError) {
                console.error('Error during email sending:', apiError);
                throw new Error(`Error during email sending: ${apiError.response?.data?.error || apiError.message}`);
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
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

            // Import email service dynamically
            const { generateVerificationCode, sendRegistrationVerificationEmail } = await import('../utils/emailService');
            
            // Generate a 6-digit code
            const otp = generateVerificationCode();
            setSentVerificationCode(otp);
            
            // Send the registration verification code via email
            console.log('Sending verification email...');
            let emailSent = false;

            try {
                const emailResult = await sendRegistrationVerificationEmail(email, otp);
                
                if (emailResult.success) {
                    console.log('Verification email sent successfully');
                    emailSent = true;
                } else {
                    console.error('Email service reported an error:', emailResult.error);
                    // Continue with registration even if email fails
                }
            } catch (emailError) {
                console.error('Error during email sending:', emailError);
                // Continue with registration even if email fails
            }

            // Extract referral code from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            
            // Use URL referral code if available and none entered manually
            if (urlRefCode && !referralCode) {
                console.log("Using referral code from URL:", urlRefCode);
                setReferralCode(urlRefCode);
            }
            
            // Prepare user data with referral info
            const userData = {
                email,
                nickname,
                phone: `${countryCode}${phone}`,
                country,
                uidCode,
                referralCode: referralCode || urlRefCode,
                otp,
                authProvider: 'email',
                emailSent: emailSent
            };

            // Store user data in Firestore and wait for it to complete
            await storeUserData(user, userData);
            
            // Store temp data for verification
            setTempUserData(userData);

            // Show OTP verification screen
            setShowOtpVerification(true);
            setRegisteredEmail(email);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpVerify = async (otpInput) => {
        try {
            setLoading(true);
            setError('');

            // We don't have the OTP on the frontend for security
            // We'll verify it directly with Firebase's auth
            
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No user found. Please try again.');
            }

            // Make an API call to verify the OTP with the server
            try {
                const response = await axios.post('/verify-otp', {
                    email: registeredEmail,
                    otp: otpInput,
                    uid: user.uid
                });
                
                if (response.data.success) {
                    // Try to update user document to mark as verified
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            emailVerified: true
                        }).catch(updateErr => {
                            console.warn("Couldn't update emailVerified in database:", updateErr);
                            // Continue anyway - server already verified it
                        });
                    } catch (dbError) {
                        console.warn("Database update failed:", dbError);
                        // Continue with verification even if DB update fails
                    }

                    setSuccess('Account verified successfully! You can now log in.');
                    
                    // Sign out the user after verification to ensure they have to log in properly
                    await signOut(auth);
                    
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setError('Invalid verification code. Please try again.');
                }
            } catch (apiError) {
                console.error('API error during verification:', apiError);
                throw new Error(`Error verifying account: ${apiError.response?.data?.error || apiError.message}`);
            }
        } catch (err) {
            console.error('Verification error:', err);
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
            try {
                const user = auth.currentUser;
                if (user) {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, { otp: newOtp }).catch(err => {
                        console.warn("Couldn't update OTP in database:", err);
                        // Continue anyway - email verification is more important
                    });
                }
            } catch (dbError) {
                console.warn("Database update failed, but continuing:", dbError);
                // Continue with email send even if DB update fails
            }
            
            // Send verification email via server API
            try {
                const response = await axios.post('/send-verification-code', { 
                    email,
                    code: newOtp
                });
                
                if (response.data.success) {
                    setSuccess('New verification code sent. Please check your email.');
                } else {
                    setError(response.data.error || 'Failed to send new verification code. Please try again.');
                }
            } catch (apiError) {
                console.error('API error during resend:', apiError);
                throw new Error(`Network error while resending verification code: ${apiError.response?.data?.error || apiError.message}`);
            }
            
        } catch (err) {
            console.error('Error resending OTP:', err);
            setError(err.message || 'Failed to resend verification code');
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
                uidCode: '',
                authProvider: 'google',
                emailVerified: true // Mark as verified since Google verifies emails
            };

            // Extract referral code from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const urlRefCode = urlParams.get('ref');
            
            // Use URL referral code if available and none entered manually
            if (urlRefCode && !referralCode) {
                console.log("Using referral code from URL:", urlRefCode);
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
            console.error('Google signup error:', err);
            setError(err.message);
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
            const response = await axios.post('/send-verification-code', { email });
            if (response.data.success) {
                // Just show a message to check email
                setVerificationSent(true);
                // Code will be entered by user from their email
            }
        } catch (error) {
            // ...
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
                                                        <option value="United States">United States</option>
                                                        <option value="United Kingdom">United Kingdom</option>
                                                        <option value="Canada">Canada</option>
                                                        <option value="Australia">Australia</option>
                                                        <option value="Germany">Germany</option>
                                                        <option value="France">France</option>
                                                        <option value="Japan">Japan</option>
                                                        <option value="South Korea">South Korea</option>
                                                        <option value="China">China</option>
                                                        <option value="India">India</option>
                                                        <option value="Brazil">Brazil</option>
                                                        <option value="Mexico">Mexico</option>
                                                        <option value="Singapore">Singapore</option>
                                                        <option value="Hong Kong">Hong Kong</option>
                                                        {/* Additional countries can be added as needed */}
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