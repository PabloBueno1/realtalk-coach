import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import { Eye, EyeOff } from 'lucide-react';

const ResetPasswordConfirm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
    noSequential: true
  });
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setErrorMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setShowMessage(true);
      return;
    }

    if (!validatePassword(password)) {
      setErrorMessage('Please ensure your password meets all requirements.');
      setShowMessage(true);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password has been reset successfully!');
      setShowMessage(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Error resetting password. Please try again.'
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
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8 text-gray-800">Set New Password</h2>
          
          {showMessage && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              successMessage ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {successMessage || errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  placeholder="New password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <div className={`flex items-center ${passwordRequirements.length ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">•</span>
                  At least 8 characters
                </div>
                <div className={`flex items-center ${passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">•</span>
                  One uppercase letter
                </div>
                <div className={`flex items-center ${passwordRequirements.number ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">•</span>
                  One number
                </div>
                <div className={`flex items-center ${passwordRequirements.special ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">•</span>
                  One special character
                </div>
                <div className={`flex items-center ${passwordRequirements.noSequential ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">•</span>
                  No sequential characters
                </div>
              </div>
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-start">
              <button 
                type="submit"
                className="bg-green-500 text-white text-base py-3 px-8 rounded-xl hover:bg-green-600 transition-colors font-medium"
              >
                Reset Password
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
            Create a strong new password to secure your account.
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

export default ResetPasswordConfirm; 