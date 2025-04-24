from pydantic import BaseModel, EmailStr, Field
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

class ProfilePreferencesResponse(BaseModel):
    preferences: Dict[str, Any]
    full_name: str
    email: EmailStr
    tier: str = Field(..., description="User's subscription tier (free or pro)")
    monthly_tokens: int = Field(..., description="Number of tokens available per month")

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
    scenario_id: Optional[str] = None
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

# Visual-related models
class VisualSessionResponse(BaseModel):
    """Schema for a visual analysis session"""
    id: str
    user_id: str
    created_at: str
    total_frames_analyzed: int
    speech_session_id: Optional[str] = None
    scenario_id: Optional[str] = None
    
    # Detailed metrics
    blink_detection: Dict[str, Any] = Field(..., description="Blink detection metrics including normal and fast blinks")
    emotions: Dict[str, Any] = Field(..., description="Emotion distribution")
    posture: Dict[str, Any] = Field(..., description="Posture metrics including alignment, levelness, twist, etc.")
    eye_contact: Dict[str, Any] = Field(..., description="Eye contact metrics including quality percentage and frame counts")
    yawn_detection: Dict[str, Any] = Field(..., description="Yawn detection metrics")
    restlessness: Dict[str, Any] = Field(..., description="Restlessness metrics including score and gaze movement")
    face_visibility: Dict[str, Any] = Field(..., description="Face visibility metrics including percentage and frame counts")
    processed_posture_frames: Optional[int] = None

class VisualFeedback(BaseModel):
    """Schema for GPT feedback on visual metrics"""
    id: str
    session_id: str = Field(..., description="ID of the visual session")
    eye_contact_score: float = Field(..., description="Score for eye contact (1-5)")
    smile_score: float = Field(..., description="Score for smile presence (1-5)")
    posture_score: float = Field(..., description="Score for posture (1-5)")
    expression_score: float = Field(..., description="Score for facial expressions (1-5)")
    visibility_score: float = Field(..., description="Score for visibility (1-5)")
    overall_score: float = Field(..., description="Overall visual score (1-5)")
    feedback_text: str = Field(..., description="Text feedback on visual aspects")
    created_at: str

class VisualAnalysisResponse(BaseModel):
    """Response schema for visual analysis endpoint"""
    session: VisualSessionResponse
    feedback: Optional[VisualFeedback] = None

# Scenario-related models
class ScenarioBase(BaseModel):
    title: str
    description: Optional[str] = None
    initial_prompt: str
    context: Optional[str] = None
    difficulty_level: str
    category: str
    skills: List[str]

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioResponse(ScenarioBase):
    id: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class CombinedSessionResponse(BaseModel):
    id: str
    created_at: str
    module_id: str
    module_title: str
    speech_data: SpeechSessionResponse
    visual_data: Optional[VisualSessionResponse] = None
    speech_feedback: Optional[Dict[str, Any]] = None
    visual_feedback: Optional[Dict[str, Any]] = None
    speech_score: float
    visual_score: float
    overall_score: float

class CombinedSpeechResponse(BaseModel):
    """Schema for combined speech analysis and feedback response"""
    session: SpeechSessionResponse
    feedback: SpeechFeedbackResponse
