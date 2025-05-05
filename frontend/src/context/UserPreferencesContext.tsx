import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Default preferences for new users
const DEFAULT_PREFERENCES: UserPreferences = {
  learningGoals: [],
  preferredScenarios: [],
  practiceFrequency: 'weekly',
  notifications: true,
  avatar: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  gender: ''
};

const API_URL = process.env.REACT_APP_API_URL;

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
  const [preferences, setPreferences] = useState<UserPreferences | null>(getCachedPreferences() || DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(!preferences);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!session) {
        navigate('/login');
        return;
      }

      try {
        // Using Supabase client to get user preferences
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('preferences')
          .eq('id', session.user.id)
          .single();

        if (fetchError) {
          // Handle case where user doesn't exist in profiles table
          if (fetchError.code === 'PGRST116') {
            // No profile found for this user, use default preferences
            setPreferences(DEFAULT_PREFERENCES);
            setCachedPreferences(DEFAULT_PREFERENCES);

            // Optionally create user profile with default preferences
            try {
              await supabase.from('profiles').insert({
                id: session.user.id,
                preferences: DEFAULT_PREFERENCES
              });
            } catch (insertError) {
              console.error('Error creating user profile:', insertError);
            }
            return;
          }
          throw fetchError;
        }

        if (data && data.preferences && Object.keys(data.preferences).length > 0) {
          // Extract preferences from the preferences column
          setPreferences(data.preferences);
          setCachedPreferences(data.preferences);
        } else {
          // Fallback to defaults if preferences is empty or undefined
          setPreferences(DEFAULT_PREFERENCES);
          setCachedPreferences(DEFAULT_PREFERENCES);
          
          // Update the profile with default preferences if preferences is empty
          try {
            await supabase
              .from('profiles')
              .update({ preferences: DEFAULT_PREFERENCES })
              .eq('id', session.user.id);
          } catch (updateError) {
            console.error('Error updating preferences:', updateError);
          }
        }
      } catch (error: any) {
        console.error('Database error:', error);
        // Fallback to default preferences when there's an error
        setPreferences(DEFAULT_PREFERENCES);
        setCachedPreferences(DEFAULT_PREFERENCES);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      setError('Failed to load user preferences');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch preferences whenever session changes
    if (session) {
      fetchPreferences();
    }
  }, [session]);

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