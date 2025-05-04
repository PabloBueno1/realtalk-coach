import { create } from 'zustand';
import type { User } from '../services/auth';
// Import apiService directly to avoid circular dependency
import apiService from '../services/api';

// Fallback data for development to reduce API calls during initial testing
const FALLBACK_USERS: User[] = [
  { id: 'dev1', name: 'Developer 1', email: 'dev1@example.com', role: 'admin' },
  { id: 'dev2', name: 'Developer 2', email: 'dev2@example.com', role: 'user' },
  { id: 'dev3', name: 'Developer 3', email: 'dev3@example.com', role: 'user' },
];

let fetching = false;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

interface UserStore {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<User[]>;
  clearCache: () => void;
  getUsers: () => User[];
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    // Skip if already fetching or cache is fresh
    if (fetching) {
      console.log('UserStore: Already fetching users, returning cached data');
      return get().users;
    }
    
    if (Date.now() - lastFetchTime < CACHE_DURATION && get().users.length > 0) {
      console.log('UserStore: Using cached user data');
      return get().users;
    }
    
    console.log('UserStore: Fetching fresh user data');
    fetching = true;
    set({ loading: true, error: null });
    
    try {
      // Use the API service directly to avoid circular dependency
      const response = await apiService.throttledGet<User[]>('/auth/dev/users', 10000);
      
      if (response.status !== 200 || !response.data) {
        throw new Error(response.message || 'Failed to fetch users');
      }
      
      const users = response.data;
      set({ users, loading: false });
      lastFetchTime = Date.now();
      return users;
    } catch (error) {
      console.error('UserStore: Error fetching users:', error);
      
      // If we fail to fetch and have no cached users, use fallback data
      if (get().users.length === 0) {
        console.log('UserStore: Using fallback user data');
        set({ 
          users: FALLBACK_USERS,
          loading: false,
          error: 'Using fallback data due to API error'
        });
        return FALLBACK_USERS;
      }
      
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch users' 
      });
      return get().users;
    } finally {
      fetching = false;
    }
  },

  clearCache: () => {
    lastFetchTime = 0;
  },
  
  // Convenience getter that doesn't trigger a fetch
  getUsers: () => {
    return get().users;
  }
})); 