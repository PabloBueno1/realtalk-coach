from fastapi import APIRouter, HTTPException, Depends
from ..config import supabase
from ..schemas import UserSignUp, UserLogin, AuthResponse, UserResponse, SessionResponse
from pydantic import ValidationError
import asyncio

router = APIRouter()

@router.post("/signup", response_model=AuthResponse)
async def signup(user: UserSignUp):
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=500, detail="User creation failed")
            
        # Wait a moment to ensure the user is fully created
        await asyncio.sleep(1)
        
        # Create profile in profiles table
        profile_data = {
            "id": auth_response.user.id,
            "email": user.email,
            "full_name": user.full_name,
            "preferences": {}  # Initialize empty preferences
        }
        
        # Check if profile already exists
        existing_profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        if not existing_profile.data:
            # Only create profile if it doesn't exist
            supabase.table("profiles").insert(profile_data).execute()
        
        # Always return the email verification message on successful signup
        return AuthResponse(
            message="Account created successfully! Please check your email to verify your account before logging in.",
            user=UserResponse.from_user(auth_response.user)
        )
            
    except Exception as e:
        error_message = str(e).lower()
        
        if "user already registered" in error_message:
            raise HTTPException(
                status_code=409,  # Conflict - resource already exists
                detail="An account with this email already exists. Please try logging in or use a different email."
            )
        elif "password should be at least 6 characters" in error_message:
            raise HTTPException(
                status_code=422,  # Unprocessable Entity - validation error
                detail="Password must be at least 6 characters long"
            )
        elif "invalid email" in error_message:
            raise HTTPException(
                status_code=422,  # Unprocessable Entity - validation error
                detail="Please enter a valid email address"
            )
        elif "email rate limit exceeded" in error_message:
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail="Too many signup attempts. Please try again later."
            )
        elif "weak password" in error_message:
            raise HTTPException(
                status_code=422,  # Unprocessable Entity - validation error
                detail="Password is too weak. Please use a stronger password with a mix of letters, numbers, and symbols."
            )
        else:
            # Log the actual error for debugging
            print(f"Signup error: {str(e)}")
            raise HTTPException(
                status_code=500,  # Internal Server Error
                detail="Unable to create account. Please try again later."
            )

@router.post("/login", response_model=AuthResponse)
async def login(user: UserLogin):
    try:
        # Authenticate user
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if auth_response.user:
            # Check if email is verified
            if not auth_response.user.email_confirmed_at:
                raise HTTPException(
                    status_code=403,  # Forbidden - authenticated but not authorized
                    detail="Please verify your email before logging in. Check your inbox for the verification link."
                )
            
            # Update last_login timestamp
            supabase.table("profiles").update({
                "last_login": "now()"
            }).eq("id", auth_response.user.id).execute()
            
            return AuthResponse(
                message="Login successful",
                user=UserResponse.from_user(auth_response.user),
                session=SessionResponse(
                    access_token=auth_response.session.access_token,
                    refresh_token=auth_response.session.refresh_token,
                    expires_in=auth_response.session.expires_in,
                    token_type=auth_response.session.token_type
                )
            )
        else:
            raise HTTPException(
                status_code=401,  # Unauthorized - invalid credentials
                detail="Invalid email or password"
            )
            
    except Exception as e:
        error_message = str(e).lower()
        
        if "invalid login credentials" in error_message:
            raise HTTPException(
                status_code=401,  # Unauthorized - invalid credentials
                detail="Invalid email or password"
            )
        elif "email not confirmed" in error_message:
            raise HTTPException(
                status_code=403,  # Forbidden - email not verified
                detail="Please verify your email before logging in. Check your inbox for the verification link."
            )
        elif "email rate limit exceeded" in error_message:
            raise HTTPException(
                status_code=429,  # Too Many Requests
                detail="Too many login attempts. Please try again later."
            )
        elif "invalid email" in error_message:
            raise HTTPException(
                status_code=422,  # Unprocessable Entity - validation error
                detail="Please enter a valid email address"
            )
        else:
            # Log the actual error for debugging
            print(f"Login error: {str(e)}")
            raise HTTPException(
                status_code=500,  # Internal Server Error
                detail="Unable to login. Please try again later."
            )

@router.post("/signout")
async def signout():
    try:
        # Sign out the user
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
