from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import os
import tempfile
import json
import requests
from app.services.whisper_service import WhisperService
from app.services.gpt_feedback_service import analyze_text_feedback_from_json
from app.services.shared_download_service import shared_download_service
from app.config import get_current_user, get_supabase_client
from app.schemas import SpeechSessionResponse, SpeechFeedbackResponse, CombinedSpeechResponse, SpeechAnalysisUrlRequest
import asyncio
import time
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Initialize services
whisper_service = WhisperService()

@router.post("/analyze-url", response_model=SpeechSessionResponse)
async def analyze_speech_from_url(
    request: SpeechAnalysisUrlRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    url = request.url
    fileName = request.fileName
    scenario_id = request.scenario_id
    """
    Start speech analysis in background and return session ID immediately.
    """
    try:
        # Create session immediately
        session_data = {
            "user_id": current_user["id"],
            "scenario_id": scenario_id,
            "transcript": None,  # Will be filled by background process
            "word_count": None,
            "total_duration": None,
            "speaking_time": None,
            "speaking_rate": None,
            "average_volume_dbfs": None,
            "num_pauses": None
        }
        
        result = supabase.table("speech_sessions").insert(session_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create speech session")
        
        session_id = result.data[0]["id"]
        
        # Start background analysis
        import asyncio
        try:
            task = asyncio.create_task(process_speech_analysis_background(session_id, url, fileName))
            print(f"🎤 Started speech analysis in background. Session ID: {session_id}")
            logger.info(f"Started speech analysis in background. Session ID: {session_id}")
        except Exception as e:
            print(f"❌ Failed to start background speech analysis: {str(e)}")
            logger.error(f"Failed to start background speech analysis: {str(e)}")
            # Clean up the session if background task fails to start
            supabase.table("speech_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(status_code=500, detail="Failed to start analysis")
        
        return result.data[0]
    
    except Exception as e:
        logger.error(f"Error starting speech analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting speech analysis: {str(e)}")

async def process_speech_analysis_background(session_id: str, url: str, fileName: str):
    """
    Process speech analysis in the background.
    """
    try:
        print(f"🎤 Starting background speech analysis for session: {session_id}")
        
        # Get supabase client
        from app.config import get_supabase_client
        supabase = await get_supabase_client()
        
        # Download video file using shared download service
        temp_video_path, file_size_mb, download_time = shared_download_service.download_video(url)
        
        print(f"🎤 Using shared video file for speech analysis: {file_size_mb:.1f}MB")
        
        # Extract audio from video
        temp_audio_path = temp_video_path.replace(".webm", ".wav")
        if not whisper_service.extract_audio_from_video(temp_video_path, temp_audio_path):
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
            raise Exception("Failed to extract audio from video")
        
        # Analyze the audio
        metrics = whisper_service.analyze_audio(temp_audio_path)
        
        # Clean up temporary audio file
        if os.path.exists(temp_audio_path):
            os.unlink(temp_audio_path)
        
        if not metrics:
            raise Exception("Failed to analyze audio")
        
        # Update session with results
        update_data = {
            "transcript": metrics.get("transcript"),
            "word_count": metrics.get("word_count"),
            "total_duration": metrics.get("total_duration"),
            "speaking_time": metrics.get("speaking_time"),
            "speaking_rate": metrics.get("speaking_rate"),
            "average_volume_dbfs": metrics.get("average_volume_dbfs"),
            "num_pauses": metrics.get("num_pauses")
        }
        
        supabase.table("speech_sessions").update(update_data).eq("id", session_id).execute()
        
        print(f"✅ Background speech analysis completed. Session ID: {session_id}")
        logger.info(f"Background speech analysis completed. Session ID: {session_id}")
        
    except Exception as e:
        print(f"❌ Background speech analysis failed. Session ID: {session_id}, Error: {str(e)}")
        logger.error(f"Background speech analysis failed. Session ID: {session_id}, Error: {str(e)}")

@router.get("/sessions/{session_id}/status")
async def get_speech_analysis_status(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get the status of a speech analysis session.
    """
    try:
        # Get the session
        session_result = supabase.table("speech_sessions").select("*").eq("id", session_id).eq("user_id", current_user["id"]).execute()
        
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        session = session_result.data[0]
        
        # Check if feedback exists
        feedback_result = supabase.table("speech_gpt_feedback").select("*").eq("session_id", session_id).execute()
        
        status = {
            "session_id": session_id,
            "status": "completed" if session.get("transcript") else "processing",
            "has_feedback": len(feedback_result.data) > 0,
            "transcript": session.get("transcript"),
            "word_count": session.get("word_count"),
            "total_duration": session.get("total_duration")
        }
        
        return status
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting speech analysis status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting speech analysis status: {str(e)}")

@router.post("/analyze", response_model=SpeechSessionResponse)
async def analyze_speech(
    file: UploadFile = File(...),
    scenario_id: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Analyze a speech video file and store the results in the database.
    Returns the speech session ID which can be used to link visual analysis.
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
            "scenario_id": scenario_id,
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
        
        # Check if feedback already exists
        feedback_result = supabase.table("speech_gpt_feedback").select("*").eq("session_id", session_id).execute()
        
        if feedback_result.data:
            return feedback_result.data[0]
        
        # Get scenario if it exists
        scenario = None
        if session.get("scenario_id"):
            scenario_result = supabase.table("scenarios").select("*").eq("id", session["scenario_id"]).execute()
            if scenario_result.data:
                scenario = scenario_result.data[0]
        
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
            },
            "scenario": scenario
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
    supabase = Depends(get_supabase_client),
    skip: int = 0,
    limit: int = 10
):
    """
    Get all speech sessions for the current user.
    """
    try:
        result = supabase.table("speech_sessions").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return [SpeechSessionResponse(**session) for session in result.data]
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

@router.get("/sessions/{session_id}/combined", response_model=CombinedSpeechResponse)
async def get_combined_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get combined speech session and feedback data.
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
        
        # Get the feedback
        feedback_result = supabase.table("speech_gpt_feedback").select("*").eq("session_id", session_id).execute()
        
        feedback = None
        if not feedback_result.data:
            # If no feedback exists, generate it
            feedback = await generate_feedback(session_id, current_user, supabase)
        else:
            feedback = feedback_result.data[0]
        
        # Wait for feedback to be generated if it was just created
        if feedback is None:
            # Poll for feedback with a timeout
            max_retries = 5
            retry_delay = 2  # seconds
            for _ in range(max_retries):
                feedback_result = supabase.table("speech_gpt_feedback").select("*").eq("session_id", session_id).execute()
                if feedback_result.data:
                    feedback = feedback_result.data[0]
                    break
                await asyncio.sleep(retry_delay)
            
            if feedback is None:
                raise HTTPException(status_code=500, detail="Failed to generate feedback after multiple attempts")
        
        return {
            "session": session,
            "feedback": feedback
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching combined session data: {str(e)}") 