from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.responses import FileResponse
from typing import Dict, List, Optional
import uuid
import os
import glob
from app.services.tts_service import TTSService
from app.config import supabase

router = APIRouter()

# Endpoint to serve audio files
@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    file_path = f"audio/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path)

class ConversationManager:
    def __init__(self):
        self.active_conversations: Dict[str, List[dict]] = {}
    
    def create_conversation(self) -> str:
        conversation_id = str(uuid.uuid4())
        self.active_conversations[conversation_id] = []
        return conversation_id
    
    def add_to_history(self, conversation_id: str, user_message: str, assistant_message: str):
        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id].extend([
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ])
    
    def get_history(self, conversation_id: str) -> List[dict]:
        return self.active_conversations.get(conversation_id, [])
    
    def remove_conversation(self, conversation_id: str):
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]

# Function to clean up temporary files
def cleanup_temp_files(conversation_id: str):
    # Clean up temp video file
    temp_video_path = f"temp_{conversation_id}.mp4"
    if os.path.exists(temp_video_path):
        try:
            os.remove(temp_video_path)
            print(f"Cleaned up temp video file: {temp_video_path}")
        except Exception as e:
            print(f"Error cleaning up temp video file: {str(e)}")
    
    # Clean up temp WAV file
    temp_wav_path = f"temp_{conversation_id}.wav"
    if os.path.exists(temp_wav_path):
        try:
            os.remove(temp_wav_path)
            print(f"Cleaned up temp WAV file: {temp_wav_path}")
        except Exception as e:
            print(f"Error cleaning up temp WAV file: {str(e)}")
    
    # Clean up GPT reply file
    gpt_reply_path = f"gpt_reply_{conversation_id}.mp3"
    if os.path.exists(gpt_reply_path):
        try:
            os.remove(gpt_reply_path)
            print(f"Cleaned up GPT reply file: {gpt_reply_path}")
        except Exception as e:
            print(f"Error cleaning up GPT reply file: {str(e)}")
    
    # Clean up any audio files in the audio directory that were created for this conversation
    audio_files = glob.glob(f"audio/*_{conversation_id}.mp3")
    for audio_file in audio_files:
        try:
            os.remove(audio_file)
            print(f"Cleaned up audio file: {audio_file}")
        except Exception as e:
            print(f"Error cleaning up audio file: {str(e)}")

conversation_manager = ConversationManager()
tts_service = TTSService()

@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    access_token: Optional[str] = Query(None)
):
    # Debug logging
    print(f"WebSocket connection attempt with token: {access_token is not None}")
    print(f"WebSocket headers: {websocket.headers}")
    print(f"WebSocket query params: {websocket.query_params}")
    
    # Check authentication
    if not access_token:
        print("Authentication failed: No token provided")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return
    
    try:
        # Verify the token with Supabase
        print(f"Verifying token with Supabase")
        user_response = supabase.auth.get_user(access_token)
        if not user_response.user:
            print("Authentication failed: Invalid token (no user found)")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return
        print(f"Authentication successful for user: {user_response.user.email}")
    except Exception as e:
        print(f"Authentication failed with error: {str(e)}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {str(e)}")
        return
    
    # Accept the connection if authentication is successful
    try:
        await websocket.accept()
        print("WebSocket connection accepted")
    except Exception as e:
        print(f"Failed to accept WebSocket connection: {str(e)}")
        return
    
    conversation_id = conversation_manager.create_conversation()
    
    try:
        while True:
            # Receive audio data
            audio_data = await websocket.receive_bytes()
            
            # Save audio temporarily
            temp_path = f"temp_{conversation_id}.mp4"
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            try:
                # Get conversation history
                history = conversation_manager.get_history(conversation_id)
                
                # Process with TTS service
                result = tts_service.process_clip(temp_path, history, conversation_id)
                
                # Update conversation history
                conversation_manager.add_to_history(
                    conversation_id,
                    result["transcript"],
                    result["reply"]
                )
                
                # Send response back
                await websocket.send_json({
                    "transcript": result["transcript"],
                    "reply": result["reply"],
                    "audio_path": result["reply_audio_path"]
                })
                
            finally:
                # Cleanup temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
    except WebSocketDisconnect:
        # Cleanup when connection closes
        print(f"WebSocket disconnected, cleaning up files for conversation: {conversation_id}")
        cleanup_temp_files(conversation_id)
        conversation_manager.remove_conversation(conversation_id)
    except Exception as e:
        # Handle other errors
        print(f"Error in WebSocket connection: {str(e)}")
        cleanup_temp_files(conversation_id)
        await websocket.send_json({
            "error": str(e)
        })
        conversation_manager.remove_conversation(conversation_id) 