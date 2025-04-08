import React from 'react';
import { Navigate } from 'react-router-dom';

interface AuthRouteProps {
  children: React.ReactNode;
}

const AuthRoute: React.FC<AuthRouteProps> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('access_token') !== null;

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default AuthRoute; 