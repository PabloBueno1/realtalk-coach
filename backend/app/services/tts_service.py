import os
import openai
import tempfile
import json
from typing import Dict, Any, Optional
from pydub import AudioSegment
from dotenv import load_dotenv
import uuid
from app.services.elevenlabs_service import ElevenLabsService

# Load environment variables from .env file
load_dotenv()

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

    def convert_to_wav(self, input_path: str, output_path: str = None) -> Optional[str]:
        """
        Convert input audio file to WAV format.
        
        Args:
            input_path: Path to input audio file
            output_path: Path to save WAV file (default: None, will use input_path with .wav extension)
            
        Returns:
            Path to converted WAV file or None if conversion fails
        """
        try:
            # If no output path is provided, use the input path with .wav extension
            if output_path is None:
                # Extract the base name without extension
                base_name = os.path.splitext(input_path)[0]
                output_path = f"{base_name}.wav"
            
            # Check file extension to determine format
            file_extension = os.path.splitext(input_path)[1].lower()
            print(f"Converting file with extension: {file_extension}")
            
            # Special handling for WebM files
            if file_extension == '.webm':
                print("Detected WebM file, using special handling...")
                try:
                    # Use ffmpeg directly to extract audio from WebM
                    import subprocess
                    temp_output = f"{os.path.splitext(output_path)[0]}_temp.wav"
                    
                    # Extract audio only from WebM
                    cmd = [
                        "ffmpeg", 
                        "-i", input_path, 
                        "-vn",  # No video
                        "-acodec", "pcm_s16le",  # PCM 16-bit
                        "-ar", "16000",  # 16kHz sample rate
                        "-ac", "1",  # Mono
                        "-y",  # Overwrite output file
                        temp_output
                    ]
                    
                    print(f"Running command: {' '.join(cmd)}")
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        print(f"FFmpeg error: {result.stderr}")
                        raise Exception(f"FFmpeg failed with return code {result.returncode}")
                    
                    # Rename temp file to final output
                    if os.path.exists(temp_output):
                        if os.path.exists(output_path):
                            os.remove(output_path)
                        os.rename(temp_output, output_path)
                        print(f"Successfully converted WebM to WAV: {output_path}")
                        return output_path
                    else:
                        raise Exception("FFmpeg did not produce output file")
                        
                except Exception as e:
                    print(f"Error in WebM conversion: {str(e)}")
                    # Fall back to pydub if ffmpeg fails
            
            # Try to detect the file format
            try:
                # First attempt: try to load directly with pydub
                print(f"Attempting to load file directly with pydub...")
                audio = AudioSegment.from_file(input_path)
            except Exception as e1:
                print(f"First attempt failed: {str(e1)}")
                
                # Second attempt: try with explicit format based on extension
                try:
                    format_map = {
                        '.webm': 'webm',
                        '.mp4': 'mp4',
                        '.mp3': 'mp3',
                        '.wav': 'wav',
                        '.ogg': 'ogg',
                        '.m4a': 'm4a'
                    }
                    
                    format_to_use = format_map.get(file_extension, 'webm')
                    print(f"Second attempt: trying with explicit format '{format_to_use}'...")
                    audio = AudioSegment.from_file(input_path, format=format_to_use)
                except Exception as e2:
                    print(f"Second attempt failed: {str(e2)}")
                    
                    # Third attempt: try with raw data
                    try:
                        print("Third attempt: trying with raw PCM data...")
                        # Try to read as raw PCM data
                        with open(input_path, 'rb') as f:
                            audio = AudioSegment.from_raw(f.read(), sample_width=2, frame_rate=44100, channels=1)
                    except Exception as e3:
                        print(f"Third attempt failed: {str(e3)}")
                        raise Exception(f"All conversion attempts failed: {str(e1)}, {str(e2)}, {str(e3)}")
            
            # Export to WAV with specific parameters for better compatibility
            print(f"Exporting to WAV: {output_path}")
            audio = audio.set_frame_rate(16000).set_channels(1)  # Convert to 16kHz mono
            audio.export(output_path, format="wav")
            print(f"Successfully exported to WAV: {output_path}")
            return output_path
        except Exception as e:
            print(f"Error converting audio to WAV: {str(e)}")
            return None

    def transcribe_audio(self, audio_path: str) -> Optional[str]:
        """
        Transcribe audio file using OpenAI's GPT-4o-mini-transcribe model.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcribed text or None if transcription fails
        """
        try:
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY environment variable is not set")
                
            with open(audio_path, "rb") as f:
                client = openai.OpenAI(api_key=self.api_key)
                transcript = client.audio.transcriptions.create(
                    model="gpt-4o-mini-transcribe",
                    file=f,
                    language="en",
                    temperature=0
                )
            return transcript.text
        except Exception as e:
            print(f"Error during transcription: {str(e)}")
            return None

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

    def process_clip(self, input_audio_path: str, conversation_history: list = None, conversation_id: str = None, scenario: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process an audio clip through the complete pipeline:
        1. Convert to WAV
        2. Transcribe
        3. Generate reply
        4. Convert reply to speech
        
        Args:
            input_audio_path: Path to input audio file
            conversation_history: List of previous messages in the conversation
            conversation_id: ID of the conversation (used for filenames)
            scenario: Scenario context for the conversation
            
        Returns:
            Dictionary containing transcript, reply, and audio path
        """
        try:
            # Select a voice for the conversation if one hasn't been selected yet
            if not self.elevenlabs.selected_voice_id:
                voice_id = self.elevenlabs.select_voice_for_conversation()
                print(f"🎭 Selected voice ID for conversation: {voice_id}")

            print("🎧 Converting input to WAV format...")
            wav_path = self.convert_to_wav(input_audio_path)
            if not wav_path:
                return {"error": "Failed to convert audio to WAV"}

            print("🔤 Transcribing with Whisper...")
            transcript = self.transcribe_audio(wav_path)
            if not transcript:
                return {"error": "Failed to transcribe audio"}
            print(f"🗣️ Transcript: {transcript}")

            print("🤖 Generating conversational reply...")
            reply = self.generate_reply(transcript, conversation_history, scenario)
            if not reply:
                return {"error": "Failed to generate reply"}
            print(f"💬 Reply: {reply}")
                
            print("🔊 Creating TTS reply...")
            reply_audio_path = self.speak_reply(reply, conversation_id)
            if not reply_audio_path:
                return {"error": "Failed to generate speech"}
            print(f"✅ Reply saved to: {reply_audio_path}")

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
