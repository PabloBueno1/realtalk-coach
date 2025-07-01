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
        ai_role = scenario.get("ai_role", "conversation partner")
        
        # Ensure all metrics are properly formatted
        total_duration = float(metrics.get('total_duration', 0))
        speaking_time = float(metrics.get('speaking_time', 0))
        speaking_rate = float(metrics.get('speaking_rate', 0))
        average_volume = float(metrics.get('average_volume_dbfs', 0))
        num_pauses = int(metrics.get('num_pauses', 0))
        word_count = int(metrics.get('word_count', 0))

        prompt = f"""
        You are an expert evaluator assessing a speaker's verbal communication skills.

        CRITICAL: The transcript shows the USER speaking TO an AI playing the role of {ai_role}.
        Example: If User is a pharmacist, AI is the patient speaking TO the pharmacist.
        DO NOT confuse roles - evaluate the user's speech, not the AI's.

        Evaluate based on:
        - Content: relevance and clarity for user's role
        - Delivery: fluency, confidence, articulation
        - Pacing: speaking rate appropriateness
        - Volume: audibility and consistency
        - Pausing: natural flow vs disruptive gaps
        - Overall performance for {difficulty_level} level

        Scenario:
        Title: {title}
        Description: {description}
        Initial Prompt: {initial_prompt}
        Context: {context}

        Transcript: "{transcript or 'No transcript available'}"

        Metrics:
        - Words: {int(word_count)}
        - Duration: {float(total_duration):.2f}s
        - Speaking time: {float(speaking_time):.2f}s
        - Rate: {float(speaking_rate):.2f} words/s
        - Volume: {float(average_volume):.2f} dBFS
        - Pauses: {int(num_pauses)}

        Output Format:
        Written Feedback:
        Provide a comprehensive critique with specific coaching tips and actionable advice for improvement. Include both strengths and areas for growth with practical suggestions.

        Scores (JSON):
        {{
        "fluency_score": 0-5,
        "confidence_score": 0-5,
        "clarity_score": 0-5,
        "content_score": 0-5,
        "pace_score": 0-5,
        "volume_score": 0-5,
        "pause_score": 0-5,
        "overall_score": 0-5
        }}
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
        scenario = visual_data.get("scenario", {})
        
        # Extract scenario details
        title = scenario.get("title", "Casual Conversation")
        description = scenario.get("description", "A general conversation practice session")
        initial_prompt = scenario.get("initial_prompt", "How have you been?")
        context = scenario.get("context", "A natural conversation setting")
        difficulty_level = scenario.get("difficulty_level", "intermediate")
        ai_role = scenario.get("ai_role", "conversation partner")
        
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
        
        # Print raw metrics for debugging
        logger.warning("Raw metrics being sent to GPT:")
        logger.warning(f"Posture: {posture}")
        logger.warning(f"Eye Contact: {eye_contact}")
        logger.warning(f"Emotions: {emotions}")
        logger.warning(f"Face Visibility: {face_visibility}")
        logger.warning(f"Blink Detection: {blink_detection}")
        logger.warning(f"Yawn Detection: {yawn_detection}")
        logger.warning(f"Restlessness: {restlessness}")
        
        # Call GPT API
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": """You are a speech and communication coach. Follow these rules exactly:
                1. Response must have two parts separated by "Scores (JSON):"
                2. First part starts with "Written Feedback:"
                3. Second part must be valid JSON with scores 0-5
                4. Use 0 for unevaluable metrics
                5. No text outside these parts"""},
                {"role": "user", "content":
                 f"""
You are evaluating a speaker's visual performance in a video where they speak to an AI playing the role of {ai_role}.
Example: If AI is a pharmacist, user is the patient speaking TO the pharmacist.
Evaluate the user's visual behavior for their role, not the AI's role.

Note: Values of 0.0 likely indicate detection failure, not perfect performance.

Scenario:
Title: {title}
Description: {description}
Initial Prompt: {initial_prompt}
Context: {context}
Difficulty: {difficulty_level}

Metrics:
Posture (lower is better):
- Alignment: {alignment:.3f} (horizontal offset)
- Levelness: {levelness:.3f} (shoulder balance)
- Twist: {twist:.3f} (torso rotation)
- Vertical: {vertical:.3f} (nose-shoulder distance)
- Ear-Shoulder: {ear_shoulder_vertical:.3f} (head tilt)
- Depth: {depth_stability:.3f} (torso movement)

Eye Contact:
- Quality: {eye_contact_quality:.1f}%
- Good Frames: {good_frames}/{total_frames}
- Gaze Shifts: {gaze_shifts}
- Shift Frequency: {gaze_shift_frequency:.3f}
- Iris Movement: {avg_iris_movement:.3f} avg, {max_iris_movement:.3f} max

Facial:
- Smile: {smile_percentage:.1f}%
- Neutral: {neutral_percentage:.1f}%
- Blinks: {normal_blinks} normal, {fast_blinks} fast
- Yawns: {total_yawns}
- Face Visible: {visibility_percentage:.1f}%

Task:
1. Write comprehensive feedback covering:
   - Posture and presence
   - Eye contact and gaze
   - Facial expression
   - Overall presentation
   Include specific coaching tips and actionable advice for improvement. Note any missing data.

2. Score each category 0-5.

Output Format:
Written Feedback:
[Your feedback]

Scores (JSON):
{{
  "eye_contact_score": 0-5,
  "smile_score": 0-5,
  "posture_score": 0-5,
  "expression_score": 0-5,
  "visibility_score": 0-5,
  "overall_score": 0-5
}}
"""
        }
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
            
            # Validate and convert any null values to 0
            for key in scores_dict:
                if scores_dict[key] is None:
                    scores_dict[key] = 0
            
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