import os
import openai
import json
from typing import Dict, Any, Tuple
from dotenv import load_dotenv
import uuid
from datetime import datetime
import logging

# Set up logging - only log warnings and above
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.warning("OPENAI_API_KEY environment variable is not set")

def analyze_text_feedback_from_json(data: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
    """
    Given a JSON dict containing 'transcript', 'metrics', and 'scenario', return GPT feedback.
    Returns a tuple of (text_feedback, scores_dict)
    """
    try:
        transcript = data["transcript"]
        metrics = data["metrics"]
        scenario = data.get("scenario", {})
        
        # Extract scenario details
        title = scenario.get("title", "Casual Conversation")
        description = scenario.get("description", "A general conversation practice session")
        initial_prompt = scenario.get("initial_prompt", "How have you been?")
        context = scenario.get("context", "A natural conversation setting")
        difficulty_level = scenario.get("difficulty_level", "intermediate")
        
        # Ensure all metrics are properly formatted
        total_duration = float(metrics.get('total_duration', 0))
        speaking_time = float(metrics.get('speaking_time', 0))
        speaking_rate = float(metrics.get('speaking_rate', 0))
        average_volume = float(metrics.get('average_volume_dbfs', 0))
        num_pauses = int(metrics.get('num_pauses', 0))
        word_count = int(metrics.get('word_count', 0))

        prompt = f"""
        You are an expert evaluator assessing a speaker's verbal communication skills during a practice scenario.

        You are given:
        - Scenario context (title, description, prompt, and difficulty)
        - The speaker's transcript
        - Audio delivery metrics

        Your task:
        1. Provide a concise, objective critique (3-6 sentences) addressing:
        - Content quality: relevance, clarity, and alignment with the prompt
        - Verbal delivery: fluency, confidence, and articulation
        - Pacing: speaking rate and appropriateness for the scenario
        - Volume: audibility and consistency
        - Pausing: natural flow vs. disruptive gaps
        - Overall performance given the difficulty level

        2. Assign a score (0 = poor, 5 = excellent) for each of the following:
        - fluency_score
        - confidence_score
        - clarity_score
        - content_score
        - pace_score
        - volume_score
        - pause_score
        - overall_score

        Output Format:

        Written Feedback:
        <Direct, scenario-aware performance critique>

        Scores (JSON):
        {{
        "fluency_score": ...,
        "confidence_score": ...,
        "clarity_score": ...,
        "content_score": ...,
        "pace_score": ...,
        "volume_score": ...,
        "pause_score": ...,
        "overall_score": ...
        }}

        Input Data:

        Scenario Details:
        Title: {title}
        Description: {description}
        Initial Prompt: {initial_prompt}
        Context: {context}
        Difficulty Level: {difficulty_level}

        Transcript:
        "{transcript or 'No transcript available'}"

        Audio Metrics:
        - Word count: {int(word_count)}
        - Total duration: {float(total_duration):.2f} seconds
        - Speaking time: {float(speaking_time):.2f} seconds
        - Speaking rate: {float(speaking_rate):.2f} words/second
        - Average volume: {float(average_volume):.2f} dBFS
        - Number of pauses: {int(num_pauses)}
"""

        # Use the new OpenAI API format
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a speech and communication coach."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=400
        )
        
        feedback_text = response.choices[0].message.content
        
        # Extract the text feedback and JSON scores
        try:
            # Split the response into feedback and scores
            feedback_part = feedback_text.split("Scores (JSON):")[0].replace("Written Feedback:", "").strip()
            scores_part = feedback_text.split("Scores (JSON):")[1].strip()
            
            # Parse the JSON scores
            scores_dict = json.loads(scores_part)
            
            return feedback_part, scores_dict
        except Exception as e:
            print(f"Error parsing GPT response: {str(e)}")
            return feedback_text, {}

    except Exception as e:
        print(f"Error generating GPT feedback: {str(e)}")
        return "Error generating feedback.", {}

