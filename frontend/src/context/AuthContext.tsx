import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signUp: (data: { 
    email: string; 
    password: string; 
    options?: { 
      data?: Record<string, any> 
    } 
  }) => Promise<any>;
  signIn: (data: { email: string; password: string }) => Promise<any>;
  signOut: () => Promise<any>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up the listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Cleanup on unmount
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user,
    loading,
    signUp: async (data: { 
      email: string; 
      password: string; 
      options?: { 
        data?: Record<string, any> 
      } 
    }) => {
      console.log('AuthContext: Starting signUp process');
      const { data: responseData, error } = await supabase.auth.signUp(data);
      console.log('AuthContext: Supabase response:', { data: responseData, error });
      
      if (error) {
        console.log('AuthContext: Error detected:', error);
        throw error;
      }
      return { data: responseData, error: null };
    },
    signIn: (data: { email: string; password: string }) => supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 