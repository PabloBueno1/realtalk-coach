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
    const handlePaymentSuccess = async () => {
      try {
        // Check if user is logged in
        if (!session?.user) {
          setStatus('error');
          setMessage('Please log in to complete your subscription upgrade.');
          return;
        }

        // Check if payment was successful
        const paid = searchParams.get('paid');
        if (paid !== 'true') {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
          return;
        }

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
          console.error('Error fetching profile:', fetchError);
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
            console.error('Error creating profile:', createError);
            setStatus('error');
            setMessage('Failed to create your account. Please contact support.');
            return;
          }
        } else {
          // Update existing profile to the appropriate tier
          const { error: updateError } = await updateUserSubscription(tier, tokens);
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
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
        console.error('Error processing payment success:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please contact support.');
      }
    };

    handlePaymentSuccess();
  }, [session, searchParams, navigate]);

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {status === 'loading' && 'Processing Your Payment...'}
          {status === 'success' && 'Payment Successful!'}
          {status === 'error' && 'Payment Error'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {status === 'loading' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              Please wait while we process your subscription...
            </div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your account has been upgraded</li>
                <li>• You now have access to more practice sessions</li>
                <li>• Redirecting you to the dashboard...</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
        
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
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.open('mailto:support@realtalkcoach.com', '_blank')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess; 