import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // Define subscription tiers and their token allocations
  const subscriptionTiers = {
    'free': { tokens: 5, name: 'Free' },
    'pro': { tokens: 20, name: 'Pro' }
  };

  useEffect(() => {
    // Only run the payment check if session and session.user are available
    if (!session || !session.user) {
      // Keep loading until session is ready
      return;
    }

    const handlePaymentSuccess = async () => {
      try {
        // Since Stripe only redirects on success, we can assume payment was successful
        // Get subscription tier from URL params (default to 'pro' if not specified)
        const tier = searchParams.get('tier') || 'pro';
        const tokens = subscriptionTiers[tier as keyof typeof subscriptionTiers]?.tokens || 20;

        // Check if user profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          setStatus('error');
          setMessage('Failed to verify your account. Please contact support.');
          return;
        }

        // Helper function to create user profile
        const createUserProfile = async (tier: string, tokens: number) => {
          return await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            preferences: {},
            tier: tier,
            monthly_tokens: tokens,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          });
        };

        // Helper function to update user subscription
        const updateUserSubscription = async (tier: string, tokens: number) => {
          return await supabase
            .from('profiles')
            .update({
              tier: tier,
              monthly_tokens: tokens
            })
            .eq('id', session.user.id);
        };

        // If profile doesn't exist, create one
        if (!existingProfile) {
          const { error: createError } = await createUserProfile(tier, tokens);
          if (createError) {
            setStatus('error');
            setMessage('Failed to create your account. Please contact support.');
            return;
          }
        } else {
          // Update existing profile to the appropriate tier
          const { error: updateError } = await updateUserSubscription(tier, tokens);
          if (updateError) {
            setStatus('error');
            setMessage('Failed to upgrade your account. Please contact support.');
            return;
          }
        }

        setStatus('success');
        setMessage(`Your account has been successfully upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);

        // Redirect to home after 3 seconds
        setTimeout(() => {
          navigate('/home');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please contact support.');
      }
    };

    handlePaymentSuccess();
  }, [session, searchParams, navigate]);

  // Status icon for loading (neutral blue)
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />;
    }
  };

  // Card border color
  const cardBorderColor =
    status === 'success' ? 'border-green-500' :
    status === 'error' ? 'border-red-500' :
    'border-blue-500';

  // Heading color
  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e8f5e9] via-[#f3f8fd] to-[#e3eafc] flex items-center justify-center px-4">
      <div className={`max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 pt-6 text-center border-t-8 ${cardBorderColor}`}>
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src={require('../assets/logo/logo.svg').default} alt="Logo" className="h-10 w-auto" />
        </div>
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>
        {/* Heading */}
        <h1 className={`text-2xl md:text-3xl font-extrabold mb-2 tracking-tight ${getStatusColor()}`}
          style={{ fontFamily: 'inherit' }}>
          {status === 'loading' && 'Processing Your Payment...'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'error' && 'Payment Error'}
        </h1>
        {/* Message */}
        <p className="text-gray-600 mb-6 text-base md:text-lg">
          {message}
        </p>
        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2 text-lg">Welcome to Pro!</h3>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Your account has been upgraded</li>
                <li>• You now have access to more practice sessions</li>
                <li>• Redirecting you to the dashboard...</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-bold flex items-center justify-center space-x-2 shadow-md"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col items-center">
              <XCircle className="w-12 h-12 text-red-500 mb-2" />
              <h3 className="font-semibold text-red-800 mb-2 text-lg">Payment Error</h3>
              <p className="text-sm text-red-700 mb-2">{message}</p>
              <p className="text-sm text-red-700 mb-2">If you believe this is an error, please contact our support team.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/home')}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-700 text-white py-2 px-4 rounded-lg hover:from-gray-600 hover:to-gray-800 transition-all font-bold shadow-md"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.open('mailto:support@realtalkcoach.com', '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-800 transition-all font-bold shadow-md"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
        {/* Loading State */}
        {status === 'loading' && (
          <div className="space-y-2">
            <div className="text-sm text-blue-600 font-semibold">
              Please wait while we process your subscription...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess; 