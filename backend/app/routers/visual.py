import os
import uuid
import tempfile
import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from typing import List, Optional, Dict, Any
from pathlib import Path
import asyncio
import time

from ..schemas import (
    VisualSessionResponse,
    VisualFeedback,
    VisualAnalysisResponse,
    VisualAnalysisUrlRequest
)
from ..services.opencv_service import analyze_video
from ..services.gpt_feedback_service import generate_visual_feedback
from ..services.shared_download_service import shared_download_service
from ..config import get_current_user, get_supabase_client

router = APIRouter()

# Create a directory for storing uploaded videos if it doesn't exist
UPLOAD_DIR = Path("uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Set up logging - only log warnings and above
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

@router.post("/analyze", response_model=VisualSessionResponse)
async def analyze_visual(
    file: UploadFile = File(...),
    speech_session_id: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Analyze a video file for visual metrics and store the results in the database.
    Uses the speech session ID as the identifier.
    """
    try:
        logger.debug("Starting video analysis pipeline")
        
        # Verify the speech session exists and belongs to the user
        logger.debug(f"Checking speech session: {speech_session_id}")
        speech_result = supabase.table("speech_sessions").select("user_id, scenario_id").eq("id", speech_session_id).execute()
        
        if not speech_result.data:
            logger.error(f"Speech session not found: {speech_session_id}")
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        speech_session = speech_result.data[0]
        if speech_session["user_id"] != current_user["id"]:
            logger.error(f"User {current_user['id']} not authorized for session {speech_session_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Check if visual analysis already exists
        logger.debug("Checking for existing visual analysis")
        existing_visual = supabase.table("visual_sessions").select("*").eq("speech_session_id", speech_session_id).execute()
        if existing_visual.data:
            logger.error(f"Visual analysis already exists for session {speech_session_id}")
            raise HTTPException(status_code=400, detail="Visual analysis already exists for this session")
        
        # Save uploaded video file
        logger.debug("Saving uploaded video to temporary file")
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video_file:
                content = await file.read()
                temp_video_file.write(content)
                temp_video_path = temp_video_file.name
                logger.debug(f"Video saved to: {temp_video_path}")
        except Exception as e:
            logger.error(f"Error saving video file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error saving video file: {str(e)}")
        
        # Analyze the video
        logger.debug("Starting video analysis")
        try:
            metrics = analyze_video(temp_video_path)
            if metrics is None:
                logger.error("Video analysis failed - no metrics returned")
                raise HTTPException(status_code=500, detail="Video analysis failed - could not detect face or extract metrics")
            logger.debug(f"Analysis completed. Metrics: {metrics}")
        except Exception as e:
            logger.error(f"Error during video analysis: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error during video analysis: {str(e)}")
        finally:
            # Clean up temporary file
            try:
                logger.debug("Cleaning up temporary file")
                os.unlink(temp_video_path)
            except Exception as e:
                logger.warning(f"Error cleaning up temporary file: {str(e)}")
        
        # Create visual session in database
        logger.debug("Preparing session data for database")
        try:
            session_data = {
                "speech_session_id": speech_session_id,
                "user_id": current_user["id"],
                "scenario_id": speech_session.get("scenario_id"),
                "total_frames_analyzed": metrics.get("total_frames_analyzed", 0),
                "blink_detection": metrics.get("blink_detection", {}),
                "emotions": metrics.get("emotions", {}),
                "posture": metrics.get("posture", {}),
                "eye_contact": metrics.get("eye_contact", {}),
                "yawn_detection": metrics.get("yawn_detection", {}),
                "restlessness": metrics.get("restlessness", {}),
                "face_visibility": metrics.get("face_visibility", {}),
                "processed_posture_frames": metrics.get("processed_posture_frames", 0)
            }
            
            logger.debug(f"Session data prepared: {session_data}")
            
            # Save to database
            logger.debug("Saving to database")
            result = supabase.table("visual_sessions").insert(session_data).execute()
            
            if not result.data:
                logger.error("Failed to save to database")
                raise HTTPException(status_code=500, detail="Failed to save visual session")
            
            logger.debug("Analysis pipeline completed successfully")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error preparing or saving session data: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error preparing or saving session data: {str(e)}")
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in analysis pipeline: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")

@router.post("/analyze-url", response_model=VisualSessionResponse)
async def analyze_visual_from_url(
    request: VisualAnalysisUrlRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    url = request.url
    fileName = request.fileName
    speech_session_id = request.speech_session_id
    """
    Start visual analysis in background and return session ID immediately.
    """
    try:
        logger.debug("Starting visual analysis pipeline from URL")
        
        # Verify the speech session exists and belongs to the user
        logger.debug(f"Checking speech session: {speech_session_id}")
        speech_result = supabase.table("speech_sessions").select("user_id, scenario_id").eq("id", speech_session_id).execute()
        
        if not speech_result.data:
            logger.error(f"Speech session not found: {speech_session_id}")
            raise HTTPException(status_code=404, detail="Speech session not found")
        
        speech_session = speech_result.data[0]
        if speech_session["user_id"] != current_user["id"]:
            logger.error(f"User {current_user['id']} not authorized for session {speech_session_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Check if visual analysis already exists
        logger.debug("Checking for existing visual analysis")
        existing_visual = supabase.table("visual_sessions").select("*").eq("speech_session_id", speech_session_id).execute()
        if existing_visual.data:
            logger.error(f"Visual analysis already exists for session {speech_session_id}")
            raise HTTPException(status_code=400, detail="Visual analysis already exists for this session")
        
        # Create visual session immediately
        session_data = {
            "speech_session_id": speech_session_id,
            "user_id": current_user["id"],
            "scenario_id": speech_session.get("scenario_id"),
            "total_frames_analyzed": None,  # Will be filled by background process
            "blink_detection": None,
            "emotions": None,
            "posture": None,
            "eye_contact": None,
            "yawn_detection": None,
            "restlessness": None,
            "face_visibility": None,
            "processed_posture_frames": None
        }
        
        result = supabase.table("visual_sessions").insert(session_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create visual session")
        
        session_id = result.data[0]["id"]
        
        # Start background analysis
        try:
            task = asyncio.create_task(process_visual_analysis_background(session_id, url, fileName))
            print(f"👁️ Started visual analysis in background. Session ID: {session_id}")
            logger.info(f"Started visual analysis in background. Session ID: {session_id}")
        except Exception as e:
            print(f"❌ Failed to start background visual analysis: {str(e)}")
            logger.error(f"Failed to start background visual analysis: {str(e)}")
            # Clean up the session if background task fails to start
            supabase.table("visual_sessions").delete().eq("id", session_id).execute()
            raise HTTPException(status_code=500, detail="Failed to start analysis")
        
        return result.data[0]
    
    except Exception as e:
        logger.error(f"Error starting visual analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting visual analysis: {str(e)}")

async def process_visual_analysis_background(session_id: str, url: str, fileName: str):
    """
    Process visual analysis in the background.
    """
    try:
        print(f"👁️ Starting background visual analysis for session: {session_id}")
        
        # Get supabase client
        from app.config import get_supabase_client
        supabase = await get_supabase_client()
        
        # Download video file using shared download service
        temp_video_path, file_size_mb, download_time = shared_download_service.download_video(url)
        
        print(f"👁️ Using shared video file for visual analysis: {file_size_mb:.1f}MB")
        
        # Analyze the video
        try:
            metrics = analyze_video(temp_video_path)
            if metrics is None:
                raise Exception("Video analysis failed - no metrics returned")
        except Exception as e:
            raise Exception(f"Error during video analysis: {str(e)}")
        finally:
            # Clean up the downloaded video file after visual analysis is complete
            print(f"🧹 Cleaning up downloaded video file after visual analysis")
            shared_download_service.cleanup_file(url)
        
        # Update session with results
        update_data = {
            "total_frames_analyzed": metrics.get("total_frames_analyzed", 0),
            "blink_detection": metrics.get("blink_detection", {}),
            "emotions": metrics.get("emotions", {}),
            "posture": metrics.get("posture", {}),
            "eye_contact": metrics.get("eye_contact", {}),
            "yawn_detection": metrics.get("yawn_detection", {}),
            "restlessness": metrics.get("restlessness", {}),
            "face_visibility": metrics.get("face_visibility", {}),
            "processed_posture_frames": metrics.get("processed_posture_frames", 0)
        }
        
        supabase.table("visual_sessions").update(update_data).eq("id", session_id).execute()
        
        print(f"✅ Background visual analysis completed. Session ID: {session_id}")
        logger.info(f"Background visual analysis completed. Session ID: {session_id}")
        
    except Exception as e:
        print(f"❌ Background visual analysis failed. Session ID: {session_id}, Error: {str(e)}")
        logger.error(f"Background visual analysis failed. Session ID: {session_id}, Error: {str(e)}")

@router.get("/sessions/{session_id}/status")
async def get_visual_analysis_status(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get the status of a visual analysis session.
    """
    try:
        # Get the session
        session_result = supabase.table("visual_sessions").select("*").eq("id", session_id).eq("user_id", current_user["id"]).execute()
        
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Visual session not found")
        
        session = session_result.data[0]
        
        # Check if feedback exists
        feedback_result = supabase.table("visual_gpt_feedback").select("*").eq("session_id", session_id).execute()
        
        status = {
            "session_id": session_id,
            "status": "completed" if session.get("total_frames_analyzed") is not None else "processing",
            "has_feedback": len(feedback_result.data) > 0,
            "total_frames_analyzed": session.get("total_frames_analyzed"),
            "eye_contact": session.get("eye_contact"),
            "emotions": session.get("emotions")
        }
        
        return status
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting visual analysis status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting visual analysis status: {str(e)}")

@router.post("/feedback/{session_id}", response_model=VisualFeedback)
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
        return VisualFeedback(**feedback_result.data[0])
    
    # Get scenario if it exists
    scenario = None
    if session.get("scenario_id"):
        scenario_result = supabase.table("scenarios").select("*").eq("id", session["scenario_id"]).execute()
        if scenario_result.data:
            scenario = scenario_result.data[0]
    
    # Prepare metrics for GPT feedback
    visual_metrics = {
        "metrics": {
            "eye_contact": session.get("eye_contact", {}),
            "emotions": session.get("emotions", {}),
            "posture": session.get("posture", {}),
            "face_visibility": session.get("face_visibility", {}),
            "restlessness": session.get("restlessness", {}),
            "blink_detection": session.get("blink_detection", {}),
            "yawn_detection": session.get("yawn_detection", {}),
            "scenario": scenario
        }
    }
    
    # Generate GPT feedback
    try:
        feedback_data = await generate_visual_feedback(session_id, visual_metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating feedback: {str(e)}")
    
    # Create the GPT feedback in Supabase
    feedback_result = supabase.table("visual_gpt_feedback").insert(feedback_data).execute()
    
    # Return the feedback
    return VisualFeedback(**feedback_result.data[0])

@router.get("/sessions/{session_id}/feedback", response_model=VisualFeedback)
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
    
    return VisualFeedback(**feedback_result.data[0])

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

@router.get("/sessions/{session_id}/combined", response_model=VisualAnalysisResponse)
async def get_combined_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get combined visual session and feedback data.
    """
    try:
        # Get the visual session
        session_result = supabase.table("visual_sessions").select("*").eq("id", session_id).execute()
        
        if not session_result.data:
            # Try to find the visual session by speech_session_id
            session_result = supabase.table("visual_sessions").select("*").eq("speech_session_id", session_id).execute()
            if not session_result.data:
                raise HTTPException(status_code=404, detail="Visual session not found")
        
        session = session_result.data[0]
        
        # Check if user owns this session
        if session["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Get the feedback
        feedback_result = supabase.table("visual_gpt_feedback").select("*").eq("session_id", session["id"]).execute()
        
        feedback = None
        if not feedback_result.data:
            # If no feedback exists, generate it
            feedback = await generate_feedback(session["id"], current_user, supabase)
        else:
            feedback = feedback_result.data[0]
        
        # Wait for feedback to be generated if it was just created
        if feedback is None:
            # Poll for feedback with a timeout
            max_retries = 5
            retry_delay = 2  # seconds
            for _ in range(max_retries):
                feedback_result = supabase.table("visual_gpt_feedback").select("*").eq("session_id", session["id"]).execute()
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
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching combined session data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching combined session data: {str(e)}") 