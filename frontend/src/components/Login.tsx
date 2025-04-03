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
    <div className="auth-container">
      <h2>Login</h2>
      {message && (
        <div className={`message ${isSuccess ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account?{' '}
        <button onClick={() => navigate('/signup')}>Sign Up</button>
      </p>
    </div>
  );
};

export default Login; 