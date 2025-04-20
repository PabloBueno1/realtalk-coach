import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    try {
      const response = await axios.post('http://localhost:8000/auth/signup', {
        email,
        password,
        full_name: fullName,
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      
      setMessage(response.data.message);
      setIsSuccess(true);
      setShowMessage(true);
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data.detail || 'Error creating account. Please try again.';
        setMessage(errorMessage);
      } else {
        setMessage('Error creating account. Please try again.');
      }
      setIsSuccess(false);
      setShowMessage(true);
      console.error('Signup error:', error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left section */}
      <div className="w-1/2 bg-[#235390] flex flex-col items-center justify-between p-12 text-white relative">
        {/* Logo Section */}
        <div className="w-full flex justify-between items-center">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-4 rounded-lg transition-colors"
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
          <img 
            src={welcomeLogo} 
            alt="RealTalk Coach Logo" 
            className="w-48 h-auto"
          />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-8 max-w-md">
          <h1 className="text-4xl font-bold">Welcome to RealTalk Coach</h1>
          <p className="text-xl opacity-90">
            Your personal AI-powered communication coach. Practice conversations, 
            receive instant feedback, and improve your communication skills in a 
            safe, judgment-free environment.
          </p>
          
          {/* Illustration */}
          <div className="w-full aspect-square max-w-sm relative">
            <svg className="w-full h-full" viewBox="0 0 200 200" fill="none">
              {/* Stylized chat bubbles and figures */}
              <circle cx="100" cy="100" r="40" className="fill-green-500/10"/>
              <path d="M60,100 Q80,70 100,100 T140,100" 
                    className="stroke-green-500"
                    strokeWidth="3" 
                    fill="none"/>
              <circle cx="70" cy="100" r="8" className="fill-green-500"/>
              <circle cx="130" cy="100" r="8" className="fill-green-500"/>
              <path d="M50,140 Q100,120 150,140" 
                    className="stroke-green-500"
                    strokeWidth="3" 
                    fill="none"/>
            </svg>
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <p className="text-sm opacity-75">
            Join thousands of users improving their communication skills every day
          </p>
        </div>
      </div>

      {/* Right form section */}
      <div className="w-1/2 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-semibold mb-8 text-gray-800">Create Account</h2>
          
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

          <form onSubmit={handleSubmit} className="space-y-6">
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
    </div>
  );
};

export default SignUp; 