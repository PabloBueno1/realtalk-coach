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
import logging
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
import json
import psutil
import GPUtil
import random

# Set all random seeds for reproducibility
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)

# Call this at the start of your application
set_seed(42)

# Custom exceptions
class TTSServiceError(Exception):
    """Base exception for TTS service errors"""
    pass

class TranscriptionError(TTSServiceError):
    """Exception raised for transcription errors"""
    pass

class AudioProcessingError(TTSServiceError):
    """Exception raised for audio processing errors"""
    pass

class ModelInitializationError(TTSServiceError):
    """Exception raised for model initialization errors"""
    pass

class APIError(TTSServiceError):
    """Exception raised for API-related errors"""
    pass

# Enhanced logger setup
def setup_logger():
    logger = logging.getLogger('TTSService')
    logger.setLevel(logging.DEBUG)  # Set to DEBUG to capture all levels
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'tts_service.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Create formatters and add them to the handlers
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)
    
    # Add the handlers to the logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Initialize logger
logger = setup_logger()

# Load environment variables from .env file
try:
    load_dotenv()
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.error(f"Failed to load environment variables: {str(e)}", exc_info=True)
    raise ModelInitializationError("Failed to load environment variables")

# Initialize Whisper model
try:
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    COMPUTE_TYPE = "float32"  # Always use float32 for consistency
    logger.info(f"Initializing Whisper model on {DEVICE} with compute type {COMPUTE_TYPE}")
    
    MODEL = WhisperModel("tiny", device=DEVICE, compute_type=COMPUTE_TYPE, local_files_only=False)
    logger.info("Whisper model initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Whisper model: {str(e)}", exc_info=True)
    raise ModelInitializationError(f"Failed to initialize Whisper model: {str(e)}")

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
logger.info("Warming up Whisper model...")
try:
    # Read the test audio file
    test_file = "carlos.wav"
    if os.path.exists(test_file):
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
        segments, info = MODEL.transcribe(audio_data, beam_size=1, language="en")
        text = " ".join([segment.text for segment in segments])
        warmup_time = time.time() - start_time
        
        logger.info(f"Model warmup complete in {warmup_time:.2f}s")
        logger.info(f"Test transcription: {text}")
    else:
        logger.warning(f"Warning: Test file {test_file} not found, skipping warmup")
except Exception as e:
    logger.warning(f"Warning: Model warmup failed: {str(e)}")
    logger.warning(traceback.format_exc())

def get_memory_usage():
    """Get current memory usage for CPU and GPU."""
    try:
        # CPU memory
        process = psutil.Process()
        cpu_memory = process.memory_info().rss / 1024 / 1024  # Convert to MB
        
        # GPU memory
        gpu_memory = {}
        if torch.cuda.is_available():
            for gpu in GPUtil.getGPUs():
                gpu_memory[f"gpu_{gpu.id}"] = {
                    "total": gpu.memoryTotal,
                    "used": gpu.memoryUsed,
                    "free": gpu.memoryFree
                }
        
        return {
            "cpu_memory_mb": cpu_memory,
            "gpu_memory": gpu_memory
        }
    except Exception as e:
        logger.error(f"Error getting memory usage: {str(e)}")
        return {
            "cpu_memory_mb": None,
            "gpu_memory": None,
            "error": str(e)
        }

def log_memory_usage(operation: str):
    """Log memory usage for a specific operation."""
    memory_info = get_memory_usage()
    logger.info(f"Memory usage during {operation}:")
    logger.info(f"CPU Memory: {memory_info['cpu_memory_mb']:.2f} MB")
    if memory_info['gpu_memory']:
        for gpu_id, gpu_info in memory_info['gpu_memory'].items():
            logger.info(f"{gpu_id} - Total: {gpu_info['total']}MB, Used: {gpu_info['used']}MB, Free: {gpu_info['free']}MB")

