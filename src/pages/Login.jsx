import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Sale01 from '../components/sale/Sale01';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import PageTitle from '../components/pagetitle';
import { useAuth } from '../contexts/AuthContext';
import {Link} from 'react-router-dom';
import img from '../assets/images/icon/qrcode.png';
import styled from 'styled-components';

Login.propTypes = {
    
};

function Login(props) {
    const navigate = useNavigate();
    const { loginWithVerification, checkEmailVerificationStatus, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [error, setError] = useState('');
    const [verificationPrompt, setVerificationPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    
    // New states for the OTP verification step
    const [passwordResetStep, setPasswordResetStep] = useState(1); // 1: email, 2: OTP verification
    const [resetOTP, setResetOTP] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setVerificationPrompt(false);

        try {
            // Use our enhanced login function that verifies email
            await loginWithVerification(email, password);
            navigate('/user-profile');
        } catch (err) {
            if (err.message.includes('verify your email')) {
                // Email is not verified
                setVerificationPrompt(true);
            }
            setError(err.message);
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneLogin = async (e) => {
        e.preventDefault();
        // For this demo, we'll just show an error since phone auth requires additional setup
        setError('Phone authentication requires additional Firebase setup.');
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        
        try {
            await loginWithGoogle();
            // Redirect to user profile page
            navigate('/user-profile');
        } catch (err) {
            setError(err.message);
            console.error('Google login error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerification = () => {
        // Redirect to a page where they can request a new verification code
        navigate('/register', { state: { email, showVerification: true } });
    };

    const handleForgotPassword = () => {
        setShowForgotPassword(true);
    };

    const handleSendResetLink = async (e) => {
        e.preventDefault();
        setForgotPasswordLoading(true);
        setForgotPasswordMessage('');

        try {
            // Import Firebase auth functions
            const { sendPasswordResetEmail } = await import('firebase/auth');
            
            // Use Firebase's built-in password reset functionality
            await sendPasswordResetEmail(auth, forgotPasswordEmail);
            
            // Show success message
            setForgotPasswordMessage('Password reset email sent! Please check your email to complete the reset process.');
            
            // No need to move to step 2 since we're using Firebase's native flow
            setTimeout(() => {
                handleCloseForgotPassword();
            }, 5000);
        } catch (err) {
            console.error('Password reset error:', err);
            
            // Handle specific Firebase errors
            if (err.code === 'auth/user-not-found') {
                setForgotPasswordMessage('Error: No account found with this email address.');
            } else if (err.code === 'auth/invalid-email') {
                setForgotPasswordMessage('Error: Invalid email format.');
            } else {
                setForgotPasswordMessage('Error: Could not send reset email. Please try again later.');
            }
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    const handleCloseForgotPassword = () => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setForgotPasswordMessage('');
    };

    return (
        <div>
            <PageTitle heading='Login' title='Login' />

            <LoginSection>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <LoginCard>
                                <LoginHeader>
                                    <h3>Welcome to Ripple Exchange</h3>
                                    <p>Enter your credentials to access your account</p>
                                    <SecurityBadge>
                                        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8.00004 11.7578C7.67672 11.7578 7.41406 12.0205 7.41406 12.3438C7.41406 12.6671 7.67672 12.9298 8.00004 12.9298C8.32336 12.9298 8.58602 12.6671 8.58602 12.3438C8.58602 12.0205 8.32336 11.7578 8.00004 11.7578Z" fill="currentColor" />
                                            <path d="M11.5162 8.24219H4.2187C2.10011 8.24219 0.382568 9.95965 0.382568 12.0783C0.382568 15.6973 2.78413 19.0605 6.32241 19.8205C11.2508 20.8791 15.618 17.0922 15.618 12.344C15.618 10.0787 13.7816 8.24219 11.5162 8.24219ZM8.58628 13.9941V17.071C8.58628 17.3949 8.32417 17.657 8.0003 17.657C7.6764 17.657 7.41433 17.3949 7.41433 17.071V13.9941C6.73374 13.7514 6.24237 13.107 6.24237 12.3441C6.24237 11.3747 7.03093 10.5861 8.0003 10.5861C8.96968 10.5861 9.75823 11.3747 9.75823 12.3441C9.75823 13.107 9.26686 13.7513 8.58628 13.9941Z" fill="currentColor" />
                                            <path d="M8.00039 0C5.08223 0 2.72656 2.35562 2.72656 5.27383V7.3234C3.20102 7.17391 3.69582 7.07086 4.21898 7.07086H5.07051V5.27383C5.07051 3.65652 6.38309 2.34395 8.00039 2.34395C9.6177 2.34395 10.9303 3.65652 10.9303 5.27383V7.07082H11.5163C12.1356 7.07082 12.7216 7.19777 13.2742 7.3948V5.27383C13.2742 2.35844 10.9128 0 8.00039 0Z" fill="currentColor" />
                                        </svg>
                                        <span>rippleexchange.org/register</span>
                                    </SecurityBadge>
                                </LoginHeader>

                                <StyledTabs>
                                    <TabList>
                                        <Tab>Email</Tab>
                                        <Tab>Mobile</Tab>
                                    </TabList>

                                    <TabPanel>
                                        <LoginForm onSubmit={handleEmailLogin}>
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
                                            
                                            <FormGroup>
                                                <FormLabel>Password</FormLabel>
                                                <FormInput
                                                    type="password"
                                                    placeholder="Enter your password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                />
                                            </FormGroup>

                                            <LoginOptions>
                                                <RememberMe>
                                                    <input type="checkbox" id="remember" />
                                                    <label htmlFor="remember">Remember Me</label>
                                                </RememberMe>
                                                <ForgotPassword onClick={handleForgotPassword}>
                                                    Forgot Password?
                                                </ForgotPassword>
                                            </LoginOptions>

                                            {error && <ErrorMessage>{error}</ErrorMessage>}
                                            
                                            {verificationPrompt && (
                                                <VerificationPrompt>
                                                    Your email is not verified. 
                                                    <VerifyButton onClick={handleVerification}>
                                                        Click here to verify
                                                    </VerifyButton>
                                                </VerificationPrompt>
                                            )}

                                            <LoginButton 
                                                type="submit" 
                                                disabled={loading}
                                            >
                                                {loading ? 'Logging in...' : 'Login to Your Account'}
                                            </LoginButton>
                                            
                                            <Divider>
                                                <span>or continue with</span>
                                            </Divider>
                                            
                                            <GoogleButton 
                                                type="button" 
                                                onClick={handleGoogleLogin} 
                                                disabled={loading}
                                            >
                                                <img 
                                                    src="https://www.google.com/favicon.ico" 
                                                    alt="Google" 
                                                />
                                                {loading ? 'Processing...' : 'Google'}
                                            </GoogleButton>
                                            
                                            <SignUpPrompt>
                                                <span>Don't have an account?</span>
                                                <Link to="/register">Sign up now</Link>
                                            </SignUpPrompt>
                                        </LoginForm>
                                    </TabPanel>

                                    <TabPanel>
                                        <LoginForm onSubmit={handlePhoneLogin}>
                                            <FormGroup>
                                                <FormLabel>Mobile Phone</FormLabel>
                                                <PhoneInputGroup>
                                                    <CountrySelect
                                                        value={countryCode}
                                                        onChange={(e) => setCountryCode(e.target.value)}
                                                    >
                                                        <option value="+1">+1</option>
                                                        <option value="+84">+84</option>
                                                        <option value="+82">+82</option>
                                                        <option value="+32">+32</option>
                                                    </CountrySelect>
                                                    <PhoneInput
                                                        type="text"
                                                        placeholder="Your phone number"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                    />
                                                </PhoneInputGroup>
                                            </FormGroup>
                                            
                                            <FormGroup>
                                                <FormLabel>Password</FormLabel>
                                                <FormInput
                                                    type="password"
                                                    placeholder="Enter your password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                />
                                            </FormGroup>

                                            <LoginOptions>
                                                <RememberMe>
                                                    <input type="checkbox" id="remember-phone" />
                                                    <label htmlFor="remember-phone">Remember Me</label>
                                                </RememberMe>
                                                <ForgotPassword onClick={handleForgotPassword}>
                                                    Forgot Password?
                                                </ForgotPassword>
                                            </LoginOptions>

                                            {error && <ErrorMessage>{error}</ErrorMessage>}

                                            <LoginButton type="submit">Login</LoginButton>
                                            
                                            <SignUpPrompt>
                                                <span>Don't have an account?</span>
                                                <Link to="/register">Sign up now</Link>
                                            </SignUpPrompt>
                                        </LoginForm>
                                    </TabPanel>
                                </StyledTabs>
                            </LoginCard>
                        </div>
                    </div>
                </div>
            </LoginSection>

            <Sale01 />

            {showForgotPassword && (
                <ModalOverlay>
                    <ModalContent>
                        <ModalHeader>Reset Your Password</ModalHeader>

                        <form onSubmit={handleSendResetLink}>
                            <FormGroup>
                                <FormLabel htmlFor="forgotPasswordEmail">
                                    Email Address
                                </FormLabel>
                                <FormInput
                                    type="email"
                                    id="forgotPasswordEmail"
                                    value={forgotPasswordEmail}
                                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email address"
                                />
                            </FormGroup>

                            {forgotPasswordMessage && (
                                <ForgotPasswordMessage isError={forgotPasswordMessage.includes('Error')}>
                                    {forgotPasswordMessage}
                                </ForgotPasswordMessage>
                            )}

                            <ModalButtonGroup>
                                <ModalCancelButton
                                    type="button"
                                    onClick={handleCloseForgotPassword}
                                >
                                    Cancel
                                </ModalCancelButton>
                                <ModalSubmitButton
                                    type="submit"
                                    disabled={forgotPasswordLoading}
                                >
                                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                                </ModalSubmitButton>
                            </ModalButtonGroup>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}
        </div>
    );
}

// Styled Components for enhanced UI
const LoginSection = styled.section`
    padding: 60px 0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    min-height: 80vh;
    display: flex;
    align-items: center;
`;

const LoginCard = styled.div`
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    padding: 30px;
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const LoginHeader = styled.div`
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
        margin: 0 auto 20px;
    }
`;

const SecurityBadge = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 8px 15px;
    border-radius: 8px;
    width: fit-content;
    margin: 0 auto;
    color: #4ade80;
    font-size: 14px;
    
    svg {
        margin-right: 8px;
    }
    
    span {
        font-family: monospace;
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

const LoginForm = styled.form`
    padding: 10px 0;
`;

const FormGroup = styled.div`
    margin-bottom: 20px;
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

const LoginOptions = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
`;

const RememberMe = styled.div`
    display: flex;
    align-items: center;
    
    input {
        margin-right: 8px;
    }
    
    label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
    }
`;

const ForgotPassword = styled.span`
    color: #4f46e5;
    font-size: 14px;
    cursor: pointer;
    
    &:hover {
        text-decoration: underline;
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

const VerificationPrompt = styled.div`
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
    padding: 12px 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const VerifyButton = styled.button`
    background: none;
    border: none;
    color: #4f46e5;
    cursor: pointer;
    text-decoration: underline;
    font-size: 14px;
    margin-left: 10px;
`;

const LoginButton = styled.button`
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

const SignUpPrompt = styled.div`
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

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
    background-color: #1e293b;
    padding: 30px;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.h3`
    color: #fff;
    margin-bottom: 25px;
    text-align: center;
    font-size: 24px;
    font-weight: 600;
`;

const ForgotPasswordMessage = styled.div`
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 8px;
    background-color: ${props => props.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
    color: ${props => props.isError ? '#ef4444' : '#10b981'};
    text-align: center;
    font-size: 14px;
`;

const ModalButtonGroup = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
`;

const ModalCancelButton = styled.button`
    padding: 12px 20px;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    font-size: 16px;
    width: 45%;
    transition: background-color 0.2s;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
`;

const ModalSubmitButton = styled.button`
    padding: 12px 20px;
    background: linear-gradient(to right, #4f46e5, #7c3aed);
    border: none;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    font-size: 16px;
    width: 45%;
    transition: all 0.3s;
    
    &:hover {
        background: linear-gradient(to right, #4338ca, #6d28d9);
    }
    
    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

export default Login;