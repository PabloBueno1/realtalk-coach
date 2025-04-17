import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import welcomeLogo from '../assets/logo/welcome.png';
import mainLogo from '../assets/logo/logo.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password,
      });

      localStorage.setItem('access_token', response.data.session.access_token);
      localStorage.setItem('user', JSON.stringify({
        email: email,
        hasCompletedSetup: response.data.has_completed_setup || false
      }));

      setSuccessMessage('Login successful!');
      setShowMessage(true);
      
      // Redirect based on profile setup status
      if (!response.data.has_completed_setup) {
        navigate('/profile-setup');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail || 'Error logging in. Please try again.'
      );
      setShowMessage(true);
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
            className="w-40 h-auto"
          />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-8 max-w-md">
          <h1 className="text-4xl font-bold">Welcome Back!</h1>
          <p className="text-xl opacity-90">
            Continue your journey to better communication. Log in to access your 
            personalized AI coach and track your progress.
          </p>
          
          {/* Logo Image */}
          <div className="w-full max-w-sm">
            <img 
              src={mainLogo} 
              alt="RealTalk Coach" 
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <p className="text-sm opacity-75">
            Your AI communication coach is ready to help you improve
          </p>
        </div>
      </div>

      {/* Right form section */}
      <div className="w-1/2 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-semibold mb-8 text-gray-800">Sign In</h2>
          
          {showMessage && (
            <div className={`mb-4 p-3 rounded text-sm ${
              successMessage ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {successMessage || errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                Sign In
              </button>
            </div>
          </form>

          <div className="mt-4 text-right">
            <span 
              onClick={() => navigate('/signup')}
              className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
            >
              Sign up →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 