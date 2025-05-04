import React, { useState, useEffect, useCallback } from 'react';
import { useDevAuth } from '../services/auth';
import { useUserStore } from '../store/userStore';
import apiService from '../services/api';
import type { User } from '../services/auth';

interface UserSwitcherProps {
  className?: string;
  showAdminOnly?: boolean;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ 
  className = '', 
  showAdminOnly = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Get users from global store instead of fetching directly
  const { users, loading, fetchUsers } = useUserStore();
  
  const { 
    currentUser, 
    sessions, 
    switchToUser, 
    logout, 
    authenticateDevUser
  } = useDevAuth();
  
  // Fetch available users when component mounts or when showAdminOnly changes
  useEffect(() => {
    console.log('UserSwitcher: Fetching users via global store');
    fetchUsers().catch(err => {
      console.error('Error fetching users:', err);
      setError('Failed to load available users');
    });
  }, [fetchUsers]);
  
  // Filter users based on showAdminOnly prop
  useEffect(() => {
    if (showAdminOnly) {
      setFilteredUsers(users.filter(user => user.role === 'admin'));
    } else {
      setFilteredUsers(users);
    }
  }, [users, showAdminOnly]);

  // Enhanced user switching with error handling and token sync
  const handleUserSwitch = useCallback(async (userId: string) => {
    setError(null);
    try {
      switchToUser(userId);
      
      // Force API service to refresh token
      apiService.refreshToken();
      
      // Make a test request to verify token works
      const response = await apiService.get('/auth/me');
      if (response.status !== 200) {
        throw new Error('Failed to validate user token');
      }
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error switching user:', err);
      setError('Failed to switch user. Try authenticating again.');
    }
  }, [switchToUser]);
  
  // Enhanced authentication with better error handling
  const handleUserAuth = useCallback(async (userId: string) => {
    setError(null);
    try {
      const success = await authenticateDevUser(userId);
      
      if (!success) {
        throw new Error('Authentication failed');
      }
      
      // Force API service to refresh token
      apiService.refreshToken();
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error authenticating user:', err);
      setError('Failed to authenticate user. Please try again.');
    }
  }, [authenticateDevUser]);
  
  const handleLogout = useCallback(() => {
    setError(null);
    logout();
    setIsOpen(false);
  }, [logout]);
  
  const toggleDropdown = () => setIsOpen(!isOpen);
  
  // Clear error when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);
  
  // Render nothing if no current user
  if (!currentUser) {
    return null;
  }
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
        disabled={loading}
        tabIndex={0}
        aria-label="Switch user"
        onKeyDown={(e) => e.key === 'Enter' && toggleDropdown()}
      >
        <span className="truncate max-w-[150px]">
          {currentUser.name || currentUser.email}
        </span>
        <svg 
          className="w-5 h-5 text-gray-400" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 z-10 mt-1 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
        >
          {error && (
            <div className="px-4 py-2 text-xs text-red-500 border-b border-red-100 bg-red-50">
              {error}
            </div>
          )}
          
          <div className="py-1">
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
              Authenticated Users
            </div>
            
            {/* Current session users */}
            {Object.entries(sessions).length > 0 ? (
              Object.entries(sessions).map(([userId, session]) => (
                <button
                  key={userId}
                  onClick={() => handleUserSwitch(userId)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    userId === currentUser.id
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="menuitem"
                  tabIndex={0}
                  aria-label={`Switch to ${session.user.name || session.user.email}`}
                  onKeyDown={(e) => e.key === 'Enter' && handleUserSwitch(userId)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2">
                      {(session.user.name || session.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{session.user.name || 'User'}</div>
                      <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No authenticated users</div>
            )}
            
            {/* Available users that aren't in current sessions */}
            {filteredUsers.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                  Available Users
                </div>
                {filteredUsers
                  .filter(user => !Object.values(sessions).some(session => session.user.id === user.id))
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserAuth(user.id)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      role="menuitem"
                      tabIndex={0}
                      aria-label={`Authenticate as ${user.name || user.email}`}
                      onKeyDown={(e) => e.key === 'Enter' && handleUserAuth(user.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center mr-2">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'User'}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
              </>
            )}
            
            <div className="border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                role="menuitem"
                tabIndex={0}
                aria-label="Sign out"
                onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSwitcher; 