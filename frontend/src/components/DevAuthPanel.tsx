import React, { useState, useEffect } from 'react';
import { useDevAuth } from '../services/auth';
import { useUserStore } from '../store/userStore';
import type { User } from '../services/auth';

interface DevAuthPanelProps {
  className?: string;
}

const DevAuthPanel: React.FC<DevAuthPanelProps> = ({ className = '' }) => {
  const [error, setError] = useState<string | null>(null);
  
  // Get users and loading state from global store
  const { users, loading, fetchUsers } = useUserStore();
  
  const { 
    currentUser, 
    sessions, 
    switchToUser, 
    logout, 
    authenticateDevUser
  } = useDevAuth();
  
  // Fetch users once on mount
  useEffect(() => {
    console.log('DevAuthPanel: Fetching users via global store');
    fetchUsers().catch(err => {
      setError('Failed to load users. Make sure you are running in development mode and the backend is accessible.');
      console.error('Error loading users:', err);
    });
  }, [fetchUsers]);
  
  const handleRefresh = () => {
    setError(null);
    // Clear cache and fetch fresh data
    useUserStore.getState().clearCache();
    fetchUsers().catch(err => {
      setError('Failed to load users. Make sure you are running in development mode and the backend is accessible.');
      console.error('Error loading users:', err);
    });
  };
  
  const handleAuthenticate = async (userId: string) => {
    setError(null);
    
    try {
      const success = await authenticateDevUser(userId);
      if (!success) {
        setError('Failed to authenticate user');
      }
    } catch (err) {
      setError('Authentication failed');
      console.error('Error authenticating user:', err);
    }
  };
  
  const handleSwitch = (userId: string) => {
    switchToUser(userId);
  };
  
  const handleLogout = (userId: string) => {
    logout(userId);
  };
  
  const isAuthenticated = (userId: string) => {
    return Object.keys(sessions).includes(userId);
  };
  
  const isCurrentUser = (userId: string) => {
    return currentUser?.id === userId;
  };
  
  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 bg-blue-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-blue-900">Development User Authentication</h2>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
            aria-label="Refresh users"
            tabIndex={0}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <p className="mt-1 text-sm text-blue-600">
          This panel is for development purposes only. Authenticate as any user without password.
        </p>
        
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
      
      <div className="divide-y divide-gray-200">
        {loading && users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No users available</div>
        ) : (
          users.map(user => (
            <div 
              key={user.id} 
              className={`p-4 ${isCurrentUser(user.id) ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{user.name || 'User'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.role && (
                      <div className="text-xs text-gray-500">Role: {user.role}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {!isAuthenticated(user.id) ? (
                    <button
                      onClick={() => handleAuthenticate(user.id)}
                      className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      disabled={loading}
                      tabIndex={0}
                      aria-label={`Authenticate as ${user.name || user.email}`}
                    >
                      Authenticate
                    </button>
                  ) : !isCurrentUser(user.id) ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSwitch(user.id)}
                        className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        tabIndex={0}
                        aria-label={`Switch to ${user.name || user.email}`}
                      >
                        Switch
                      </button>
                      <button
                        onClick={() => handleLogout(user.id)}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        tabIndex={0}
                        aria-label={`Remove ${user.name || user.email}`}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
                      Current User
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DevAuthPanel; 