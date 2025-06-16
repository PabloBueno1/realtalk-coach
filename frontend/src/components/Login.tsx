import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import welcomeLogo from '../assets/logo/whitewelcome.svg';
import mainLogo from '../assets/logo/logo.svg';
import Google from '@mui/icons-material/Google';
import GitHub from '@mui/icons-material/GitHub';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { signIn, session } = useAuth();
  const location = useLocation();

  // Check for existing session and redirect if found
  useEffect(() => {
    if (session) {
      // Check if user has completed profile setup
      const checkProfileSetup = async () => {
        try {
          const { data: profilePreferences } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', session.user.id)
            .single();

          if (!profilePreferences?.preferences || Object.keys(profilePreferences.preferences).length === 0) {
            navigate('/profile-setup');
          } else {
            navigate('/home');
          }
        } catch (error) {
          console.error('Error checking profile setup:', error);
          navigate('/home');
        }
      };

      checkProfileSetup();
    }
  }, [session, navigate]);

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setErrorMessage(
        error.message || `Error logging in with ${provider}. Please try again.`
      );
      setShowMessage(true);
    }
  };

  // useEffect to handle OAuth provider from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const provider = queryParams.get('provider');

    if (provider === 'google' || provider === 'github') {
      handleSocialLogin(provider);
      // Optional: Clear the provider from URL to prevent re-triggering on refresh/back
      // navigate('/login', { replace: true }); 
      // For now, let Supabase redirects handle this. If issues arise, we can uncomment.
    }
  }, [location.search]); // Rerun if search params change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowMessage(false);
    setErrorMessage('');
    setSuccessMessage('');
    

    try {
      const { data, error } = await signIn({ email, password });
      if (error) throw error;

      // After successful login, check if profile exists
      const user = data.user;
      if (!user) throw new Error('User not found after login');
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileFetchError && profileFetchError.code !== 'PGRST116') {
        throw profileFetchError;
      }
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: '',
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            preferences: {},
            tier: 'free',
            monthly_tokens: 5
          });
        if (insertError) throw insertError;
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify({
        email: email
      }));

      setSuccessMessage('Login successful!');
      setShowMessage(true);
      
      // Check if profile preferences are empty
      const { data: profilePreferences } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();

      // Redirect based on whether preferences are empty
      if (!profilePreferences?.preferences || Object.keys(profilePreferences.preferences).length === 0) {
        navigate('/profile-setup');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      setErrorMessage(
        error.message || 'Error logging in. Please try again.'
      );
      setShowMessage(true);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Right form section (now on left) */}
      <div className="w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 px-4 rounded-lg transition-colors"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back</span>
        </button>
        <div className="w-full max-w-md">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 sm:mb-6 md:mb-8 text-gray-800">Sign In</h2>
          
          {showMessage && (
            <div className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded text-sm ${
              successMessage ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {successMessage || errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full px-3 py-2 border-b border-gray-300 focus:border-green-500 outline-none transition-colors"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-3 py-2 border-b border-gray-300 focus:border-green-500 outline-none transition-colors"
              />
              <div className="mt-1 text-right">
                <span 
                  onClick={() => navigate('/reset-password')}
                  className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
                >
                  Forgot password?
                </span>
              </div>
            </div>

            <div className="flex justify-start">
              <button 
                type="submit"
                className="bg-green-500 text-white text-sm py-2 px-6 rounded-xl hover:bg-green-600 transition-colors"
              >
                Sign In
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Sign in with Google</span>
                  <Google className="w-5 h-5" />
                </button>
              </div>

              <div>
                <button
                  onClick={() => handleSocialLogin('github')}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Sign in with GitHub</span>
                  <GitHub className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-right">
            <span 
              onClick={() => navigate('/signup')}
              className="text-[#235390] text-sm cursor-pointer hover:text-[#1a3d6b] transition-colors"
            >
              Sign up →
            </span>
          </div>
        </div>
      </div>

      {/* Left section (now on right) */}
      <div className="w-1/2 bg-[#235390] flex flex-col items-center justify-between p-4 sm:p-6 md:p-8 lg:p-12 text-white relative">
        {/* Logo Section */}
        <div className="w-full flex justify-center items-center">
          <img 
            src={welcomeLogo} 
            alt="RealTalk Coach Logo" 
            className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto"
          />
        </div>

        {/* Center Content */}
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6 md:space-y-8 max-w-md -mt-[20vh]">
          <p className="text-base sm:text-lg md:text-xl opacity-90">
            <TypewriterEffect />
          </p>
        </div>

        {/* Bottom text */}
        <div className="text-center">
          <div className="mt-4 text-xs opacity-75 flex justify-center space-x-4">
            <a href="/terms" className="hover:text-white hover:underline">Terms</a>
            <a href="/privacy" className="hover:text-white hover:underline">Privacy</a>
            <a href="/contact" className="hover:text-white hover:underline">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
};

// TypewriterEffect component
const TypewriterEffect: React.FC = () => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentQuote, setCurrentQuote] = useState('');
  
  // Quotes from typewriter.txt
  const quotes = [
    "Master difficult workplace conversations.",
    "Navigate family gatherings with grace.",
    "Communicate effectively with your team.",
    "Ask for a raise with confidence.",
    "Connect meaningfully at industry conferences.",
    "Handle criticism constructively.",
    "Express disagreement respectfully.",
    "Turn small talk into memorable conversations.",
    "Speak with authority in meetings.",
    "Build rapport with clients instantly.",
    "Resolve conflicts through effective dialogue.",
    "Share feedback that inspires growth.",
    "Command attention when you speak.",
    "Tell compelling stories that captivate.",
    "Negotiate win-win outcomes.",
    "Make your ideas heard in group settings.",
    "Create trust through authentic communication.",
    "Speak clearly under pressure.",
    "Handle tough questions with poise.",
    "Leave lasting impressions in brief encounters.",
    "Every great conversation starts with genuine curiosity.",
    "You already have the power to connect deeply with others—our app helps you unlock it.",
    "Small shifts in how you listen can transform your conversations. Start your journey now.",
    "Communication mastery isn't born, it's built—one conversation at a time.",
    "Confidence in conversation comes from practice, not perfection. Take the first step today.",
    "Great communicators aren't born—they're made through consistent small improvements.",
    "The path to better relationships starts with better conversations. Begin your growth today.",
    "Better conversations create better opportunities. Start building your communication skills now.",
    "Everyone remembers how you made them feel. Learn to create meaningful connections.",
    "Your words can open doors. Master the art of conversation and watch possibilities unfold.",
    "Communication isn't just what you say—it's how you listen. Develop both skills and transform your interactions.",
    "The difference between good and great often comes down to how well you communicate. Elevate your conversations today.",
    "Small changes in how you communicate can yield extraordinary results in every area of life."
  ];
  
  // Get a random quote that isn't the current one
  const getRandomQuote = useCallback(() => {
    if (quotes.length <= 1) return quotes[0];
    
    let newQuote;
    do {
      newQuote = quotes[Math.floor(Math.random() * quotes.length)];
    } while (newQuote === currentQuote);
    
    return newQuote;
  }, [quotes, currentQuote]);
  
  // Select initial quote
  useEffect(() => {
    if (!currentQuote) {
      setCurrentQuote(getRandomQuote());
    }
  }, [currentQuote, getRandomQuote]);
  
  useEffect(() => {
    if (currentIndex < currentQuote.length) {
      // Type the current character
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + currentQuote[currentIndex]);
        setCurrentIndex(currentIndex + 1);
      }, 50);
      
      return () => clearTimeout(timeout);
    } else {
      // Current quote is complete, pause before moving to the next one
      const pauseTimeout = setTimeout(() => {
        setDisplayText('');
        setCurrentIndex(0);
        setCurrentQuote(getRandomQuote());
      }, 3000);
      
      return () => clearTimeout(pauseTimeout);
    }
  }, [currentIndex, currentQuote, getRandomQuote]);
  
  return <span className="font-medium">{displayText}</span>;
};

export default Login;