import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';
import peopletalkingSvg from '../assets/logo/peopletalking.svg';

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  learningGoals: [],
  preferredScenarios: [],
  practiceFrequency: 'weekly',
  notifications: true,
  avatar: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  gender: ''
};

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    try {
      // 1. Sign up user with Supabase Auth
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
      if (error) throw error;
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
      navigate('/profile-setup');
    } catch (error: any) {
      setMessage(error.message || 'Error creating account. Please try again.');
      setIsSuccess(false);
      setShowMessage(true);
      console.error('Signup error:', error);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Right form section (now on left) */}
      <div className="w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-4 rounded-lg transition-colors"
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
        <div className="w-full max-w-md">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 sm:mb-6 md:mb-8 text-gray-800">Create Account</h2>
          
          {message && showMessage && (
            <div 
              className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center space-x-3 transform transition-all duration-300 ${
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Full Name"
                className="w-full px-3 py-2 border-b border-gray-300 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full px-3 py-2 border-b border-gray-300 focus:border-green-500 outline-none transition-colors"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-3 py-2 border-b border-gray-300 focus:border-green-500 outline-none transition-colors"
              />
            </div>

            <div className="flex justify-start">
              <button 
                type="submit"
                className="bg-green-500 text-white text-sm py-2 px-6 rounded-xl hover:bg-green-600 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </form>

          <div className="mt-4 text-right">
            <span 
              onClick={() => navigate('/login')}
              className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
            >
              Sign in →
            </span>
          </div>
        </div>
      </div>

      {/* Left section (now on right) */}
      <div className="w-1/2 bg-[#235390] flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 lg:p-12 text-white relative">
        {/* Logo Section */}
        <div className="w-full flex justify-center items-center">
          <img 
            src={welcomeLogo} 
            alt="RealTalk Coach Logo" 
            className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto"
          />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6 md:space-y-8 max-w-md -mt-[10vh]">
          <div className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 mt-10 mb-4 relative">
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