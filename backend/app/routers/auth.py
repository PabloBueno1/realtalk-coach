from fastapi import APIRouter, HTTPException, Depends
from ..config import supabase, get_current_user
from ..schemas import UserSignUp, UserLogin, AuthResponse, UserResponse, SessionResponse, ProfilePreferencesResponse
from pydantic import ValidationError
import asyncio
from typing import Dict, Any

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