async def generate_visual_feedback(speech_session_id: str, visual_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate GPT feedback for visual analysis"""
    try:
        # Extract metrics from visual data
        metrics = visual_data.get("metrics", {})
        
        # Extract posture metrics
        posture = metrics.get("posture", {})
        alignment = posture.get("alignment", 0.0)
        levelness = posture.get("levelness", 0.0)
        twist = posture.get("twist", 0.0)
        vertical = posture.get("vertical", 0.0)
        ear_shoulder_vertical = posture.get("ear_shoulder_vertical", 0.0)
        depth_stability = posture.get("depth_stability", 0.0)
        
        # Extract eye contact metrics
        eye_contact = metrics.get("eye_contact", {})
        eye_contact_quality = eye_contact.get("quality_percentage", 0.0)
        good_frames = eye_contact.get("good_frames", 0)
        total_frames = eye_contact.get("total_frames", 0)
        
        # Extract emotion metrics
        emotions = metrics.get("emotions", {})
        smile_percentage = emotions.get("happy", 0.0)
        neutral_percentage = emotions.get("neutral", 0.0)
        
        # Extract visibility metrics
        face_visibility = metrics.get("face_visibility", {})
        visibility_percentage = face_visibility.get("percentage", 0.0)
        
        # Extract blink metrics
        blink_detection = metrics.get("blink_detection", {})
        normal_blinks = blink_detection.get("normal_blinks", 0)
        fast_blinks = blink_detection.get("fast_blinks", 0)
        total_blinks = blink_detection.get("total_blinks", 0)
        
        # Extract yawn metrics
        yawn_detection = metrics.get("yawn_detection", {})
        total_yawns = yawn_detection.get("total_yawns", 0)
        
        # Extract restlessness metrics
        restlessness = metrics.get("restlessness", {})
        gaze_shifts = restlessness.get("gaze_shifts", 0)
        gaze_shift_frequency = restlessness.get("gaze_shift_frequency", 0.0)
        avg_iris_movement = restlessness.get("avg_iris_movement", 0.0)
        max_iris_movement = restlessness.get("max_iris_movement", 0.0)
        
        # Call GPT API
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """You are a speech and communication coach. You must follow these response format rules exactly:

                1. Your response must have exactly two parts, separated by "Scores (JSON):"
                2. The first part must be your written feedback, starting with "Written Feedback:"
                3. The second part must be a valid JSON object containing the scores
                4. Do not include any other text or explanations outside these two parts"""},
                {"role": "user", "content": f"""
        You are an expert communication coach evaluating a speaker's visual performance based on detailed behavioral metrics.

        Below are the extracted metrics with descriptions:

        **Posture Metrics** *(lower is better — less movement or misalignment)*:
        - Alignment: {alignment:.3f} — horizontal offset between nose and shoulder midpoint
        - Levelness: {levelness:.3f} — vertical imbalance between left and right shoulders
        - Twist: {twist:.3f} — torso rotation, measured as z-depth difference between shoulders
        - Vertical: {vertical:.3f} — vertical difference between nose and shoulder midpoint
        - Ear-Shoulder Vertical: {ear_shoulder_vertical:.3f} — head tilt relative to shoulder line
        - Depth Stability: {depth_stability:.3f} — front-back movement of the torso across frames

        **Eye Contact & Gaze Stability**:
        - Eye Contact Quality: {eye_contact_quality:.1f}% — % of frames with direct, forward gaze and open eyes
        - Good Eye Contact Frames: {good_frames}/{total_frames} — # of visually engaged frames
        - Gaze Shifts: {gaze_shifts} — count of significant eye direction changes
        - Gaze Shift Frequency: {gaze_shift_frequency:.3f} — average rate of gaze changes per frame
        - Avg Iris Movement: {avg_iris_movement:.3f} — average distance the iris moves between frames
        - Max Iris Movement: {max_iris_movement:.3f} — largest single iris movement detected

        **Facial Expression & Engagement**:
        - Smile: {smile_percentage:.1f}% — % of time face showed happy expressions
        - Neutral: {neutral_percentage:.1f}% — % of time with no strong emotion
        - Normal Blinks: {normal_blinks} — slow, standard blinks
        - Fast Blinks: {fast_blinks} — rapid blinking often tied to anxiety or discomfort
        - Yawns Detected: {total_yawns} — potential signs of fatigue or boredom

        **Visibility**:
        - Face Visibility: {visibility_percentage:.1f}% — % of time face was clearly visible and properly framed

        ---

        **Your task:**

        1. Write a concise, constructive critique (3-6 sentences) covering:
        - Posture and body presence
        - Eye contact and gaze behavior
        - Facial expression and emotional engagement
        - Overall visual presentation

        2. Assign performance scores in JSON format (1 = poor, 5 = excellent)

        Your response must follow this exact format:

        Written Feedback:
        [Your feedback text here]

        Scores (JSON):
        {{
        "eye_contact_score": ...,
        "smile_score": ...,
        "posture_score": ...,
        "expression_score": ...,
        "visibility_score": ...,
        "overall_score": ...
        }}

        Do not include any other text or explanations."""}
            ],
            temperature=0.7,
            max_tokens=400
        )
        
        feedback_text = response.choices[0].message.content
        
        # Log the raw GPT response
        logger.warning(f"GPT Response: {feedback_text}")
        
        try:
            # Split the response into feedback and scores
            feedback_part = feedback_text.split("Scores (JSON):")[0].replace("Written Feedback:", "").strip()
            scores_part = feedback_text.split("Scores (JSON):")[1].strip()
            
            # Parse the JSON scores
            scores_dict = json.loads(scores_part)
            
            # Create feedback data matching the schema
            feedback_data = {
                "id": str(uuid.uuid4()),
                "session_id": speech_session_id,
                "eye_contact_score": round(scores_dict.get("eye_contact_score", 0), 1),
                "smile_score": round(scores_dict.get("smile_score", 0), 1),
                "posture_score": round(scores_dict.get("posture_score", 0), 1),
                "expression_score": round(scores_dict.get("expression_score", 0), 1),
                "visibility_score": round(scores_dict.get("visibility_score", 0), 1),
                "overall_score": round(scores_dict.get("overall_score", 0), 1),
                "feedback_text": feedback_part,
                "created_at": datetime.now().isoformat()
            }
            
            # Log the final feedback data
            logger.warning(f"Final Feedback Data: {feedback_data}")
            
            return feedback_data
            
        except Exception as e:
            logger.error(f"Error parsing GPT response: {str(e)}")
            raise
        
    except Exception as e:
        logger.error(f"Error generating visual feedback: {str(e)}")
        raise