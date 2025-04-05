import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..schemas import (
    VisualMetrics, 
    VisualGPTFeedback,
    VisualSessionResponse,
    VisualFeedbackResponse,
    VisualAnalysisResponse
)
from ..services.opencv_service import VisualAnalysisService
from ..services.gpt_feedback_service import generate_visual_feedback
from ..config import get_current_user, get_supabase_client

router = APIRouter()

# Create a directory for storing uploaded videos if it doesn't exist
UPLOAD_DIR = Path("uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/analyze", response_model=VisualSessionResponse)
async def analyze_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Analyze a video file for visual metrics.
    
    This endpoint:
    1. Saves the uploaded video
    2. Analyzes the video using OpenCV
    3. Saves the results to Supabase
    4. Returns the analysis results
    """
    # Save the uploaded video
    video_path = UPLOAD_DIR / f"{uuid.uuid4()}_{video.filename}"
    try:
        with open(video_path, "wb") as buffer:
            content = await video.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
    
    # Initialize the visual analysis service
    visual_service = VisualAnalysisService()
    
    # Analyze the video
    try:
        visual_metrics = visual_service.analyze_video(str(video_path))
        if not visual_metrics:
            raise HTTPException(status_code=500, detail="Failed to analyze video")
    except Exception as e:
        # Clean up the video file
        if os.path.exists(video_path):
            os.remove(video_path)
        raise HTTPException(status_code=500, detail=f"Error analyzing video: {str(e)}")
    
    # Create a new visual session in Supabase
    session_data = {
        "user_id": current_user["id"],
        "eye_contact_percent": visual_metrics.get("eye_contact_percent", 0),
        "smile_percent": visual_metrics.get("smile_percent", 0),
        "visibility_percent": visual_metrics.get("visibility_percent", 0),
        "posture_percent": visual_metrics.get("posture_percent", 0),
        "emotion_distribution": visual_metrics.get("emotion_distribution", {}),
        "total_frames_analyzed": visual_metrics.get("total_frames_analyzed", 0)
    }
    
    session_result = supabase.table("visual_sessions").insert(session_data).execute()
    
    # Clean up the video file in the background
    background_tasks.add_task(lambda: os.remove(video_path) if os.path.exists(video_path) else None)
    
    # Return the analysis results
    return VisualSessionResponse(**session_result.data[0])

@router.post("/feedback/{session_id}", response_model=VisualFeedbackResponse)
async def generate_feedback(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Generate GPT feedback for a visual analysis session.
    
    This endpoint:
    1. Retrieves the visual metrics from the session
    2. Generates GPT feedback based on the metrics
    3. Saves the feedback to Supabase
    4. Returns the feedback
    """
    # Get the session
    session_result = supabase.table("visual_sessions").select("*").eq("id", session_id).eq("user_id", current_user["id"]).execute()
    
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Visual session not found")
    
    session = session_result.data[0]
    
    # Check if feedback already exists
    feedback_result = supabase.table("visual_gpt_feedback").select("*").eq("session_id", session_id).execute()
    
    if feedback_result.data:
        return VisualFeedbackResponse(**feedback_result.data[0])
    
    # Prepare metrics for GPT feedback
    visual_metrics = {
        "eye_contact_percent": session.get("eye_contact_percent", 0),
        "smile_percent": session.get("smile_percent", 0),
        "visibility_percent": session.get("visibility_percent", 0),
        "posture_percent": session.get("posture_percent", 0),
        "emotion_distribution": session.get("emotion_distribution", {}),
        "total_frames_analyzed": session.get("total_frames_analyzed", 0)
    }
    
    # Generate GPT feedback
    try:
        feedback_text, feedback_scores = generate_visual_feedback(visual_metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")
    
    # Create the GPT feedback in Supabase
    feedback_data = {
        "session_id": session_id,
        "eye_contact_score": feedback_scores.get("eye_contact_score", 0),
        "smile_score": feedback_scores.get("smile_score", 0),
        "posture_score": feedback_scores.get("posture_score", 0),
        "expression_score": feedback_scores.get("expression_score", 0),
        "visibility_score": feedback_scores.get("visibility_score", 0),
        "overall_score": feedback_scores.get("overall_score", 0),
        "feedback_text": feedback_text
    }
    
    feedback_result = supabase.table("visual_gpt_feedback").insert(feedback_data).execute()
    
    # Return the feedback
    return VisualFeedbackResponse(**feedback_result.data[0])

@router.get("/sessions/{session_id}/feedback", response_model=VisualFeedbackResponse)
async def get_session_feedback(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get feedback for a specific visual session.
    
    This endpoint:
    1. Retrieves the feedback for a specific session
    2. Returns the feedback
    """
    # First check if the session exists and belongs to the user
    session_result = supabase.table("visual_sessions").select("user_id").eq("id", session_id).execute()
    
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Visual session not found")
    
    session = session_result.data[0]
    
    # Check if user owns this session
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Get the feedback
    feedback_result = supabase.table("visual_gpt_feedback").select("*").eq("session_id", session_id).execute()
    
    if not feedback_result.data:
        raise HTTPException(status_code=404, detail="Feedback not found for this session")
    
    return VisualFeedbackResponse(**feedback_result.data[0])

@router.get("/sessions", response_model=List[VisualSessionResponse])
async def get_visual_sessions(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
    skip: int = 0,
    limit: int = 10
):
    """
    Get a list of visual analysis sessions for the current user.
    """
    result = supabase.table("visual_sessions").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    
    return [VisualSessionResponse(**session) for session in result.data]

@router.get("/sessions/{session_id}", response_model=VisualSessionResponse)
async def get_visual_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get a specific visual analysis session by ID.
    """
    # Get the session
    session_result = supabase.table("visual_sessions").select("*").eq("id", session_id).eq("user_id", current_user["id"]).execute()
    
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Visual session not found")
    
    return VisualSessionResponse(**session_result.data[0]) 