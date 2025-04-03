from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: Optional[str] = None

    @classmethod
    def from_user(cls, user: Any) -> 'UserResponse':
        return cls(
            id=user.id,
            email=user.email,
            created_at=user.created_at.isoformat() if user.created_at else None
        )

class SessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str

class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    session: Optional[SessionResponse] = None
