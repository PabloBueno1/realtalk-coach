import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home: React.FC = () => {
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await axios.post('http://localhost:8000/auth/signout');
      // Clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      setMessage('Successfully signed out. Redirecting...');
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      setMessage('Error signing out. Please try again.');
      setIsSuccess(false);
    }
  };

  return (
    <div className="home-container">
      <h1>Welcome to RealTalk Coach</h1>
      <p>This is your home screen. More features coming soon!</p>
      {message && (
        <div className={`message ${isSuccess ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      <button onClick={handleSignOut} className="signout-button">
        Sign Out
      </button>
    </div>
  );
};

export default Home; 