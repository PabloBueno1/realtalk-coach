import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/whitewelcome.svg';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password-confirm`,
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password reset instructions have been sent to your email.');
      setShowMessage(true);
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Error sending reset instructions. Please try again.'
      );
      setShowMessage(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Form section - Full width on mobile, half on desktop */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative order-2 md:order-1 min-h-screen md:min-h-0">
        <button 
          onClick={() => navigate('/login')}
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8 text-gray-800">Reset Password</h2>
          
          {showMessage && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              successMessage ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
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
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors"
              />
            </div>

            <div className="flex justify-start">
              <button 
                type="submit"
                className="bg-green-500 text-white text-base py-3 px-8 rounded-xl hover:bg-green-600 transition-colors font-medium"
              >
                Send Reset Instructions
              </button>
            </div>
          </form>
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
        <div className="flex flex-col items-center text-center space-y-6 lg:space-y-8 max-w-md -mt-[20vh]">
          <p className="text-lg lg:text-xl opacity-90 font-medium">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <div className="mt-4 text-xs opacity-75 flex justify-center space-x-4">
            <a href="/terms" className="hover:text-white hover:underline">Terms</a>
            <a href="/privacy" className="hover:text-white hover:underline">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 