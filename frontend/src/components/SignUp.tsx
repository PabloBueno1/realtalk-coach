import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/auth/signup', {
        email,
        password,
        full_name: fullName
      });
      
      // Set the message from the backend response
      setMessage(response.data.message);
      setIsSuccess(true);
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Handle specific error messages from the server
        const errorMessage = error.response.data.detail || 'Error creating account. Please try again.';
        setMessage(errorMessage);
      } else {
        setMessage('Error creating account. Please try again.');
      }
      setIsSuccess(false);
      console.error('Signup error:', error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      {message && (
        <div className={`message ${isSuccess ? 'success' : 'error'}`}>
          {message}
          {isSuccess && (
            <div className="success-actions">
              <button onClick={() => navigate('/login')} className="login-button">
                Go to Login
              </button>
            </div>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name:</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Enter your full name"
          />
        </div>
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
            minLength={6}
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account?{' '}
        <button onClick={() => navigate('/login')}>Login</button>
      </p>
    </div>
  );
};

export default SignUp; 