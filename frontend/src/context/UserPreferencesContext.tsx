import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface UserPreferences {
  learningGoals: string[];
  preferredScenarios: string[];
  practiceFrequency: string;
  notifications: boolean;
  avatar: string;
  timezone: string;
  gender: string;
}

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  error: string | null;
  refreshPreferences: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const PREFERENCES_CACHE_KEY = 'user_preferences_cache';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

interface CachedPreferences {
  data: UserPreferences;
  timestamp: number;
}

const getCachedPreferences = (): UserPreferences | null => {
  const cached = localStorage.getItem(PREFERENCES_CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp }: CachedPreferences = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(PREFERENCES_CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error parsing cached preferences:', error);
    localStorage.removeItem(PREFERENCES_CACHE_KEY);
    return null;
  }
};

const setCachedPreferences = (preferences: UserPreferences) => {
  const cache: CachedPreferences = {
    data: preferences,
    timestamp: Date.now()
  };
  localStorage.setItem(PREFERENCES_CACHE_KEY, JSON.stringify(cache));
};

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(getCachedPreferences());
  const [isLoading, setIsLoading] = useState(!preferences);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:8000/auth/profile/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.preferences) {
        setPreferences(response.data.preferences);
        setCachedPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      setError('Failed to load user preferences');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we don't have cached preferences
    if (!preferences) {
      fetchPreferences();
    }
  }, [navigate]);

  const refreshPreferences = async () => {
    await fetchPreferences();
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, isLoading, error, refreshPreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}; 