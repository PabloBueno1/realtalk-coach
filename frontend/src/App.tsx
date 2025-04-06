import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import ConversationPractice from './components/ConversationPractice';
import Chat from './components/Chat';
import ConversationAnalysis from './components/ConversationAnalysis';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing page route */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth routes */}
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          
          {/* Add route for the conversation practice page */}
          <Route path="/practice/:moduleId" element={<ConversationPractice />} />
          
          {/* Add route for the chat page */}
          <Route path="/chat" element={<Chat />} />
          
          {/* Add route for the conversation analysis page */}
          <Route path="/analysis" element={<ConversationAnalysis />} />
          
          {/* Redirect to landing page for unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
