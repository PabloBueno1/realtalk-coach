from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
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

# Speech-related models
class SpeechSessionResponse(BaseModel):
    id: str
    user_id: str
    created_at: str
    transcript: Optional[str] = None
    word_count: Optional[int] = None
    total_duration: Optional[float] = None
    speaking_time: Optional[float] = None
    speaking_rate: Optional[float] = None
    average_volume_dbfs: Optional[float] = None
    num_pauses: Optional[int] = None

class SpeechFeedbackResponse(BaseModel):
    id: str
    session_id: str
    fluency_score: float
    confidence_score: float
    clarity_score: float
    content_score: float
    pace_score: float
    volume_score: float
    pause_score: float
    overall_score: float
    feedback_text: str
    created_at: str
