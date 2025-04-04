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