class TTSService:
    """
    Main service for handling text-to-speech operations.
    """
    
    def __init__(self):
        try:
            logger.info("Initializing TTSService")
            log_memory_usage("TTSService initialization start")
            self.google_tts = GoogleTTSService()
            self._initialization_time = datetime.now()
            log_memory_usage("TTSService initialization complete")
            logger.info("TTSService initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize TTSService: {str(e)}", exc_info=True)
            raise ModelInitializationError(f"Failed to initialize TTSService: {str(e)}")
    
    def text_to_speech(self, text: str) -> Optional[bytes]:
        """
        Convert text to speech using Google Cloud TTS API.
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Audio bytes or None if generation fails
            
        Raises:
            AudioProcessingError: If audio generation fails
            ValueError: If input text is invalid
        """
        if not text or not isinstance(text, str):
            logger.error(f"Invalid input text: {text}")
            raise ValueError("Input text must be a non-empty string")
            
        try:
            logger.info(f"Converting text to speech: {text[:50]}...")
            log_memory_usage("text_to_speech start")
            start_time = time.time()
            
            result = self.google_tts.text_to_speech(text)
            
            if result is None:
                logger.error("Google TTS returned None")
                raise AudioProcessingError("Google TTS service returned no audio")
                
            generation_time = time.time() - start_time
            log_memory_usage("text_to_speech complete")
            logger.info(f"Text to speech conversion successful in {generation_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error generating speech with Google TTS: {str(e)}", exc_info=True)
            raise AudioProcessingError(f"Error with audio processing: {str(e)}")
    
    def speak_reply(self, text: str) -> Optional[bytes]:
        """
        Generate speech for a reply message.
        
        Args:
            text: Reply text to convert to speech
            
        Returns:
            Audio bytes or None if generation fails
            
        Raises:
            AudioProcessingError: If speech generation fails
            ValueError: If input text is invalid
        """
        if not text or not isinstance(text, str):
            logger.error(f"Invalid input text: {text}")
            raise ValueError("Input text must be a non-empty string")
            
        try:
            logger.info(f"Generating speech for reply: {text[:50]}...")
            start_time = time.time()
            
            result = self.text_to_speech(text)
            
            generation_time = time.time() - start_time
            logger.info(f"Reply speech generated successfully in {generation_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error in speak_reply: {str(e)}", exc_info=True)
            raise AudioProcessingError(f"Error with audio processing: {str(e)}")

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate: int = 16000, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes using OpenAI's Whisper API.
        
        Args:
            audio_bytes (bytes): Raw 16-bit PCM audio data
            sample_rate (int): Audio sample rate (default 16000 Hz)
            language (str): Force language detection (default "en" for English)
            
        Returns:
            str: Transcribed text
            
        Raises:
            TranscriptionError: If transcription fails
            ValueError: If input parameters are invalid
        """
        if not audio_bytes:
            logger.error("Empty audio bytes received")
            raise ValueError("Audio bytes cannot be empty")
            
        if not isinstance(sample_rate, int) or sample_rate <= 0:
            logger.error(f"Invalid sample rate: {sample_rate}")
            raise ValueError("Sample rate must be a positive integer")
            
        try:
            logger.info("Starting audio transcription")
            log_memory_usage("transcribe_audio_bytes start")
            start_time = time.time()
            
            # Convert bytes to numpy array (16-bit PCM to float32)
            try:
                audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                logger.debug(f"Audio data shape: {audio_data.shape}, mean: {np.mean(audio_data):.3f}, std: {np.std(audio_data):.3f}")
            except Exception as e:
                logger.error(f"Error converting audio bytes to numpy array: {str(e)}", exc_info=True)
                raise TranscriptionError(f"Failed to process audio data: {str(e)}")
            
            # Transcribe the audio
            try:
                logger.debug("Calling Whisper model for transcription")
                segments, info = MODEL.transcribe(
                    audio_data,
                    beam_size=1,
                    language=language,
                    task="transcribe"
                )
                
                # Log transcription info
                logger.debug(f"Transcription info: language={info.language}, language_probability={info.language_probability}")
                
                # Get the text from segments
                text = " ".join([segment.text for segment in segments])
                if not text:
                    logger.warning("No transcription text returned")
                    return "I'm sorry, I didn't quite catch that. Could you say it again?"
                
                transcription_time = time.time() - start_time
                log_memory_usage("transcribe_audio_bytes complete")
                logger.info(f"Transcription successful in {transcription_time:.2f}s: {text[:50]}...")
                return text
                
            except Exception as e:
                logger.error(f"Error during Whisper transcription: {str(e)}", exc_info=True)
                raise TranscriptionError(f"Failed to transcribe audio with Whisper: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error during transcription: {str(e)}", exc_info=True)
            raise TranscriptionError(f"Failed to transcribe audio: {str(e)}")

    async def transcribe_audio_bytes_api(self, audio_bytes: bytes, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes using local whisper model.
        
        Args:
            audio_bytes (bytes): Raw 16-bit PCM audio data
            language (str): Force language detection (default "en" for English)
            
        Returns:
            str: Transcribed text
            
        Raises:
            APIError: If API transcription fails
            ValueError: If input parameters are invalid
        """
        if not audio_bytes:
            logger.error("Empty audio bytes received")
            raise ValueError("Audio bytes cannot be empty")
            
        temp_file_path = None
        try:
            logger.info("Starting API transcription")
            start_time = time.time()
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            if not client:
                raise APIError("Failed to initialize OpenAI client")
            
            # Create a temporary file to store the audio
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
                logger.debug(f"Created temporary file: {temp_file_path}")
            
            try:
                # Open the audio file
                with open(temp_file_path, "rb") as audio_file:
                    # Call OpenAI's Whisper API
                    logger.info("Calling OpenAI Whisper API")
                    response = await client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language,
                        response_format="text"
                    )
                    
                    transcription_time = time.time() - start_time
                    logger.info(f"API transcription successful in {transcription_time:.2f}s: {response[:50]}...")
                    return response
                    
            finally:
                # Clean up the temporary file
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    logger.debug(f"Cleaned up temporary file: {temp_file_path}")
                
        except Exception as e:
            logger.error(f"Error during API transcription: {str(e)}", exc_info=True)
            raise APIError(f"Failed to transcribe audio using API: {str(e)}")

    def generate_reply(self, transcript: str, conversation_history: list = None, scenario: Dict[str, Any] = None) -> Optional[str]:
        """
        Generate a conversational reply using GPT-3.5-turbo with streaming.
        
        Args:
            transcript: Input text to generate reply for
            conversation_history: List of previous messages in the conversation
            scenario: Scenario context for the conversation
            
        Returns:
            Generated reply text or None if generation fails
            
        Raises:
            APIError: If reply generation fails
            ValueError: If input parameters are invalid
        """
        if not transcript or not isinstance(transcript, str):
            logger.error(f"Invalid transcript: {transcript}")
            raise ValueError("Transcript must be a non-empty string")
            
        try:
            log_memory_usage("generate_reply start")
            # Extract scenario details
            title = scenario.get("title", "Casual Conversation") if scenario else "Casual Conversation"
            description = scenario.get("description", "A general conversation practice session") if scenario else "A general conversation practice session"
            initial_prompt = scenario.get("initial_prompt", "How have you been?") if scenario else "How have you been?"
            context = scenario.get("context", "A natural conversation setting") if scenario else "A natural conversation setting"
            difficulty_level = scenario.get("difficulty_level", "intermediate") if scenario else "intermediate"
            category = scenario.get("category", "Casual Conversations") if scenario else "Casual Conversations"
            
            logger.info(f"Generating reply for category: {category}, difficulty: {difficulty_level}")
            
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
                logger.debug(f"Using conversation history with {len(conversation_history[-10:])} messages")
            
            # Add current message
            messages.append({"role": "user", "content": transcript})
            
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            if not client:
                raise APIError("Failed to initialize OpenAI client")
            
            # Initialize buffer for sentence collection
            buffer = ""
            full_reply = ""
            start_time = time.time()
            
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
                        try:
                            # Generate TTS for the complete sentence
                            audio_bytes = self.speak_reply(buffer)
                            if audio_bytes:
                                # Send the sentence and its audio to the WebSocket
                                yield {
                                    "sentence": buffer,
                                    "audio_bytes": audio_bytes
                                }
                            buffer = ""
                        except Exception as e:
                            logger.error(f"Error generating speech for sentence: {str(e)}", exc_info=True)
                            yield {
                                "error": f"Error generating speech: {str(e)}"
                            }
            
            # Process any remaining text in the buffer as a final sentence
            if buffer:
                try:
                    audio_bytes = self.speak_reply(buffer)
                    if audio_bytes:
                        yield {
                            "sentence": buffer,
                            "audio_bytes": audio_bytes
                        }
                except Exception as e:
                    logger.error(f"Error generating speech for final sentence: {str(e)}", exc_info=True)
                    yield {
                        "error": f"Error generating speech: {str(e)}"
                    }
            
            generation_time = time.time() - start_time
            log_memory_usage("generate_reply complete")
            logger.info(f"Reply generation completed in {generation_time:.2f}s")
            return full_reply
            
        except Exception as e:
            logger.error(f"Error generating reply: {str(e)}", exc_info=True)
            raise APIError(f"Failed to generate reply: {str(e)}")

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
            
        Raises:
            AudioProcessingError: If audio processing fails
            TranscriptionError: If transcription fails
            APIError: If reply generation fails
            ValueError: If input parameters are invalid
        """
        if not audio_bytes:
            logger.error("Empty audio bytes received")
            raise ValueError("Audio bytes cannot be empty")
            
        try:
            start_time = time.time()
            logger.info("Starting audio clip processing")
            log_memory_usage("process_clip start")
            
            # Log incoming audio data details
            logger.info(f"Received audio data: size={len(audio_bytes)} bytes")
            if len(audio_bytes) > 0:
                logger.debug(f"First 16 bytes: {audio_bytes[:16].hex()}")
            else:
                logger.error("Received empty audio data")
                return {
                    "error": "No audio data received. Please try again. (Code: AUDIO-002)"
                }
            
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
            
            logger.debug("Running ffmpeg conversion")
            try:
                result = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            except subprocess.TimeoutExpired:
                logger.error("FFmpeg conversion timed out")
                return {
                    "error": "Audio processing timed out. Please try again. (Code: FFMPEG-002)"
                }
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr.decode()}")
                # Try alternative approach with more aggressive error handling
                logger.info("Attempting alternative ffmpeg conversion")
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
                
                try:
                    alt_result = subprocess.run(alt_cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                except subprocess.TimeoutExpired:
                    logger.error("Alternative FFmpeg conversion timed out")
                    return {
                        "error": "Audio processing timed out. Please try again. (Code: FFMPEG-003)"
                    }
                
                if alt_result.returncode != 0:
                    logger.error(f"Alternative FFmpeg error: {alt_result.stderr.decode()}")
                    return {
                        "error": "Error processing audio. Please contact support. (Code: FFMPEG-001)"
                    }
                
                pcm_bytes = alt_result.stdout
                logger.info("Alternative ffmpeg conversion successful")
            else:
                pcm_bytes = result.stdout
                logger.info("FFmpeg conversion successful")

            # Transcribe using local model
            logger.info("Starting transcription")
            try:
                transcript = self.transcribe_audio_bytes(pcm_bytes)
                if not transcript:
                    logger.error("Transcription returned empty result")
                    return {
                        "error": "Error transcribing audio. Please contact support. (Code: TRANSCRIBE-001)"
                    }
            except Exception as e:
                logger.error(f"Transcription error: {str(e)}", exc_info=True)
                return {
                    "error": "Error transcribing audio. Please try again. (Code: TRANSCRIBE-002)"
                }

            transcribe_time = time.time()
            log_memory_usage("process_clip after transcription")
            logger.info(f"Transcription completed in {transcribe_time - start_time:.2f}s")
            logger.info(f"Transcript: {transcript}")

            # Generate reply with streaming
            logger.info("Starting reply generation")
            try:
                reply_generator = self.generate_reply(transcript, conversation_history, scenario)
                if not reply_generator:
                    logger.error("Reply generation failed")
                    return {
                        "error": "Error generating reply. Please contact support. (Code: GENERATE-001)",
                        "transcript": transcript
                    }
            except Exception as e:
                logger.error(f"Reply generation error: {str(e)}", exc_info=True)
                return {
                    "error": "Error generating reply. Please try again. (Code: GENERATE-003)",
                    "transcript": transcript
                }
            
            # Get the first chunk to check for errors
            try:
                first_chunk = next(reply_generator)
                if "error" in first_chunk:
                    logger.error(f"Error in first chunk: {first_chunk['error']}")
                    return {
                        "error": first_chunk["error"],
                        "transcript": transcript
                    }
            except StopIteration:
                logger.error("Reply generator stopped after first chunk")
                return {
                    "error": "Error generating reply content. Please contact support. (Code: GENERATE-002)",
                    "transcript": transcript
                }
            except Exception as e:
                logger.error(f"Error processing first chunk: {str(e)}", exc_info=True)
                return {
                    "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: AUDIO-001)",
                    "transcript": transcript
                }
            
            generate_time = time.time()
            log_memory_usage("process_clip after reply generation")
            logger.info(f"Reply generation completed in {generate_time - transcribe_time:.2f}s")
            
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
                        try:
                            yield chunk
                            reply_holder["full_reply"] += chunk.get("sentence", "")
                        except Exception as e:
                            logger.error(f"Error processing chunk: {str(e)}", exc_info=True)
                            yield {"error": f"Error processing response: {str(e)}. Please try again. (Code: STREAM-002)"}
                            break
                    
                    # Add the assistant's response to the conversation history
                    if reply_holder["full_reply"]:
                        updated_history.append({"role": "assistant", "content": reply_holder["full_reply"]})
                        logger.info("Reply generation completed successfully")
                except Exception as e:
                    logger.error(f"Error in generator: {str(e)}", exc_info=True)
                    yield {"error": f"Error with audio processing: {str(e)}. Please contact support. (Code: STREAM-001)"}
            
            # Create the generator but don't run it yet
            generator = wrapped_generator()
            
            # Log total processing time
            total_time = time.time() - start_time
            log_memory_usage("process_clip complete")
            logger.info(f"Total processing time: {total_time:.2f}s")
            
            # Return the generator for streaming along with updated history
            return {
                "transcript": transcript,
                "reply_generator": generator,
                "conversation_history": updated_history,
                "full_reply": reply_holder["full_reply"],  # This will be updated as the generator runs
                "processing_time": total_time
            }
            
        except Exception as e:
            logger.error(f"Error in process_clip: {str(e)}", exc_info=True)
            return {
                "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: PROCESS-001)"
            }
