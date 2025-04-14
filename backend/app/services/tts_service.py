import os
import openai
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import uuid
from app.services.elevenlabs_service import ElevenLabsService
import subprocess
import time
import numpy as np
import torch
from faster_whisper import WhisperModel
import traceback

# Load environment variables from .env file
load_dotenv()

# Initialize Whisper model
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "float32"
print(f"Loading Whisper model on {DEVICE}...")
MODEL = WhisperModel("tiny", device=DEVICE, compute_type=COMPUTE_TYPE)

# Warm up the model with a test transcription
print("Warming up Whisper model...")
try:
    # Read the test audio file
    test_file = "carlos.wav"
    if os.path.exists(test_file):
        print(f"Using {test_file} for warmup...")
        with open(test_file, 'rb') as f:
            audio_bytes = f.read()
        
        # Convert to PCM if needed
        cmd = [
            "ffmpeg", "-i", test_file, "-vn",
            "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            "-f", "s16le", "pipe:1"
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            raise RuntimeError("FFmpeg failed: " + result.stderr.decode())
        pcm_bytes = result.stdout
        
        # Transcribe the test audio
        start_time = time.time()
        audio_data = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        segments, _ = MODEL.transcribe(audio_data, beam_size=1, language="en")
        text = " ".join([segment.text for segment in segments])
        warmup_time = time.time() - start_time
        
        print(f"Model warmup complete in {warmup_time:.2f}s")
        print(f"Test transcription: {text}")
    else:
        print(f"Warning: Test file {test_file} not found, skipping warmup")
except Exception as e:
    print(f"Warning: Model warmup failed: {str(e)}")
    print(traceback.format_exc())

class TTSService:
    """
    Service for handling text-to-speech conversion using OpenAI's Whisper API and ElevenLabs TTS.
    Includes functionality for audio conversion, transcription, and speech generation.
    """

    def __init__(self):
        # Initialize with API key from environment
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            print("Warning: OPENAI_API_KEY environment variable is not set")
            
        # Initialize ElevenLabs service
        self.elevenlabs = ElevenLabsService()

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate: int = 16000, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes.
        
        Args:
            audio_bytes (bytes): Raw 16-bit PCM audio data
            sample_rate (int): Audio sample rate (default 16000 Hz)
            language (str): Force language detection (default "en" for English)
        """
        try:
            # Convert bytes to numpy array (16-bit PCM to float32)
            audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            
            # Transcribe the audio
            segments, _ = MODEL.transcribe(
                audio_data,
                beam_size=1,
                language=language,
                task="transcribe"
            )
            
            # Join all segments into single text
            return " ".join([segment.text for segment in segments])
            
        except Exception as e:
            print(f"Error during transcription: {traceback.format_exc()}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")

    def generate_reply(self, transcript: str, conversation_history: list = None, scenario: Dict[str, Any] = None) -> Optional[str]:
        """
        Generate a conversational reply using GPT-3.5-turbo.
        
        Args:
            transcript: Input text to generate reply for
            conversation_history: List of previous messages in the conversation
            scenario: Scenario context for the conversation
            
        Returns:
            Generated reply text or None if generation fails
        """
        try:
            # Extract scenario details
            title = scenario.get("title", "Casual Conversation") if scenario else "Casual Conversation"
            description = scenario.get("description", "A general conversation practice session") if scenario else "A general conversation practice session"
            initial_prompt = scenario.get("initial_prompt", "How have you been?") if scenario else "How have you been?"
            context = scenario.get("context", "A natural conversation setting") if scenario else "A natural conversation setting"
            difficulty_level = scenario.get("difficulty_level", "intermediate") if scenario else "intermediate"
            
            # Prepare system message with scenario context - simplified for GPT-3.5
            system_message = f"""You are having a natural conversation in this scenario:
Title: {title}
Description: {description}
Initial Prompt: {initial_prompt}
Context: {context}
Difficulty: {difficulty_level}

IMPORTANT: You are the person the user is talking to, not the user themselves. The scenario details above describe the situation the user is practicing. You should:
1. Respond naturally as if you are the person they are talking to in this scenario
2. Keep responses short (2-3 sentences) and conversational
3. Share personal experiences and opinions from your perspective as the person in the scenario
4. Never mention AI, technology, or being digital
5. Stay focused on the conversation topic and maintain a friendly, casual tone
6. React to what the user is saying as if you are the person they are practicing with

Remember: You are the person the user is talking to in this scenario, not the user themselves. The scenario details describe the situation the user is practicing, and you are the other person in that conversation."""
            
            # Prepare messages with history
            messages = [
                {"role": "system", "content": system_message}
            ]
            
            # Add conversation history if provided
            if conversation_history:
                # Add last 3 messages for context (reduced from 5 for GPT-3.5)
                messages.extend(conversation_history[-3:])
            
            # Add current message
            messages.append({"role": "user", "content": transcript})
            
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Changed from gpt-4 to gpt-3.5-turbo
                messages=messages,
                temperature=0.7,  # Reduced from 0.9 for more focused responses
                max_tokens=250  # Reduced from 400 since we want shorter responses
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error generating reply: {str(e)}")
            return None

    def speak_reply(self, text: str, conversation_id: str = None) -> Optional[str]:
        """
        Convert text to speech using ElevenLabs API.
        
        Args:
            text: Text to convert to speech
            conversation_id: ID of the conversation (used for filename)
            
        Returns:
            Path to generated audio file or None if generation fails
        """
        try:
            # Generate a unique filename
            filename = f"{uuid.uuid4()}"
            
            # Add conversation ID to filename if provided
            if conversation_id:
                filename = f"{filename}_{conversation_id}"
                
            filename = f"{filename}.mp3"
            audio_path = f"audio/{filename}"
            
            # Use ElevenLabs to generate speech
            result_path = self.elevenlabs.text_to_speech(text, output_path=audio_path)
            if not result_path:
                return None
            
            # Return the URL path that can be accessed by the frontend
            return f"/audio/{filename}"
        except Exception as e:
            print(f"Error generating speech: {str(e)}")
            return None

    def process_clip(self, audio_bytes: bytes, conversation_history: list = None, conversation_id: str = None, scenario: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process an audio clip through the complete pipeline:
        1. Transcribe
        2. Generate reply
        3. Convert reply to speech
        
        Args:
            audio_bytes: Raw audio bytes from the frontend
            conversation_history: List of previous messages in the conversation
            conversation_id: ID of the conversation (used for filenames)
            scenario: Scenario context for the conversation
            
        Returns:
            Dictionary containing transcript, reply, and audio path
        """
        try:
            start_time = time.time()
            
            # Select a voice for the conversation if one hasn't been selected yet
            if not self.elevenlabs.selected_voice_id:
                voice_id = self.elevenlabs.select_voice_for_conversation()
                print(f"🎭 Selected voice ID for conversation: {voice_id}")

            print("🔤 Transcribing with Whisper...")
            # Convert WebM bytes to PCM using ffmpeg
            cmd = [
                "ffmpeg", "-i", "pipe:0", "-vn",
                "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                "-f", "s16le", "pipe:1"
            ]
            result = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                raise RuntimeError("FFmpeg failed: " + result.stderr.decode())
            pcm_bytes = result.stdout

            # Transcribe using local model
            transcript = self.transcribe_audio_bytes(pcm_bytes)
            if not transcript:
                return {"error": "Failed to transcribe audio"}
            transcribe_time = time.time()
            print(f"⏱️ Transcription time: {transcribe_time - start_time:.2f}s")
            print(f"🗣️ Transcript: {transcript}")

            print("🤖 Generating conversational reply...")
            reply = self.generate_reply(transcript, conversation_history, scenario)
            if not reply:
                return {"error": "Failed to generate reply"}
            generate_time = time.time()
            print(f"⏱️ Reply generation time: {generate_time - transcribe_time:.2f}s")
            print(f"💬 Reply: {reply}")
                
            print("🔊 Creating TTS reply...")
            reply_audio_path = self.speak_reply(reply, conversation_id)
            if not reply_audio_path:
                return {"error": "Failed to generate speech"}
            tts_time = time.time()
            print(f"⏱️ TTS generation time: {tts_time - generate_time:.2f}s")
            print(f"✅ Reply saved to: {reply_audio_path}")

            end_time = time.time()
            print(f"⏱️ Total processing time: {end_time - start_time:.2f}s")

            return {
                "transcript": transcript,
                "reply": reply,
                "reply_audio_path": reply_audio_path
            }
        except Exception as e:
            print(f"Error in process_clip: {str(e)}")
            return {"error": f"Error processing audio: {str(e)}"}

if __name__ == "__main__":
    # Test conversation history
    conversation_history = [
        # {"role": "user", "content": "Hi, how are you doing today?"},
        # {"role": "assistant", "content": "I'm doing great! Just finished a nice walk in the park. How about you?"},
        # {"role": "user", "content": "I'm good, just working on some projects. What kind of projects do you work on?"}
    ]

    # Test with conversation history
    print("\n🧪 Testing with conversation history...")
    input_audio_path = "shortclip1.mp4"  # Your test audio file
    service = TTSService()
    
    # First response with history
    result1 = service.process_clip(input_audio_path, conversation_history)
    print("\n🎯 First Response:")
    print(json.dumps(result1, indent=2))
    
    # Update conversation history with the new exchange
    conversation_history.append({"role": "user", "content": result1["transcript"]})
    conversation_history.append({"role": "assistant", "content": result1["reply"]})
    
    # Second response with updated history
    print("\n🧪 Testing with updated conversation history...")
    result2 = service.process_clip(input_audio_path, conversation_history)
    print("\n🎯 Second Response:")
    print(json.dumps(result2, indent=2))
