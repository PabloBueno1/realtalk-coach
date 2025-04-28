import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';

const API_URL = process.env.REACT_APP_API_URL;

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
      const response = await axios.post(`${API_URL}/auth/signup`, {
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
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6 md:space-y-8 max-w-md">
          <p className="text-base sm:text-lg md:text-xl opacity-90">
            <TypewriterEffect />
          </p>
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

// TypewriterEffect component
const TypewriterEffect: React.FC = () => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuote, setCurrentQuote] = useState('');
  
  // Quotes from typewriter.txt
  const quotes = [
    "Master difficult workplace conversations.",
    "Navigate family gatherings with grace.",
    "Communicate effectively with your team.",
    "Ask for a raise with confidence.",
    "Connect meaningfully at industry conferences.",
    "Handle criticism constructively.",
    "Express disagreement respectfully.",
    "Turn small talk into memorable conversations.",
    "Speak with authority in meetings.",
    "Build rapport with clients instantly.",
    "Resolve conflicts through effective dialogue.",
    "Share feedback that inspires growth.",
    "Command attention when you speak.",
    "Tell compelling stories that captivate.",
    "Negotiate win-win outcomes.",
    "Make your ideas heard in group settings.",
    "Create trust through authentic communication.",
    "Speak clearly under pressure.",
    "Handle tough questions with poise.",
    "Leave lasting impressions in brief encounters.",
    "Every great conversation starts with genuine curiosity.",
    "You already have the power to connect deeply with others—our app helps you unlock it.",
    "Small shifts in how you listen can transform your conversations. Start your journey now.",
    "Communication mastery isn't born, it's built—one conversation at a time.",
    "Confidence in conversation comes from practice, not perfection. Take the first step today.",
    "Great communicators aren't born—they're made through consistent small improvements.",
    "The path to better relationships starts with better conversations. Begin your growth today.",
    "Better conversations create better opportunities. Start building your communication skills now.",
    "Everyone remembers how you made them feel. Learn to create meaningful connections.",
    "Your words can open doors. Master the art of conversation and watch possibilities unfold.",
    "Communication isn't just what you say—it's how you listen. Develop both skills and transform your interactions.",
    "The difference between good and great often comes down to how well you communicate. Elevate your conversations today.",
    "Small changes in how you communicate can yield extraordinary results in every area of life."
  ];
  
  // Get a random quote that isn't the current one
  const getRandomQuote = () => {
    if (quotes.length <= 1) return quotes[0];
    
    let newQuote;
    do {
      newQuote = quotes[Math.floor(Math.random() * quotes.length)];
    } while (newQuote === currentQuote);
    
    return newQuote;
  };
  
  // Select initial quote
  useEffect(() => {
    if (!currentQuote) {
      setCurrentQuote(getRandomQuote());
    }
  }, [currentQuote]);
  
  useEffect(() => {
    if (currentIndex < currentQuote.length) {
      // Type the current character
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + currentQuote[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, 50);
      
      return () => clearTimeout(timeout);
    } else {
      // Current quote is complete, pause before moving to the next one
      const pauseTimeout = setTimeout(() => {
        setDisplayText('');
        setCurrentIndex(0);
        setCurrentQuote(getRandomQuote());
      }, 3000);
      
      return () => clearTimeout(pauseTimeout);
    }
  }, [currentIndex, currentQuote]);
  
  return <span className="font-medium">{displayText}</span>;
};

export default SignUp; 