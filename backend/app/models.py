from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class User(BaseModel):
    id: str
    email: str
    created_at: datetime

class Conversation(BaseModel):
    id: str
    user_id: str
    created_at: datetime
    title: str
    transcript: str
    score: Optional[float]
    feedback: Optional[str]

class Session(BaseModel):
    id: str
    user_id: str
    conversation_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    status: str 