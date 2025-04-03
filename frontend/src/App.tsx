import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testBackendConnection = async () => {
    try {
      const response = await axios.get(`${API_URL}/test`);
      setMessage(response.data.message);
      setError('');
    } catch (err) {
      setError('Failed to connect to backend');
      setMessage('');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RealTalk Coach</h1>
        <button 
          className="test-button"
          onClick={testBackendConnection}
        >
          Test Backend Connection
        </button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </header>
    </div>
  );
}

export default App;
