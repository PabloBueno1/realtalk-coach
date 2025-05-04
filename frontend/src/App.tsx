import React, { lazy, Suspense } from 'react';
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
import ProfileSetup from './components/ProfileSetup';
import ProfilePreferences from './components/ProfilePreferences';
import Terms from './components/Legal/Terms';
import Privacy from './components/Legal/Privacy';
import Contact from './components/Legal/Contact';
import Mission from './components/Legal/Mission';
import { ThemeProvider } from './context/ThemeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { AuthProvider } from './context/AuthContext';

// Lazy load development tools to avoid including them in production bundle
const DevTools = lazy(() => import('./components/DevTools'));

// Lazy load AdminPage to avoid including components with expensive API calls
const AdminPage = lazy(() => import('./components/AdminPage'));

// Protected route that checks for profile setup
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthRoute>{children}</AuthRoute>;
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
  // Only include DevTools in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
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
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePreferences /></ProtectedRoute>} />
                <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
                <Route path="/practice/:moduleId" element={<ProtectedRoute><ConversationPractice /></ProtectedRoute>} />
                <Route path="/practice/analysis/:moduleId" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
                <Route path="/scores" element={<ProtectedRoute><Scores /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/analysis/:id" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
                <Route path="/conversation-analysis/:id" element={<ProtectedRoute><ConversationAnalysis /></ProtectedRoute>} />
                
                {/* Admin routes - lazy loaded */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Suspense fallback={<div>Loading admin panel...</div>}>
                      <AdminPage />
                    </Suspense>
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Redirect to home for unknown routes */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            
            {/* Development Tools - only included in development mode */}
            {isDevelopment && (
              <Suspense fallback={null}>
                <DevTools position="bottom-right" monitoringInterval={15000} />
              </Suspense>
            )}
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
