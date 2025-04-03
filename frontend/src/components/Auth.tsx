import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export function Auth() {
  const { signUp, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      console.log('Attempting to:', isSignUp ? 'sign up' : 'sign in')
      console.log('Email:', email)
      
      if (isSignUp) {
        console.log('Starting sign up process...')
        const response = await signUp(email, password)
        console.log('Sign up response:', response)
        
        // Check if the user needs to confirm their email
        if (response.data.user?.identities?.length === 0) {
          setSuccess('Please check your email for the verification link. You will need to verify your email before you can sign in.')
        } else if (response.data.user) {
          setSuccess('Account created! Please check your email for the verification link. You must verify your email before signing in.')
          setIsSignUp(false)
        }
      } else {
        console.log('Starting sign in process...')
        const response = await signIn(email, password)
        console.log('Sign in response:', response)
        
        if (response.error) {
          console.error('Sign in error details:', response.error)
          if (response.error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.')
          } else if (response.error.message.includes('Email not confirmed')) {
            setError('Please verify your email address before signing in. Check your inbox for the verification link.')
          } else {
            setError(response.error.message)
          }
        } else if (response.data.user) {
          setSuccess('Signed in successfully!')
          // Navigate to home page after successful login
          navigate('/')
        } else {
          setError('Sign in failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Create Your Account' : 'Welcome Back'}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group" data-help="Enter your email address">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group" data-help={isSignUp ? "Create a strong password" : "Enter your password"}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignUp ? "Create a password" : "Enter your password"}
            required
            disabled={loading}
            minLength={8}
          />
          {isSignUp && (
            <div className="password-requirements">
              Password must be at least 8 characters long
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>
      <button
        type="button"
        className="toggle-button"
        onClick={() => {
          setIsSignUp(!isSignUp)
          setError(null)
          setSuccess(null)
        }}
        disabled={loading}
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
      </button>
    </div>
  )
} 