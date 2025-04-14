import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import ConversationAnalysis from './components/ConversationAnalysis';
import Scores from './components/Scores';
import Analysis from './components/Analysis';
import AuthRoute from './components/AuthRoute';
import ConversationPractice from './components/ConversationPractice';
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
          
          {/* Protected routes */}
          <Route path="/home" element={<AuthRoute><Home /></AuthRoute>} />
          <Route path="/practice/:moduleId" element={<AuthRoute><ConversationPractice /></AuthRoute>} />
          <Route path="/practice/analysis/:moduleId" element={<AuthRoute><ConversationAnalysis /></AuthRoute>} />
          <Route path="/scores" element={<AuthRoute><Scores /></AuthRoute>} />
          <Route path="/analysis/:id" element={<AuthRoute><Analysis /></AuthRoute>} />
          
          {/* Redirect to home for unknown routes */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
