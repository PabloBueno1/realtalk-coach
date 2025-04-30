import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Home from './components/Home';
import LandingPage from './components/LandingPage';
import ComingSoon from './components/ComingSoon';
import ConversationPractice from './components/ConversationPractice';
import ConversationAnalysis from './components/ConversationAnalysis';
import Scores from './components/Scores';
import Progress from './components/Progress';
import Analysis from './components/Analysis';
import AuthRoute from './components/AuthRoute';
import ProfileSetup from './components/ProfileSetup';
import ProfilePreferences from './components/ProfilePreferences';
import Terms from './components/Legal/Terms';
import Privacy from './components/Legal/Privacy';
import Contact from './components/Legal/Contact';
import Mission from './components/Legal/Mission';
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
  const accessToken = localStorage.getItem('access_token');
  
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Check if token is expired
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        // Token is expired, clear it and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
      }
    }
  } catch (error) {
    // If there's any error parsing the token, treat it as invalid
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
  
  if (needsProfileSetup() && window.location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

// Wrapper component for protected routes with UserPreferencesProvider
const ProtectedRoutes: React.FC = () => {
  return (
    <UserPreferencesProvider>
      <Outlet />
    </UserPreferencesProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/mission" element={<Mission />} />
            
            {/* Protected routes with UserPreferencesProvider */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePreferences /></ProtectedRoute>} />
              <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
              <Route path="/practice/:moduleId" element={<ProtectedRoute><ConversationPractice /></ProtectedRoute>} />
              <Route path="/practice/analysis/:moduleId" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
              <Route path="/scores" element={<ProtectedRoute><Scores /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
              <Route path="/analysis/:id" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
              <Route path="/conversation-analysis/:id" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
            </Route>
            
            {/* Redirect to home for unknown routes */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
};

export default App;
