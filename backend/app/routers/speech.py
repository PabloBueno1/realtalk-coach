from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import os
import tempfile
import json
from app.services.whisper_service import WhisperService
from app.services.gpt_feedback_service import analyze_text_feedback_from_json
from app.config import get_current_user, get_supabase_client
from app.schemas import SpeechSessionResponse, SpeechFeedbackResponse

router = APIRouter()

# Initialize services
whisper_service = WhisperService()

@router.post("/analyze", response_model=SpeechSessionResponse)
async def analyze_speech(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Analyze a speech video file and store the results in the database.
    """
    try:
        # Save uploaded video file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video_file:
            content = await file.read()
            temp_video_file.write(content)
            temp_video_path = temp_video_file.name
        
        # Extract audio from video
        temp_audio_path = temp_video_path.replace(".mp4", ".wav")
        if not whisper_service.extract_audio_from_video(temp_video_path, temp_audio_path):
            # Clean up temporary files
            os.unlink(temp_video_path)
            raise HTTPException(status_code=400, detail="Failed to extract audio from video")
        
        # Analyze the audio
        metrics = whisper_service.analyze_audio(temp_audio_path)
        
        # Clean up temporary files
        os.unlink(temp_video_path)
        os.unlink(temp_audio_path)
        
        if not metrics:
            raise HTTPException(status_code=400, detail="Failed to analyze audio")
        
        # Create speech session in database
        session_data = {
            "user_id": current_user["id"],
            "transcript": metrics.get("transcript"),
            "word_count": metrics.get("word_count"),
            "total_duration": metrics.get("total_duration"),
            "speaking_time": metrics.get("speaking_time"),
            "speaking_rate": metrics.get("speaking_rate"),
            "average_volume_dbfs": metrics.get("average_volume_dbfs"),
            "num_pauses": metrics.get("num_pauses")
        }
        
        result = supabase.table("speech_sessions").insert(session_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save speech session")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing speech: {str(e)}")

@router.post("/feedback/{session_id}", response_model=SpeechFeedbackResponse)
async def generate_feedback(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Generate GPT feedback for a speech session and store it in the database.
    """
    try:
        # Get the speech session
        session_result = supabase.table("speech_sessions").select("*").eq("id", session_id).execute()
        
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        session = session_result.data[0]
        
        # Check if user owns this session
        if session["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Generate feedback
        feedback_text, scores = analyze_text_feedback_from_json({
            "transcript": session["transcript"],
            "metrics": {
                "word_count": session["word_count"],
                "total_duration": session["total_duration"],
                "speaking_time": session["speaking_time"],
                "speaking_rate": session["speaking_rate"],
                "average_volume_dbfs": session["average_volume_dbfs"],
                "num_pauses": session["num_pauses"]
            }
        })
        
        # Store feedback in database
        feedback_data = {
            "session_id": session_id,
            "fluency_score": scores.get("fluency_score", 0),
            "confidence_score": scores.get("confidence_score", 0),
            "clarity_score": scores.get("clarity_score", 0),
            "content_score": scores.get("content_score", 0),
            "pace_score": scores.get("pace_score", 0),
            "volume_score": scores.get("volume_score", 0),
            "pause_score": scores.get("pause_score", 0),
            "overall_score": scores.get("overall_score", 0),
            "feedback_text": feedback_text
        }
        
        result = supabase.table("speech_gpt_feedback").insert(feedback_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save feedback")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")

@router.get("/sessions", response_model=List[SpeechSessionResponse])
async def get_user_sessions(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get all speech sessions for the current user.
    """
    try:
        result = supabase.table("speech_sessions").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sessions: {str(e)}")

@router.get("/sessions/{session_id}", response_model=SpeechSessionResponse)
async def get_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get a specific speech session by ID.
    """
    try:
        result = supabase.table("speech_sessions").select("*").eq("id", session_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        session = result.data[0]
        
        # Check if user owns this session
        if session["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session: {str(e)}")

@router.get("/sessions/{session_id}/feedback", response_model=SpeechFeedbackResponse)
async def get_session_feedback(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get feedback for a specific speech session.
    """
    try:
        # First check if the session exists and belongs to the user
        session_result = supabase.table("speech_sessions").select("user_id").eq("id", session_id).execute()
        
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        session = session_result.data[0]
        
        # Check if user owns this session
        if session["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Get the feedback
        feedback_result = supabase.table("speech_gpt_feedback").select("*").eq("session_id", session_id).execute()
        
        if not feedback_result.data:
            raise HTTPException(status_code=404, detail="Feedback not found for this session")
        
        return feedback_result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching feedback: {str(e)}") 