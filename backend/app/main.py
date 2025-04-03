from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.services.supabase_service import SupabaseService
from app.dependencies import get_current_user
from typing import Dict, Any

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to RealTalk Coach API"}

@app.get("/api/profile")
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return current_user

@app.post("/api/profile")
async def update_profile(
    updates: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase_service: SupabaseService = Depends()
):
    updated_profile = await supabase_service.update_user_profile(current_user["id"], updates)
    return updated_profile

@app.get("/api/conversations")
async def get_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase_service: SupabaseService = Depends()
):
    conversations = await supabase_service.get_user_conversations(current_user["id"])
    return conversations

@app.post("/api/conversations")
async def create_conversation(
    conversation_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase_service: SupabaseService = Depends()
):
    conversation = await supabase_service.create_conversation(
        current_user["id"],
        conversation_data["title"],
        conversation_data["scenario"]
    )
    return conversation 