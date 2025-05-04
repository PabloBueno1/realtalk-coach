import apiService from './api';
import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

// Cache variables for fetchUsers
let cachedUsers: User[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10000; // 10 seconds

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/login', {
      email,
      password
    });
    
    if (response.status !== 200 || !response.data.session) {
      throw new Error(response.message || 'Login failed');
    }
    
    // Clear any user caches - will be updated via store in the hook
    this.clearUsersCache();
    
    return response.data;
  }
  
  async signup(userData: { email: string; password: string; full_name: string }): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>('/auth/signup', userData);
    
    if (response.status !== 200) {
      throw new Error(response.message || 'Signup failed');
    }
    
    return response.data;
  }
  
  async signout(): Promise<void> {
    await apiService.post('/auth/signout');
    
    // Clear the users cache when authentication state changes
    this.clearUsersCache();
  }
  
  async fetchUsers(): Promise<User[]> {
    // Use throttled version to prevent excessive calls
    const response = await apiService.throttledGet<User[]>('/auth/dev/users', 10000);
    
    if (response.status !== 200) {
      throw new Error(response.message || 'Failed to fetch users');
    }
    
    return response.data;
  }
  
  async generateDevToken(userId: string): Promise<{ 
    access_token: string;
    refresh_token: string;
    user: User;
  }> {
    // This endpoint would be dev-only for generating tokens without password auth
    const response = await apiService.post(`/auth/dev/token/${userId}`);
    
    if (response.status !== 200) {
      throw new Error(response.message || 'Failed to generate dev token');
    }
    
    // Clear the users cache when authentication state changes
    this.clearUsersCache();
    
    return response.data;
  }
  
  // Clear users cache (call this after authentication operations that might change user data)
  clearUsersCache(): void {
    cachedUsers = null;
    lastFetchTime = 0;
    
    // We'll import userStore dynamically to avoid circular dependency
    try {
      // This dynamic import avoids circular dependency at runtime
      // We only need this when clearing the cache, not during normal operation
      import('../store/userStore').then(module => {
        module.useUserStore.getState().clearCache();
      }).catch(err => {
        console.error('Failed to clear userStore cache:', err);
      });
    } catch (err) {
      console.error('Error clearing user cache:', err);
    }
  }
}

export const authService = new AuthService();

// Hook to manage dev-only user switching
export const useDevAuth = () => {
  const auth = useAuth();
  
  // We'll import userStore in the hook to avoid circular dependency
  const userStore = (() => {
    try {
      // Using require to avoid ESM import issues
      return require('../store/userStore').useUserStore;
    } catch (err) {
      console.error('Failed to load userStore:', err);
      return { getState: () => ({ users: [], loading: false, fetchUsers: async () => [] }) };
    }
  })();
  
  // Use the store values - this avoids rendering issues with using hooks conditionally
  const storeState = userStore.getState();
  const { users, loading } = storeState;
  const fetchUsers = storeState.fetchUsers;
  
  // Memoize the authenticateDevUser function with useCallback
  const authenticateDevUser = useCallback(async (userId: string) => {
    try {
      // Get tokens for this user
      const { access_token, refresh_token, user } = await authService.generateDevToken(userId);
      
      // Add to auth context
      auth.login(access_token, refresh_token, user);
      
      // Clear users cache since authentication state changed
      authService.clearUsersCache();
      
      return true;
    } catch (error) {
      console.error('Error authenticating dev user:', error);
      return false;
    }
  }, [auth]);
  
  return {
    authenticateDevUser,
    fetchAvailableUsers: fetchUsers,
    availableUsers: users, 
    isLoadingUsers: loading,
    switchToUser: auth.switchUser,
    logout: auth.logout,
    sessions: auth.sessions,
    activeUserId: auth.activeUserId,
    currentUser: auth.currentUser,
  };
};

export default authService; 