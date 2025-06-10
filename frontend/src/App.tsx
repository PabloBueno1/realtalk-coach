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
import ResetPassword from './components/ResetPassword';
import UpdatePassword from './components/UpdatePassword';
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

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/home" element={<AuthRoute><Home /></AuthRoute>} />
              <Route path="/profile-setup" element={<AuthRoute><ProfileSetup /></AuthRoute>} />
              <Route path="/profile-preferences" element={<AuthRoute><ProfilePreferences /></AuthRoute>} />
              <Route path="/conversation-practice" element={<AuthRoute><ConversationPractice /></AuthRoute>} />
              <Route path="/conversation-analysis" element={<AuthRoute><ConversationAnalysis /></AuthRoute>} />
              <Route path="/scores" element={<AuthRoute><Scores /></AuthRoute>} />
              <Route path="/dashboard" element={<AuthRoute><Dashboard /></AuthRoute>} />
              <Route path="/analysis" element={<AuthRoute><Analysis /></AuthRoute>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
