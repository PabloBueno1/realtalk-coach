import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  // Add other user properties as needed
}

interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextType {
  currentUser: User | null;
  sessions: Record<string, Session>;
  activeUserId: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: (userId?: string) => void;
  switchUser: (userId: string) => void;
  isAuthenticated: () => boolean;
  getActiveSession: () => Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Utility function to deduplicate sessions
  const deduplicateSessions = (userSessions: Record<string, Session>): Record<string, Session> => {
    // Create a map to track users by email
    const usersByEmail: Record<string, string> = {};
    const dedupedSessions: Record<string, Session> = {};
    
    // First pass: identify duplicates and keep the most recent session
    Object.entries(userSessions).forEach(([userId, session]) => {
      const email = session.user.email.toLowerCase();
      
      if (!usersByEmail[email]) {
        // First time seeing this email, record it
        usersByEmail[email] = userId;
        dedupedSessions[userId] = session;
      } else {
        // We've seen this email before - check which session to keep
        const existingUserId = usersByEmail[email];
        const existingSession = dedupedSessions[existingUserId];
        
        // If the new session has newer tokens, replace the existing one
        // This is a simple heuristic assuming newer tokens are better
        // You might want to add more logic based on token expiry if available
        dedupedSessions[existingUserId] = {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: existingSession.user
        };
      }
    });
    
    return dedupedSessions;
  };

  // Load sessions from localStorage on initialization
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('auth_sessions');
      const savedActiveUserId = localStorage.getItem('auth_active_user_id');
      
      if (savedSessions) {
        let parsedSessions = JSON.parse(savedSessions);
        
        // Check and clean up any duplicate user entries
        const dedupedSessions = deduplicateSessions(parsedSessions);
        
        // Only update localStorage if we actually removed duplicates
        if (Object.keys(dedupedSessions).length < Object.keys(parsedSessions).length) {
          parsedSessions = dedupedSessions;
          localStorage.setItem('auth_sessions', JSON.stringify(dedupedSessions));
        }
        
        setSessions(parsedSessions);
        
        if (savedActiveUserId && parsedSessions[savedActiveUserId]) {
          setActiveUserId(savedActiveUserId);
          setCurrentUser(parsedSessions[savedActiveUserId].user);
        } else if (Object.keys(parsedSessions).length > 0) {
          // If active user ID is invalid but we have sessions, set the first one as active
          const firstUserId = Object.keys(parsedSessions)[0];
          setActiveUserId(firstUserId);
          setCurrentUser(parsedSessions[firstUserId].user);
          localStorage.setItem('auth_active_user_id', firstUserId);
        }
      }
    } catch (error) {
      console.error('Error loading sessions from localStorage:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('auth_sessions');
      localStorage.removeItem('auth_active_user_id');
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(sessions).length > 0) {
      localStorage.setItem('auth_sessions', JSON.stringify(sessions));
    }
    
    if (activeUserId) {
      localStorage.setItem('auth_active_user_id', activeUserId);
    } else {
      localStorage.removeItem('auth_active_user_id');
    }
  }, [sessions, activeUserId]);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_sessions' && e.newValue) {
        try {
          const parsedSessions = JSON.parse(e.newValue);
          setSessions(parsedSessions);
        } catch (error) {
          console.error('Error parsing sessions from localStorage event:', error);
        }
      } else if (e.key === 'auth_active_user_id') {
        if (e.newValue && sessions[e.newValue]) {
          // Only update if user exists in our sessions
          setActiveUserId(e.newValue);
          setCurrentUser(sessions[e.newValue].user);
        } else if (!e.newValue) {
          // Handle logout from another tab
          setActiveUserId(null);
          setCurrentUser(null);
        }
      }
    };

    // Listen for the custom event when a token is updated programmatically
    const handleTokenUpdate = () => {
      // Force refresh API token references
      apiService.refreshToken();
      
      // If there's an active user, update their session with the new token
      if (activeUserId) {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (accessToken && sessions[activeUserId]) {
          const updatedSession = {
            ...sessions[activeUserId],
            accessToken,
            refreshToken: refreshToken || sessions[activeUserId].refreshToken
          };
          
          setSessions(prev => ({
            ...prev,
            [activeUserId]: updatedSession
          }));
        }
      }
    };
    
    // Handle invalid token event
    const handleInvalidToken = () => {
      if (activeUserId) {
        console.log('Handling invalid token event - logging out current user');
        logout(activeUserId);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth_token_updated', handleTokenUpdate);
    window.addEventListener('auth_token_invalid', handleInvalidToken);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth_token_updated', handleTokenUpdate);
      window.removeEventListener('auth_token_invalid', handleInvalidToken);
    };
  }, [sessions, activeUserId]); // Include sessions and activeUserId in dependencies

  const login = (accessToken: string, refreshToken: string, user: User) => {
    // Check if this user already exists in our sessions (by email or id)
    const existingUserEntry = Object.entries(sessions).find(([_, session]) => 
      session.user.email === user.email || session.user.id === user.id
    );

    if (existingUserEntry) {
      // User already exists, update their tokens and make them active
      const [existingUserId, existingSession] = existingUserEntry;
      
      // Update the session with new tokens
      const updatedSession: Session = {
        accessToken,
        refreshToken,
        user: {
          // Start with existing user properties
          ...existingSession.user,
          // Overwrite with new properties, but keep existingUserId
          ...user,
          // Force-keep existing ID to prevent duplicates
          id: existingSession.user.id
        }
      };
      
      setSessions(prev => ({
        ...prev,
        [existingUserId]: updatedSession
      }));
      
      setActiveUserId(existingUserId);
      setCurrentUser(updatedSession.user);
      
      // Update backward compatibility items
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(updatedSession.user));
      
      // Notify the API service about the token change
      apiService.refreshToken();
      
      return;
    }
    
    // If no existing session was found, create a new one
    const userId = user.id;
    const newSession: Session = {
      accessToken,
      refreshToken,
      user
    };
    
    setSessions(prev => ({
      ...prev,
      [userId]: newSession
    }));
    
    setActiveUserId(userId);
    setCurrentUser(user);
    
    // Keep backward compatibility with existing code
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Notify the API service about the token change
    apiService.refreshToken();
  };

  const logout = (userId?: string) => {
    if (userId) {
      // Log out specific user
      setSessions(prev => {
        const newSessions = { ...prev };
        delete newSessions[userId];
        return newSessions;
      });
      
      // If active user is logged out, clear active user
      if (activeUserId === userId) {
        setActiveUserId(null);
        setCurrentUser(null);
        
        // Clear backward compatibility items
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Notify the API service about the token change
        apiService.refreshToken();
      }
    } else {
      // Log out all users
      setSessions({});
      setActiveUserId(null);
      setCurrentUser(null);
      
      // Clear backward compatibility items
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      // Notify the API service about the token change
      apiService.refreshToken();
    }
  };

  const switchUser = (userId: string) => {
    if (sessions[userId]) {
      setActiveUserId(userId);
      setCurrentUser(sessions[userId].user);
      
      // Update backward compatibility items
      localStorage.setItem('access_token', sessions[userId].accessToken);
      localStorage.setItem('refresh_token', sessions[userId].refreshToken);
      localStorage.setItem('user', JSON.stringify(sessions[userId].user));
      
      // Notify the API service about the token change
      apiService.refreshToken();
    }
  };

  const isAuthenticated = () => {
    return activeUserId !== null && sessions[activeUserId!] !== undefined;
  };

  const getActiveSession = (): Session | null => {
    if (activeUserId && sessions[activeUserId]) {
      return sessions[activeUserId];
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        sessions,
        activeUserId,
        login,
        logout,
        switchUser,
        isAuthenticated,
        getActiveSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 