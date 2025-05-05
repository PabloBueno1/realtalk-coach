import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return session ? <>{children}</> : <Navigate to="/login" />;
};

export default PrivateRoute; 