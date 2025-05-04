import os
import openai
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import uuid
import subprocess
import time
import numpy as np
import torch
from faster_whisper import WhisperModel
import traceback
from .google_tts_service import GoogleTTSService
import tempfile

# Load environment variables from .env file
load_dotenv()

# Initialize Whisper model
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "float32"
print(f"Loading Whisper model on {DEVICE}...")
MODEL = WhisperModel("tiny", device=DEVICE, compute_type=COMPUTE_TYPE, local_files_only=True)

# Category-specific prompts
CATEGORY_PROMPTS = {
    "Professional Meetings": """
        You are roleplaying as a professional colleague or manager in a business meeting.
        Focus on maintaining a professional tone while being collaborative and constructive.
        Use appropriate business terminology and maintain a solution-oriented approach.
        Keep responses concise and to the point while being respectful and diplomatic.
    """,
    "Job Interviews": """
        You are roleplaying as an interviewer for a job position.
        Focus on asking relevant questions about skills, experience, and cultural fit.
        Maintain a professional yet approachable demeanor.
        Provide appropriate follow-up questions based on the candidate's responses.
    """,
    "Casual Conversations": """
        You are roleplaying as a friend or acquaintance in a casual setting.
        Keep the tone friendly and relaxed.
        Show interest in the other person's life and experiences.
        Use natural, conversational language.
    """,
    "Public Speaking": """
        You are roleplaying as an audience member or moderator in a public speaking scenario.
        Provide constructive feedback on delivery and content.
        Ask relevant follow-up questions.
        Maintain an engaged and interested demeanor.
    """,
    "Networking Events": """
        You are roleplaying as a professional contact at a networking event.
        Focus on making meaningful connections and finding common ground.
        Keep the conversation professional but engaging.
        Show genuine interest in the other person's work and goals.
    """,
    "Customer Service": """
        You are roleplaying as a customer service representative.
        Focus on being helpful, patient, and solution-oriented.
        Maintain a professional and friendly tone.
        Guide the conversation toward resolving the customer's needs.
    """,
    "Conflict Resolution": """
        You are roleplaying as a mediator or involved party in a conflict situation.
        Focus on de-escalation and finding common ground.
        Use neutral, non-confrontational language.
        Help guide the conversation toward resolution.
    """,
    "Team Collaboration": """
        You are roleplaying as a team member or project manager in a collaborative setting.
        Focus on effective communication and teamwork.
        Use inclusive language and encourage participation.
        Help guide the conversation toward achieving team goals.
    """
}

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
    Main service for handling text-to-speech operations.
    """
    
    def __init__(self):
        self.google_tts = GoogleTTSService()
        # Pre-generate fallback audio for error cases
        self.fallback_audio = self.google_tts.text_to_speech("I'm sorry, I didn't quite catch that. Could you say it again?")
    
    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech using Google Cloud TTS API.
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Audio bytes or None if generation fails
        """
        try:
            return self.google_tts.text_to_speech(text)
        except Exception as e:
            print(f"Error generating speech with Google TTS: {str(e)}")
            # Instead of returning fallback audio, raise the exception
            raise Exception(f"Error with audio processing: {str(e)}. Please contact support.")
    
    def speak_reply(self, text: str) -> Optional[bytes]:
        """
        Generate speech for a reply message.
        
        Args:
            text: Reply text to convert to speech
            
        Returns:
            Audio bytes or None if generation fails
        """
        try:
            return self.text_to_speech(text)
        except Exception as e:
            print(f"Error in speak_reply: {str(e)}")
            # Instead of returning fallback audio, raise the exception
            raise Exception(f"Error with audio processing: {str(e)}. Please contact support.")

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate: int = 16000, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes using OpenAI's Whisper API.
        
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
            # Return a friendly error message
            return "I'm sorry, I didn't quite catch that. Could you say it again?"

    async def transcribe_audio_bytes_api(self, audio_bytes: bytes, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes using local whisper model.
        
        Args:
            audio_bytes (bytes): Raw 16-bit PCM audio data
            language (str): Force language detection (default "en" for English)
            
        Returns:
            str: Transcribed text
        """
        try:
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Create a temporary file to store the audio
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                # Write the audio bytes to the temporary file
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Open the audio file
                with open(temp_file_path, "rb") as audio_file:
                    # Call OpenAI's Whisper API
                    response = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language,
                        response_format="text"
                    )
                    
                    return response
                    
            finally:
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            print(f"Error during API transcription: {traceback.format_exc()}")
            raise Exception(f"Failed to transcribe audio using API: {str(e)}")

    def generate_reply(self, transcript: str, conversation_history: list = None, scenario: Dict[str, Any] = None) -> Optional[str]:
        """
        Generate a conversational reply using GPT-3.5-turbo with streaming.
        
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
            category = scenario.get("category", "Casual Conversations") if scenario else "Casual Conversations"
            
            # Get category-specific prompt
            category_prompt = CATEGORY_PROMPTS.get(category, CATEGORY_PROMPTS["Casual Conversations"])
            
            # Prepare system message with scenario context
            system_message = f"""
                {category_prompt}

                You are roleplaying in the following conversation scenario:

                • Title: {title}
                • Description: {description}
                • Initial Prompt: {initial_prompt}
                • Context: {context}
                • Difficulty: {difficulty_level}

                Follow these strict rules:

                Stay in character — you are the other person in this interaction. Do NOT take the user's perspective.
                Reply naturally — keep your responses short (1–3 sentences), realistic, and emotionally appropriate for the scene.
                Do NOT explain, summarize the scenario, give advice, or mention anything about AI or technology.
                Speak with your own personality — have thoughts, feelings, and reactions that fit the character you're playing.
                Guide the conversation — respond in a way that keeps the interaction flowing and helps the user work toward the natural goal of the situation.
                Do NOT break character. Ever. You are in the conversation.

                You are a real person speaking to the user in this situation. Speak directly to them, in character.
            """
            
            # Prepare messages with history
            messages = [
                {"role": "system", "content": system_message}
            ]
            
            # Add conversation history if provided
            if conversation_history:
                # Keep a reasonable window of conversation history
                # Include the last 5 exchanges (10 messages) to maintain better context
                messages.extend(conversation_history[-10:])
            
            # Add current message
            messages.append({"role": "user", "content": transcript})
            
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Initialize buffer for sentence collection
            buffer = ""
            full_reply = ""
            
            # Stream the response
            stream = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=350,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    token = chunk.choices[0].delta.content
                    buffer += token
                    full_reply += token
                    
                    # Only yield when we have a complete sentence
                    if token in [".", "!", "?"]:
                        # Generate TTS for the complete sentence
                        audio_bytes = self.speak_reply(buffer)
                        if audio_bytes:
                            # Send the sentence and its audio to the WebSocket
                            yield {
                                "sentence": buffer,
                                "audio_bytes": audio_bytes
                            }
                        buffer = ""
            
            # Process any remaining text in the buffer as a final sentence
            if buffer:
                audio_bytes = self.speak_reply(buffer)
                if audio_bytes:
                    yield {
                        "sentence": buffer,
                        "audio_bytes": audio_bytes
                    }
            
            return full_reply
            
        except Exception as e:
            print(f"Error generating reply: {str(e)}")
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
            
            # Convert WebM bytes to PCM using ffmpeg with more robust settings
            cmd = [
                "ffmpeg", 
                "-f", "webm",  # Explicitly specify input format
                "-i", "pipe:0", 
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # PCM 16-bit
                "-ar", "16000",  # 16kHz sample rate
                "-ac", "1",  # Mono
                "-fflags", "+genpts+igndts+discardcorrupt",  # Ignore corrupt packets
                "-err_detect", "ignore_err",  # Ignore errors
                "-f", "s16le",  # Force output format
                "pipe:1"
            ]
            
            result = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr.decode()}")
                # Try alternative approach with more aggressive error handling
                alt_cmd = [
                    "ffmpeg", 
                    "-f", "webm",  # Explicitly specify input format
                    "-i", "pipe:0", 
                    "-vn",  # No video
                    "-acodec", "pcm_s16le",  # PCM 16-bit
                    "-ar", "16000",  # 16kHz sample rate
                    "-ac", "1",  # Mono
                    "-fflags", "+genpts+igndts+discardcorrupt+fastseek",  # More aggressive error handling
                    "-err_detect", "ignore_err",  # Ignore errors
                    "-max_muxing_queue_size", "1024",  # Increase queue size
                    "-f", "s16le",  # Force output format
                    "pipe:1"
                ]
                
                alt_result = subprocess.run(alt_cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                
                if alt_result.returncode != 0:
                    print(f"Alternative FFmpeg error: {alt_result.stderr.decode()}")
                    # Return a proper error message instead of fallback audio
                    return {
                        "error": "Error processing audio. Please contact support. (Code: FFMPEG-001)"
                    }
                
                pcm_bytes = alt_result.stdout
            else:
                pcm_bytes = result.stdout

            # Transcribe using local model
            transcript = self.transcribe_audio_bytes(pcm_bytes)
            if not transcript:
                return {
                    "error": "Error transcribing audio. Please contact support. (Code: TRANSCRIBE-001)"
                }
            transcribe_time = time.time()
            print(f"⏱️ Transcription time: {transcribe_time - start_time:.2f}s")
            print(f"🗣️ Transcript: {transcript}")

            # Generate reply with streaming
            reply_generator = self.generate_reply(transcript, conversation_history, scenario)
            if not reply_generator:
                return {
                    "error": "Error generating reply. Please contact support. (Code: GENERATE-001)",
                    "transcript": transcript
                }
            
            # Get the first chunk to check for errors
            try:
                first_chunk = next(reply_generator)
                if "error" in first_chunk:
                    return {
                        "error": first_chunk["error"],
                        "transcript": transcript
                    }
            except StopIteration:
                return {
                    "error": "Error generating reply content. Please contact support. (Code: GENERATE-002)",
                    "transcript": transcript
                }
            except Exception as e:
                return {
                    "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: AUDIO-001)",
                    "transcript": transcript
                }
            
            generate_time = time.time()
            print(f"⏱️ Reply generation time: {generate_time - transcribe_time:.2f}s")
            
            # Update conversation history with the new exchange
            updated_history = list(conversation_history) if conversation_history else []
            updated_history.append({"role": "user", "content": transcript})
            
            # Create a holder for the full reply that can be accessed from inside the generator
            reply_holder = {"full_reply": ""}
            
            # Create a wrapper generator that collects the full reply
            def wrapped_generator():
                nonlocal reply_holder
                try:
                    # Yield the first chunk we already got
                    yield first_chunk
                    reply_holder["full_reply"] += first_chunk.get("sentence", "")
                    
                    # Process remaining chunks
                    for chunk in reply_generator:
                        yield chunk
                        reply_holder["full_reply"] += chunk.get("sentence", "")
                    
                    # Add the assistant's response to the conversation history
                    updated_history.append({"role": "assistant", "content": reply_holder["full_reply"]})
                except Exception as e:
                    print(f"Error in generator: {str(e)}")
                    # Pass the actual error message through
                    yield {"error": f"Error with audio processing: {str(e)}. Please contact support. (Code: STREAM-001)"}
            
            # Create the generator but don't run it yet
            generator = wrapped_generator()
            
            # Return the generator for streaming along with updated history
            return {
                "transcript": transcript,
                "reply_generator": generator,
                "conversation_history": updated_history,
                "full_reply": reply_holder["full_reply"]  # This will be updated as the generator runs
            }
            
        except Exception as e:
            print(f"Error in process_clip: {str(e)}")
            return {
                "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: PROCESS-001)"
            }
