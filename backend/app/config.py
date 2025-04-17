from supabase import create_client, Client
from dotenv import load_dotenv
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional

# Load environment variables from .env file
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials not found in environment variables")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Security scheme for JWT tokens
security = HTTPBearer()

async def get_supabase_client() -> Client:
    """
    Dependency to get the Supabase client.
    """
    return supabase

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency to get the current authenticated user.
    """
    try:
        # Verify the JWT token with Supabase
        user_response = supabase.auth.get_user(credentials.credentials)
        
        # Extract user data from the response
        user_data = {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "created_at": user_response.user.created_at,
            "user_metadata": user_response.user.user_metadata,
            "app_metadata": user_response.user.app_metadata
        }
        
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def check_user_tokens(user_id: str) -> bool:
    """
    Check if the user has at least one token available.
    Returns True if user has tokens, False otherwise.
    """
    try:
        # Get user profile
        profile_response = supabase.table("profiles").select("monthly_tokens").eq("id", user_id).execute()
        
        if not profile_response.data:
            return False
            
        profile = profile_response.data[0]
        return profile.get("monthly_tokens", 0) > 0
    except Exception as e:
        print(f"Error checking user tokens: {str(e)}")
        return False

async def decrement_user_tokens(user_id: str) -> bool:
    """
    Decrement the user's token count by 1.
    Returns True if successful, False otherwise.
    """
    try:
        # Get current token count
        profile_response = supabase.table("profiles").select("monthly_tokens").eq("id", user_id).execute()
        
        if not profile_response.data:
            return False
            
        profile = profile_response.data[0]
        current_tokens = profile.get("monthly_tokens", 0)
        
        if current_tokens <= 0:
            return False
            
        # Update token count
        update_response = supabase.table("profiles").update({
            "monthly_tokens": current_tokens - 1
        }).eq("id", user_id).execute()
        
        return bool(update_response.data)
    except Exception as e:
        print(f"Error decrementing user tokens: {str(e)}")
        return False
