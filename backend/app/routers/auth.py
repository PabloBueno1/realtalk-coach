from fastapi import APIRouter, HTTPException, Depends
from ..config import supabase, get_current_user
from ..schemas import UserSignUp, UserLogin, AuthResponse, UserResponse, SessionResponse, ProfilePreferencesResponse
from pydantic import ValidationError
import asyncio
from typing import Dict, Any
import time

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
            "preferences": {},  # Initialize empty preferences
            "tier": "free",  # Default tier
            "monthly_tokens": 5  # Default monthly tokens for free tier
        }
        
        # Check if profile already exists
        existing_profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        if not existing_profile.data:
            # Only create profile if it doesn't exist
            supabase.table("profiles").insert(profile_data).execute()
        
        # Always return the email verification message on successful signup
        return AuthResponse(
            message="Success! Please check your email to verify your account. You won't be able to log in until you verify your email address.",
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
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        profile = profile_response.data[0]
        
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
    except Exception as e:
        error_message = str(e).lower()
        if "invalid login credentials" in error_message:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/signout")
async def signout():
    try:
        # Sign out the user
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get information about the currently authenticated user.
    This endpoint is useful for validating authentication and checking token validity.
    """
    try:
        # Get user profile 
        profile_response = supabase.table("profiles").select("*").eq("id", user["id"]).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        profile = profile_response.data[0]
        
        return UserResponse(
            id=user["id"],
            email=user.get("email", profile.get("email", "")),
            full_name=profile.get("full_name", ""),
            role=profile.get("role", "user")
        )
    except Exception as e:
        print(f"Error in get_current_user_info: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

@router.post("/refresh")
async def refresh_token(refresh_token: Dict[str, str]):
    """
    Refresh an expired access token using a valid refresh token.
    """
    try:
        token = refresh_token.get("refresh_token")
        if not token:
            raise HTTPException(status_code=400, detail="Refresh token is required")
            
        # Attempt to refresh the session
        refresh_response = supabase.auth.refresh_session({"refresh_token": token})
        
        if not refresh_response.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        return {
            "session": {
                "access_token": refresh_response.session.access_token,
                "refresh_token": refresh_response.session.refresh_token,
                "expires_in": refresh_response.session.expires_in,
                "token_type": refresh_response.session.token_type
            }
        }
    except Exception as e:
        error_message = str(e).lower()
        if "invalid refresh token" in error_message or "expired" in error_message:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        raise HTTPException(status_code=500, detail=f"Failed to refresh token: {str(e)}")

@router.get("/profile/preferences", response_model=ProfilePreferencesResponse)
async def get_profile_preferences(user: Dict[str, Any] = Depends(get_current_user)):
    try:
        # Get user profile with preferences
        profile_response = supabase.table("profiles").select("*").eq("id", user["id"]).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
            
        profile = profile_response.data[0]
        
        return ProfilePreferencesResponse(
            preferences=profile.get("preferences", {}),
            full_name=profile.get("full_name", ""),
            email=user["email"],
            tier=profile.get("tier", "free"),
            monthly_tokens=profile.get("monthly_tokens", 5)
        )
    except Exception as e:
        print(f"Error in get_profile_preferences: {str(e)}")  # Add error logging
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/profile/preferences")
async def update_profile_preferences(
    preferences: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        print(f"Received preferences update request for user {user['id']}")
        print(f"Request data: {preferences}")
        
        # Update user profile preferences
        update_data = {
            "preferences": preferences.get("preferences", {})
        }
        print(f"Update data being sent to Supabase: {update_data}")
        
        update_response = supabase.table("profiles").update(update_data).eq("id", user['id']).execute()
        
        if not update_response.data:
            print("No data returned from Supabase update")
            raise HTTPException(status_code=404, detail="Profile not found")
            
        print(f"Update successful. Response: {update_response.data}")
        return {"message": "Preferences updated successfully"}
    except Exception as e:
        print(f"Error in update_profile_preferences: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        raise HTTPException(status_code=500, detail=str(e))

# Development-only endpoints - DO NOT use in production
@router.get("/dev/users", response_model=list[UserResponse])
async def get_dev_users():
    try:
        # Check if we're in development mode
        if not is_development_mode():
            raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
            
        # Get all users from the profiles table
        profiles_response = supabase.table("profiles").select("*").execute()
        
        if not profiles_response.data:
            return []
            
        # Get user data from auth for each profile
        users = []
        for profile in profiles_response.data:
            # Create a simplified user response
            user = UserResponse(
                id=profile["id"],
                email=profile.get("email", ""),
                full_name=profile.get("full_name", ""),
                role=profile.get("role", "user")
            )
            users.append(user)
            
        return users
    except Exception as e:
        print(f"Error in get_dev_users: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dev/token/{user_id}")
async def generate_dev_token(user_id: str):
    try:
        # Check if we're in development mode
        if not is_development_mode():
            raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
            
        # Get the user profile
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        profile = profile_response.data[0]
        
        # Generate a JWT token for the user
        # This is a development-only method to bypass normal authentication
        # In production, this would be a security risk
        
        # Get admin authentication
        admin_auth = supabase.auth.get_user()
        
        if not admin_auth:
            # If no admin is logged in, we can create an admin-scoped function
            # that bypasses normal authentication (development-only!)
            admin_client = supabase.auth.admin.generate_link({
                "type": "magiclink",
                "email": profile.get("email", "dev@example.com")
            })
            
            if not admin_client:
                raise HTTPException(status_code=500, detail="Failed to create admin client")
        
        # Generate a session for the user
        # Note: This is a simplified version - in a real app you'd use proper JWT generation
        # This simulates a login without password authentication
        session = {
            "access_token": f"dev_access_token_{user_id}_{int(time.time())}",
            "refresh_token": f"dev_refresh_token_{user_id}_{int(time.time())}",
            "expires_in": 3600,  # 1 hour
            "token_type": "bearer"
        }
        
        # Create a user object
        user = {
            "id": profile["id"],
            "email": profile.get("email", ""),
            "name": profile.get("full_name", ""),
            "role": profile.get("role", "user")
        }
        
        return {
            "access_token": session["access_token"],
            "refresh_token": session["refresh_token"],
            "user": user
        }
    except Exception as e:
        print(f"Error in generate_dev_token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def is_development_mode():
    """Check if the app is running in development mode"""
    # You can customize this check based on your environment
    import os
    return os.environ.get("APP_ENV", "development") == "development"
