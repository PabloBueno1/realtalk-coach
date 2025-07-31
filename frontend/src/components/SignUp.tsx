import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import peopletalkingSvg from '../assets/logo/peopletalking.svg';
import { Info, Eye, EyeOff, Github, Chrome } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
    noSequential: true
  });
  const navigate = useNavigate();
  const { signUp, session } = useAuth();

  // Check for existing session and redirect if found
  useEffect(() => {
    if (session) {
      // Go directly to home after signup
      navigate('/home');
    }
  }, [session, navigate]);

  const validatePassword = (password: string) => {
    // Check for sequential patterns (numbers and letters)
    const hasSequentialNumbers = /(?:012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(password);
    const hasSequentialLetters = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|vwx|wxy|xyz|zyx|yxw|xwv|wvu|vut|uts|tsr|srq|rqp|qpo|pon|onm|nml|mlk|lkj|kji|jih|ihg|hgf|gfe|fed|edc|dcb|cba)/i.test(password);
    
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noSequential: !hasSequentialNumbers && !hasSequentialLetters
    };
    setPasswordRequirements(requirements);
    return Object.values(requirements).every(Boolean) && !password.includes(' ');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const checkEmailExists = async (email: string) => {
    try {
      setIsCheckingEmail(true);
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      setEmailExists(data.exists);
      return data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && newEmail.includes('@')) {
      await checkEmailExists(newEmail);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'github') => {
    navigate(`/login?provider=${provider}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    
    if (emailExists) {
      setMessage('This email is already registered. Please log in or use a different email.');
      setIsSuccess(false);
      setShowMessage(true);
      return;
    }

    if (!validatePassword(password)) {
      setMessage('Please ensure your password meets all requirements.');
      setIsSuccess(false);
      setShowMessage(true);
      return;
    }

    try {
      // 1. Sign up user with Supabase Auth (handles duplicate email check)
      const { data, error } = await signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            has_completed_setup: false
          }
        }
      });

      // Always show a generic message for security
      if (
        data?.user?.email &&
        data?.user?.confirmation_sent_at &&
        !error
      ) {
        setMessage('If this email is not registered, you will receive a confirmation email. If you already have an account, please log in.');
        setIsSuccess(true);
        setShowMessage(true);
        return;
      }

      // Handle other errors
      if (error) {
        throw error;
      }

      // If we get here, the signup was successful
      const user = data.user;
      if (!user) throw new Error('User creation failed');

      // Store user info and show message
      localStorage.setItem('user', JSON.stringify({
        email: email,
        hasCompletedSetup: false
      }));
      setMessage('Account created! Please check your email and click the confirmation link to activate your account. You will not be able to log in until you confirm your email address.');
      setIsSuccess(true);
      setShowMessage(true);
    } catch (error: any) {
      let errorMessage = 'Error creating account. Please try again.';
      
      // Handle specific Supabase error messages
      if (error.message) {
        if (error.message.toLowerCase().includes('user already registered')) {
          errorMessage = 'This email address is already registered. Please log in or use a different email.';
        } else if (error.message.toLowerCase().includes('password') || password.length < 8) {
          errorMessage = 'Password must be at least 8 characters long.';
        } else if (error.message.toLowerCase().includes('email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessage(errorMessage);
      setIsSuccess(false);
      setShowMessage(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Form section - Full width on mobile, half on desktop */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative order-2 md:order-1 min-h-screen md:min-h-0">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-4 rounded-lg transition-colors z-10"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back</span>
        </button>
        <div className="w-full max-w-md pt-12 md:pt-0">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8 text-gray-800">Create Account</h2>
          
          {message && showMessage && (
            <div 
              className={`mb-6 p-4 rounded-lg flex items-center space-x-3 transform transition-all duration-300 ${
                showMessage ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              } ${
                isSuccess 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {/* Success Icon */}
              {isSuccess && (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
              
              {/* Error Icon */}
              {!isSuccess && (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              )}

              <p className="text-sm font-medium flex-1">{message}</p>

              {/* Close button */}
              <button 
                onClick={() => setShowMessage(false)}
                className={`flex-shrink-0 ${
                  isSuccess ? 'text-green-500 hover:text-green-600' : 'text-red-500 hover:text-red-600'
                } transition-colors`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-6">
              <p className="text-gray-700">
                Please check your email inbox for a verification link to complete your registration.
              </p>
              <div className="mt-4 text-center md:text-right">
                <span 
                  onClick={() => navigate('/login')}
                  className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
                >
                  Sign in →
                </span>
              </div>
            </div>
          ) : (
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Full Name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    placeholder="Email"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-200 outline-none transition-colors ${
                      email && email.includes('@')
                        ? emailExists
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-green-500 focus:border-green-500'
                        : 'border-gray-300 focus:border-green-500'
                    }`}
                  />
                  {isCheckingEmail && (
                    <p className="text-xs text-gray-500 mt-1">Checking email availability...</p>
                  )}
                  {email && email.includes('@') && !isCheckingEmail && emailExists && (
                    <p className="text-xs text-red-500 mt-1">This email is already registered</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Password"
                      className={`w-full px-4 py-3 pr-20 border rounded-lg focus:ring-2 outline-none transition-colors ${
                        password.length > 0 
                          ? Object.values(passwordRequirements).every(Boolean)
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-200' 
                            : 'border-red-500 focus:border-red-500 focus:ring-red-200'
                          : 'border-gray-300 focus:border-green-500'
                      }`}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                      <div className="group relative">
                        <Info 
                          className={`w-5 h-5 cursor-help ${
                            password.length > 0 
                              ? Object.values(passwordRequirements).every(Boolean)
                                ? 'text-green-500' 
                                : 'text-red-500'
                              : 'text-gray-400'
                          }`}
                        />
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                          <div className="space-y-2">
                            <p className={`text-xs flex items-center ${
                              password.length > 0 
                                ? (passwordRequirements.length && passwordRequirements.number)
                                  ? 'text-green-500' 
                                  : 'text-red-500'
                                : 'text-gray-500'
                            }`}>
                              <span className="mr-1">•</span>
                              At least 8 characters and one number
                            </p>
                            <p className={`text-xs flex items-center ${
                              password.length > 0 
                                ? (passwordRequirements.uppercase && /[a-z]/.test(password))
                                  ? 'text-green-500' 
                                  : 'text-red-500'
                                : 'text-gray-500'
                            }`}>
                              <span className="mr-1">•</span>
                              At least one uppercase and one lowercase letter
                            </p>
                            <p className={`text-xs flex items-center ${
                              password.length > 0 
                                ? passwordRequirements.special 
                                  ? 'text-green-500' 
                                  : 'text-red-500'
                                : 'text-gray-500'
                            }`}>
                              <span className="mr-1">•</span>
                              One special character (!@#$%^&*(),.?":{'{'}|{'>'})
                            </p>
                            <p className={`text-xs flex items-center ${
                              password.length > 0 
                                ? passwordRequirements.noSequential 
                                  ? 'text-green-500' 
                                  : 'text-red-500'
                                : 'text-gray-500'
                            }`}>
                              <span className="mr-1">•</span>
                              No sequential patterns (e.g., "12345", "abcde")
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <button 
                    type="submit"
                    className="bg-green-500 text-white text-base py-3 px-8 rounded-xl hover:bg-green-600 transition-colors font-medium"
                  >
                    Sign Up
                  </button>
                </div>
              </form>

              {/* OAuth Sign Up Options */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 mb-4">Or sign up with</p>
                <div className="flex justify-center items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleOAuthSignUp('google')}
                    className="flex items-center justify-center space-x-2 text-sm text-gray-700 hover:text-[#DB4437] transition-colors py-3 px-6 border border-gray-300 rounded-lg hover:border-[#DB4437]"
                    aria-label="Sign up with Google"
                  >
                    <Chrome className="w-4 h-4" />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuthSignUp('github')}
                    className="flex items-center justify-center space-x-2 text-sm text-gray-700 hover:text-gray-900 transition-colors py-3 px-6 border border-gray-300 rounded-lg hover:border-gray-900"
                    aria-label="Sign up with GitHub"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 text-center md:text-right">
                <span 
                  onClick={() => navigate('/login')}
                  className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
                >
                  Already have an account? Sign in →
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Brand section - Hidden on mobile, half on desktop */}
      <div className="hidden md:flex md:w-1/2 bg-[#235390] flex-col items-center justify-between p-8 lg:p-12 text-white relative order-1 md:order-2">
        {/* Logo Section */}
        <div className="w-full flex justify-center items-center">
          <img 
            src={welcomeLogo} 
            alt="RealTalk Coach Logo" 
            className="w-20 lg:w-24 h-auto"
          />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-6 lg:space-y-8 max-w-md -mt-[10vh]">
          <div className="w-80 lg:w-96 mt-10 mb-4 relative">
            {/* Using peopletalking SVG */}
            <img src={peopletalkingSvg} alt="People Talking" className="w-full h-full" />
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <div className="mt-4 text-xs opacity-75 flex justify-center space-x-4">
            <a href="/terms" className="hover:text-white hover:underline">Terms</a>
            <a href="/privacy" className="hover:text-white hover:underline">Privacy</a>
            <a href="/contact" className="hover:text-white hover:underline">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 