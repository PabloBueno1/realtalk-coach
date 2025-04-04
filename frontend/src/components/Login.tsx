import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password
      });
      
      if (response.data.message === "Login successful") {
        // Store the session data
        localStorage.setItem('access_token', response.data.session.access_token);
        localStorage.setItem('refresh_token', response.data.session.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setMessage('Login successful! Redirecting...');
        setIsSuccess(true);
        
        // Navigate to home
        setTimeout(() => {
          navigate('/home');
        }, 1000);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Handle specific error messages from the server
        const errorMessage = error.response.data.detail || 'Login failed. Please try again.';
        setMessage(errorMessage);
        
        // If email needs verification, redirect to signup
        if (errorMessage.includes('verify your email')) {
          setTimeout(() => {
            navigate('/signup');
          }, 3000);
        }
      } else {
        setMessage('Login failed. Please try again.');
      }
      setIsSuccess(false);
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="auth-container p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">Login</h2>
        {message && (
          <div className={`message ${isSuccess ? 'success' : 'error'} p-3 rounded mb-4 text-sm ${isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="form-group mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button 
             type="submit" 
             className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Login
          </button>
        </form>
        <p>
          Don't have an account?{' '}
          <button onClick={() => navigate('/signup')}>Sign Up</button>
        </p>
      </div>
    </div>
  );
};

export default Login; 