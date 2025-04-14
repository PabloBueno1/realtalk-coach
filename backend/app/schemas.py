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
class VisualMetrics(BaseModel):
    """Schema for visual metrics from OpenCV analysis"""
    eye_contact_percent: float = Field(..., description="Percentage of time the speaker maintained eye contact")
    smile_percent: float = Field(..., description="Percentage of time the speaker was smiling")
    visibility_percent: float = Field(..., description="Percentage of time the speaker was visible and well-lit")
    posture_percent: float = Field(..., description="Percentage of time the speaker maintained good posture")
    emotion_distribution: Dict[str, int] = Field(..., description="Distribution of emotions detected")
    total_frames_analyzed: int = Field(..., description="Total number of frames analyzed")

class VisualGPTFeedback(BaseModel):
    """Schema for GPT-generated feedback on visual metrics"""
    eye_contact_score: float = Field(..., description="Score for eye contact (1-5)")
    smile_score: float = Field(..., description="Score for smile presence (1-5)")
    posture_score: float = Field(..., description="Score for posture (1-5)")
    expression_score: float = Field(..., description="Score for facial expressions (1-5)")
    visibility_score: float = Field(..., description="Score for visibility (1-5)")
    overall_score: float = Field(..., description="Overall visual score (1-5)")
    feedback_text: str = Field(..., description="Text feedback on visual aspects")

class VisualSessionResponse(BaseModel):
    """Schema for a visual analysis session"""
    id: Optional[str] = None
    user_id: str
    scenario_id: Optional[str] = None
    created_at: Optional[str] = None
    eye_contact_percent: float
    smile_percent: float
    visibility_percent: float
    posture_percent: float
    emotion_distribution: Dict[str, int]
    total_frames_analyzed: int

class VisualFeedbackResponse(BaseModel):
    """Schema for GPT feedback stored in the database"""
    id: Optional[str] = None
    session_id: str
    eye_contact_score: float
    smile_score: float
    posture_score: float
    expression_score: float
    visibility_score: float
    overall_score: float
    feedback_text: str
    created_at: Optional[str] = None

class VisualAnalysisResponse(BaseModel):
    """Response schema for visual analysis endpoint"""
    session: VisualSessionResponse
    feedback: VisualFeedbackResponse

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
    speech_score: float
    visual_score: float
    overall_score: float
