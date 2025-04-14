import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import ConversationPractice from './components/ConversationPractice';
import ConversationAnalysis from './components/ConversationAnalysis';
import Scores from './components/Scores';
import Analysis from './components/Analysis';
import AuthRoute from './components/AuthRoute';
import ProfileSetup from './components/ProfileSetup';
import ProfilePreferences from './components/ProfilePreferences';
import { ThemeProvider } from './context/ThemeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';

// Check if user needs profile setup
const needsProfileSetup = () => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const userData = JSON.parse(user);
  return !userData.hasCompletedSetup;
};

// Protected route that checks for profile setup
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!localStorage.getItem('access_token')) {
    return <Navigate to="/login" replace />;
  }
  
  if (needsProfileSetup() && window.location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <UserPreferencesProvider>
          <div className="App">
            <Routes>
              {/* Landing page route */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth routes */}
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
              
              {/* Protected routes */}
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePreferences /></ProtectedRoute>} />
              <Route path="/practice/:moduleId" element={<ProtectedRoute><ConversationPractice /></ProtectedRoute>} />
              <Route path="/practice/analysis/:moduleId" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
              <Route path="/scores" element={<ProtectedRoute><Scores /></ProtectedRoute>} />
              <Route path="/analysis/:id" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
              <Route path="/conversation-analysis/:id" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
              
              {/* Redirect to home for unknown routes */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </UserPreferencesProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
