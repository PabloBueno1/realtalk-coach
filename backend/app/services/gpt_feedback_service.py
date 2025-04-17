import os
import openai
import json
from typing import Dict, Any, Tuple
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variable
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Warning: OPENAI_API_KEY environment variable is not set")

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

        full_response = response.choices[0].message.content
        
        # Extract the text feedback and JSON scores
        try:
            # Split the response into feedback and scores
            feedback_part = full_response.split("Scores (JSON):")[0].replace("Written Feedback:", "").strip()
            scores_part = full_response.split("Scores (JSON):")[1].strip()
            
            # Parse the JSON scores
            scores_dict = json.loads(scores_part)
            
            return feedback_part, scores_dict
        except Exception as e:
            print(f"Error parsing GPT response: {str(e)}")
            return full_response, {}

    except Exception as e:
        print(f"Error generating GPT feedback: {str(e)}")
        return "Error generating feedback.", {}

def generate_visual_feedback(metrics: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """
        Generate feedback using GPT for visual metrics.
        """
        try:
            # Get scenario from metrics or use default
            scenario = metrics.get("scenario", {})
            
            # Extract scenario details
            title = scenario.get("title", "Casual Conversation")
            description = scenario.get("description", "A general conversation practice session")
            initial_prompt = scenario.get("initial_prompt", "How have you been?")
            context = scenario.get("context", "A natural conversation setting")
            difficulty_level = scenario.get("difficulty_level", "intermediate")
            
            prompt = f"""
            You are evaluating a speaker's visual delivery based on objective metrics and scenario context.

            Provide:
            1. A concise, direct critique (3-5 sentences) addressing:
            - Eye contact: appropriate for the conversation type and setting
            - Facial expression and emotional range: consistent with the scenario's emotional demands
            - Smile: natural, controlled, and situation-appropriate
            - Posture and physical presence: composed and context-fitting
            - Visibility: framing and lighting support clear visual communication

            2. A score (0 = poor, 5 = excellent) for each of the following:
            - eye_contact_score
            - smile_score
            - posture_score
            - expression_score
            - visibility_score
            - overall_score

            Note: "Sad" may overlap with serious or focused expressions. Consider the scenario context when interpreting emotion data.

            Scenario Details:
            Title: {title}
            Description: {description}
            Initial Prompt: {initial_prompt}
            Context: {context}
            Difficulty Level: {difficulty_level}

            Input:
            - Eye contact: {float(metrics.get("eye_contact_percent", 0)):.2f}%
            - Smiling: {float(metrics.get("smile_percent", 0)):.2f}%
            - Visibility: {float(metrics.get("visibility_percent", 0)):.2f}%
            - Posture: {float(metrics.get("posture_percent", 0)):.2f}%
            - Emotion distribution: {metrics.get("emotion_distribution", {})}

            Respond in this format:

            Written Feedback:
            <Direct, scenario-aware critique>

            Scores (JSON):
            {{
            "eye_contact_score": ..., 
            "smile_score": ..., 
            "posture_score": ..., 
            "expression_score": ..., 
            "visibility_score": ..., 
            "overall_score": ...
            }}
            """

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

            full_response = response.choices[0].message.content

            feedback_part = full_response.split("Scores (JSON):")[0].replace("Written Feedback:", "").strip()
            scores_part = full_response.split("Scores (JSON):")[1].strip()
            scores_dict = json.loads(scores_part)

            return feedback_part, scores_dict

        except Exception as e:
            print(f"Error generating GPT visual feedback: {str(e)}")
            return "Error generating feedback.", {}