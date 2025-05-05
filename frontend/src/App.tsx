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
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import AuthRoute from './components/AuthRoute';
import PrivateRoute from './components/PrivateRoute';
import ProfileSetup from './components/ProfileSetup';
import ProfilePreferences from './components/ProfilePreferences';
import Terms from './components/Legal/Terms';
import Privacy from './components/Legal/Privacy';
import Contact from './components/Legal/Contact';
import Mission from './components/Legal/Mission';
import { ThemeProvider } from './context/ThemeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { AuthProvider } from './context/AuthContext';

// Wrapper component for protected routes with UserPreferencesProvider
const ProtectedRoutes: React.FC = () => {
  return (
    <UserPreferencesProvider>
      <Outlet />
    </UserPreferencesProvider>
  );
};

// Check if user needs profile setup
const needsProfileSetup = () => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const userData = JSON.parse(user);
  return !userData.hasCompletedSetup;
};

// Custom route that checks for profile setup after authentication
const ProfileCheckRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (needsProfileSetup() && window.location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
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
                <Route path="/home" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <Home />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/profile" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <ProfilePreferences />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/profile-setup" element={
                  <PrivateRoute>
                    <ProfileSetup />
                  </PrivateRoute>
                } />
                <Route path="/practice/:moduleId" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <ConversationPractice />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/practice/analysis/:moduleId" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <ConversationAnalysis />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/scores" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <Scores />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <Dashboard />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/analysis/:id" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <Analysis />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
                <Route path="/conversation-analysis/:id" element={
                  <PrivateRoute>
                    <ProfileCheckRoute>
                      <ConversationAnalysis />
                    </ProfileCheckRoute>
                  </PrivateRoute>
                } />
              </Route>
              
              {/* Redirect to home for unknown routes */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
