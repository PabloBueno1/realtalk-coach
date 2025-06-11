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
import wave

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
    logger.setLevel(logging.INFO)  # Changed to INFO level
    
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'tts_service.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Create formatters and add them to the handlers
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
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
    logger.error(f"Failed to load environment variables: {str(e)}")
    raise ModelInitializationError("Failed to load environment variables")

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

# Model warmup
logger.info("Warming up models...")
try:
    # Path to the warmup audio file
    warmup_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'carlos.mp4')
    
    if os.path.exists(warmup_file):
        # Read the warmup file
        with open(warmup_file, 'rb') as f:
            audio_bytes = f.read()
        
        # Convert to PCM using ffmpeg
        cmd = [
            "ffmpeg",
            "-f", "mp4",
            "-i", "pipe:0",
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-f", "s16le",
            "pipe:1"
        ]
        
        result = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        pcm_bytes = result.stdout
        
        # Warm up transcription
        logger.info("Warming up transcription model")
        start_time = time.time()
        
        # Create a temporary file for the audio data
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file_path = temp_file.name

            ffmpeg_cmd = [
                "ffmpeg",
                "-f", "s16le",
                "-ar", "16000",
                "-ac", "1",
                "-i", "pipe:0",
                "-y",
                temp_file_path
            ]

            subprocess.run(ffmpeg_cmd, input=pcm_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Run Whisper.cpp command
        output_prefix = os.path.join(tempfile.gettempdir(), f"whisper_output_{uuid.uuid4()}")
        
        cmd = [
            "/opt/whisper.cpp/build/bin/whisper-cli",
            "-m", "/opt/whisper.cpp/models/ggml-base.en.bin",
            "-l", "en",
            "--output-txt",
            "-of", output_prefix,
            "-t", "4",
            "-p", "1",
            "-pp",
            temp_file_path
        ]
        
        # Add environment variables for GPU
        env = os.environ.copy()
        env["CUDA_VISIBLE_DEVICES"] = "0"
        env["GGML_CUDA"] = "1"
        env["WHISPER_CUBLAS"] = "1"
        env["WHISPER_CUDA"] = "1"
        
        logger.info("Starting Whisper.cpp transcription")
        subprocess.run(cmd, capture_output=True, text=True, env=env)
        
        warmup_time = time.time() - start_time
        logger.info(f"Transcription model warmup complete in {warmup_time:.2f}s")
        
    else:
        logger.warning(f"Warning: Warmup file not found at {warmup_file}, skipping warmup")
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
    logger.info(f"Memory usage during {operation}: CPU: {memory_info['cpu_memory_mb']:.2f} MB")
    if memory_info['gpu_memory']:
        for gpu_id, gpu_info in memory_info['gpu_memory'].items():
            logger.info(f"{gpu_id} - Used: {gpu_info['used']}MB, Free: {gpu_info['free']}MB")

class TTSService:
    """
    Main service for handling text-to-speech operations.
    """
    
    def __init__(self):
        try:
            logger.info("Initializing TTSService")
            self.google_tts = GoogleTTSService()
            self._initialization_time = datetime.now()
            logger.info("TTSService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize TTSService: {str(e)}")
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
            start_time = time.time()
            
            result = self.google_tts.text_to_speech(text)
            
            if result is None:
                logger.error("Google TTS returned None")
                raise AudioProcessingError("Google TTS service returned no audio")
                
            generation_time = time.time() - start_time
            logger.info(f"Text to speech conversion successful in {generation_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Error generating speech with Google TTS: {str(e)}")
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
            logger.error(f"Error in speak_reply: {str(e)}")
            raise AudioProcessingError(f"Error with audio processing: {str(e)}")

    def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate: int = 16000, language: str = "en") -> str:
        """
        Transcribe raw PCM audio bytes using Whisper.cpp.
        
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
            
        temp_file_path = None
        output_file = None
        
        try:
            logger.info("Starting audio transcription with Whisper.cpp")
            start_time = time.time()
            
            # Create a temporary file for the audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file_path = temp_file.name

                ffmpeg_cmd = [
                    "ffmpeg",
                    "-f", "s16le",
                    "-ar", str(sample_rate),
                    "-ac", "1",
                    "-i", "pipe:0",
                    "-y",
                    temp_file_path
                ]

                result = subprocess.run(ffmpeg_cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if result.returncode != 0:
                    logger.error(f"FFmpeg WAV wrapping failed: {result.stderr.decode()}")
                    raise AudioProcessingError("Failed to wrap PCM into WAV before transcription")
            
            # Run Whisper.cpp command
            output_prefix = os.path.join(tempfile.gettempdir(), f"whisper_output_{uuid.uuid4()}")
            
            cmd = [
                "/opt/whisper.cpp/build/bin/whisper-cli",
                "-m", "/opt/whisper.cpp/models/ggml-base.en.bin",
                "-l", language,
                "--output-txt",
                "-of", output_prefix,
                "-t", "4",
                "-p", "1",
                "-pp",
                temp_file_path
            ]
            
            # Add environment variables for GPU
            env = os.environ.copy()
            env["CUDA_VISIBLE_DEVICES"] = "0"
            env["GGML_CUDA"] = "1"
            env["WHISPER_CUBLAS"] = "1"
            env["WHISPER_CUDA"] = "1"
            
            logger.info("Starting Whisper.cpp transcription")
            
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, env=env)
                
                if result.returncode != 0:
                    error_msg = result.stderr.strip() or result.stdout.strip() or "Unknown error"
                    logger.error(f"Whisper.cpp failed: {error_msg}")
                    raise TranscriptionError(f"Whisper.cpp failed: {error_msg}")
                
                # Read the transcription from the output file
                output_file = output_prefix + ".txt"
                if not os.path.exists(output_file):
                    raise TranscriptionError("Whisper.cpp output file not found")
                
                with open(output_file, 'r') as f:
                    transcript = f.read().strip()
                
                if not transcript:
                    logger.warning("Empty transcription returned")
                    return "I'm sorry, I didn't quite catch that. Could you say it again?"
                
                transcription_time = time.time() - start_time
                logger.info(f"Transcription successful in {transcription_time:.2f}s: {transcript[:50]}...")
                return transcript
                
            except subprocess.TimeoutExpired:
                logger.error("Whisper.cpp timed out after 5 minutes")
                raise TranscriptionError("Transcription timed out")
            except Exception as e:
                logger.error(f"Unexpected error running Whisper.cpp: {str(e)}")
                raise TranscriptionError(f"Failed to run Whisper.cpp: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error during transcription: {str(e)}")
            raise TranscriptionError(f"Failed to transcribe audio: {str(e)}")
            
        finally:
            # Clean up temporary files
            try:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                if output_file and os.path.exists(output_file):
                    os.unlink(output_file)
            except Exception as e:
                logger.warning(f"Error cleaning up temporary files: {str(e)}")

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
            
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            if not client:
                raise APIError("Failed to initialize OpenAI client")
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            try:
                with open(temp_file_path, "rb") as audio_file:
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
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                
        except Exception as e:
            logger.error(f"Error during API transcription: {str(e)}")
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
            # Extract scenario details
            title = scenario.get("title", "Casual Conversation") if scenario else "Casual Conversation"
            category = scenario.get("category", "Casual Conversations") if scenario else "Casual Conversations"
            
            logger.info(f"Generating reply for category: {category}")
            
            # Get category-specific prompt
            category_prompt = CATEGORY_PROMPTS.get(category, CATEGORY_PROMPTS["Casual Conversations"])
            
            # Prepare system message with scenario context
            system_message = f"""
                {category_prompt}

                You are roleplaying in the following conversation scenario:

                • Title: {title}
                • Category: {category}
                • Initial Prompt: {scenario.get('initial_prompt', '') if scenario else ''}

                Follow these strict rules:

                Stay in character — you are the other person in this interaction. Do NOT take the user's perspective.
                Reply naturally — keep your responses short (1–3 sentences), realistic, and emotionally appropriate for the scene.
                Do NOT explain, summarize the scenario, give advice, or mention anything about AI or technology.
                Speak with your own personality — have thoughts, feelings, and reactions that fit the character you're playing.
                Guide the conversation — respond in a way that keeps the interaction flowing and helps the user work toward the natural goal of the situation.
                Do NOT break character. Ever. You are in the conversation.
                Remember that you started the conversation with: "{scenario.get('initial_prompt', '') if scenario else ''}"

                You are a real person speaking to the user in this situation. Speak directly to them, in character.
            """
            
            messages = [
                {"role": "system", "content": system_message}
            ]
            
            if conversation_history:
                messages.extend(conversation_history[-10:])
            
            messages.append({"role": "user", "content": transcript})
            
            client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            if not client:
                raise APIError("Failed to initialize OpenAI client")
            
            buffer = ""
            full_reply = ""
            start_time = time.time()
            
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
                    
                    if token in [".", "!", "?"]:
                        try:
                            audio_bytes = self.speak_reply(buffer)
                            if audio_bytes:
                                yield {
                                    "sentence": buffer,
                                    "audio_bytes": audio_bytes
                                }
                            buffer = ""
                        except Exception as e:
                            logger.error(f"Error generating speech for sentence: {str(e)}")
                            yield {
                                "error": f"Error generating speech: {str(e)}"
                            }
            
            if buffer:
                try:
                    audio_bytes = self.speak_reply(buffer)
                    if audio_bytes:
                        yield {
                            "sentence": buffer,
                            "audio_bytes": audio_bytes
                        }
                except Exception as e:
                    logger.error(f"Error generating speech for final sentence: {str(e)}")
                    yield {
                        "error": f"Error generating speech: {str(e)}"
                    }
            
            generation_time = time.time() - start_time
            logger.info(f"Reply generation completed in {generation_time:.2f}s")
            return full_reply
            
        except Exception as e:
            logger.error(f"Error generating reply: {str(e)}")
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
            
            # Convert WebM bytes to PCM using ffmpeg
            cmd = [
                "ffmpeg", 
                "-f", "webm",
                "-i", "pipe:0", 
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                "-fflags", "+genpts+igndts+discardcorrupt",
                "-err_detect", "ignore_err",
                "-f", "s16le",
                "pipe:1"
            ]
            
            try:
                result = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            except subprocess.TimeoutExpired:
                logger.error("FFmpeg conversion timed out")
                return {
                    "error": "Audio processing timed out. Please try again. (Code: FFMPEG-002)"
                }
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr.decode()}")
                return {
                    "error": "Error processing audio. Please contact support. (Code: FFMPEG-001)"
                }
            
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
                logger.error(f"Transcription error: {str(e)}")
                return {
                    "error": "Error transcribing audio. Please try again. (Code: TRANSCRIBE-002)"
                }

            transcribe_time = time.time()
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
                logger.error(f"Reply generation error: {str(e)}")
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
                logger.error(f"Error processing first chunk: {str(e)}")
                return {
                    "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: AUDIO-001)",
                    "transcript": transcript
                }
            
            generate_time = time.time()
            logger.info(f"Reply generation completed in {generate_time - transcribe_time:.2f}s")
            
            # Update conversation history with the new exchange
            updated_history = list(conversation_history) if conversation_history else []
            updated_history.append({"role": "user", "content": transcript})
            
            # Create a holder for the full reply
            reply_holder = {"full_reply": ""}
            
            def wrapped_generator():
                nonlocal reply_holder
                try:
                    yield first_chunk
                    reply_holder["full_reply"] += first_chunk.get("sentence", "")
                    
                    for chunk in reply_generator:
                        try:
                            yield chunk
                            reply_holder["full_reply"] += chunk.get("sentence", "")
                        except Exception as e:
                            logger.error(f"Error processing chunk: {str(e)}")
                            yield {"error": f"Error processing response: {str(e)}. Please try again. (Code: STREAM-002)"}
                            break
                    
                    if reply_holder["full_reply"]:
                        updated_history.append({"role": "assistant", "content": reply_holder["full_reply"]})
                        logger.info("Reply generation completed successfully")
                except Exception as e:
                    logger.error(f"Error in generator: {str(e)}")
                    yield {"error": f"Error with audio processing: {str(e)}. Please contact support. (Code: STREAM-001)"}
            
            generator = wrapped_generator()
            
            total_time = time.time() - start_time
            logger.info(f"Total processing time: {total_time:.2f}s")
            
            return {
                "transcript": transcript,
                "reply_generator": generator,
                "conversation_history": updated_history,
                "full_reply": reply_holder["full_reply"],
                "processing_time": total_time
            }
            
        except Exception as e:
            logger.error(f"Error in process_clip: {str(e)}")
            return {
                "error": f"Error with audio processing: {str(e)}. Please contact support. (Code: PROCESS-001)"
            }
