import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';
import peopletalkingSvg from '../assets/logo/peopletalking.svg';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setErrorMessage('');
    setSuccessMessage('');

    // Password validation checks
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      setShowMessage(true);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowMessage(true);
      return;
    }

    try {
      const { data, error } = await signUp({ 
        email, 
        password,
        options: {
          data: {
            has_completed_setup: false
          }
        }
      });
      
      if (error) throw error;

      setSuccessMessage('Sign up successful! Please check your email for verification.');
      setShowMessage(true);
      
      // Navigate to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Error signing up. Please try again.'
      );
      setShowMessage(true);
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
          
          {errorMessage && showMessage && (
            <div 
              className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center space-x-3 transform transition-all duration-300 ${
                showMessage ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              } bg-red-50 text-red-800 border border-red-200`}
            >
              <p className="text-sm font-medium flex-1">{errorMessage}</p>

              {/* Close button */}
              <button 
                onClick={() => setShowMessage(false)}
                className="flex-shrink-0 text-red-500 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {successMessage && showMessage && (
            <div 
              className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg flex items-center space-x-3 transform transition-all duration-300 ${
                showMessage ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              } bg-green-50 text-green-800 border border-green-200`}
            >
              <p className="text-sm font-medium flex-1">{successMessage}</p>

              {/* Close button */}
              <button 
                onClick={() => setShowMessage(false)}
                className="flex-shrink-0 text-green-500 hover:text-green-600 transition-colors"
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

            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm Password"
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