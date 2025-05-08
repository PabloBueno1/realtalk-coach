import tensorflow as tf
tf.config.set_visible_devices([], 'GPU')

import cv2
import numpy as np
import mediapipe as mp
import json
import sys
from deepface import DeepFace
import logging
from collections import deque, Counter
import os
import math
import time

# Set up logging - only log warnings and above
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Suppress TensorFlow/DeepFace warnings
logging.getLogger('tensorflow').setLevel(logging.ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# MediaPipe initialization
mp_pose = mp.solutions.pose
mp_face_mesh = mp.solutions.face_mesh

# --- Helper Functions for Eye Contact and Blink Detection ---
def distance(p1, p2):
    """Calculate Euclidean distance between two points."""
    return math.dist((p1[0], p1[1]), (p2[0], p2[1]))

def calculate_ear(eye_landmarks):
    """Calculate Eye Aspect Ratio (EAR) for given eye landmarks."""
    # eye_landmarks: list of 6 (x, y) tuples
    # Order: Outer Corner(p1), Upper Lid(p2,p3), Inner Corner(p4), Lower Lid(p5,p6)
    # Vertical distances
    v1 = distance(eye_landmarks[1], eye_landmarks[5]) # p2-p6
    v2 = distance(eye_landmarks[2], eye_landmarks[4]) # p3-p5
    # Horizontal distance
    h = distance(eye_landmarks[0], eye_landmarks[3]) # p1-p4

    # Compute EAR
    if h == 0:  # Avoid division by zero
        return 0.0
    ear = (v1 + v2) / (2.0 * h)
    return ear

def calculate_mar(mouth_landmarks):
    """Calculate Mouth Aspect Ratio (MAR) for given mouth landmarks."""
    # mouth_landmarks: list of 6 (x, y) tuples
    # Order: Left Corner, Upper Lip (2 points), Right Corner, Lower Lip (2 points)
    # Vertical distance - distance between upper and lower lip points
    v1 = distance(mouth_landmarks[1], mouth_landmarks[4]) # Upper-Lower central points
    v2 = distance(mouth_landmarks[2], mouth_landmarks[5]) # Upper-Lower central points
    # Horizontal distance - distance between mouth corners
    h = distance(mouth_landmarks[0], mouth_landmarks[3]) # Left-Right corner

    # Compute MAR
    if h == 0: # Avoid division by zero
        return 0.0
    mar = (v1 + v2) / (2.0 * h)
    return mar

def get_iris_position(landmarks, iris_indices, frame_width, frame_height, eye_contour_indices):
    """
    Calculate the normalized position of the iris relative to the eye contour.
    
    Args:
        landmarks: Face mesh landmarks
        iris_indices: List of indices for iris landmarks
        frame_width: Width of the frame
        frame_height: Height of the frame
        eye_contour_indices: List of indices that form the eye contour
        
    Returns:
        tuple: (x, y) normalized iris position
    """
    # Get iris center
    iris_points = []
    for idx in iris_indices:
        lm = landmarks[idx]
        iris_points.append((lm.x * frame_width, lm.y * frame_height))
    
    # Calculate iris center
    iris_center_x = sum(p[0] for p in iris_points) / len(iris_points)
    iris_center_y = sum(p[1] for p in iris_points) / len(iris_points)
    
    # Get eye contour
    eye_contour = []
    for idx in eye_contour_indices:
        lm = landmarks[idx]
        eye_contour.append((lm.x * frame_width, lm.y * frame_height))
    
    # Find eye bounding box
    min_x = min(p[0] for p in eye_contour)
    max_x = max(p[0] for p in eye_contour)
    min_y = min(p[1] for p in eye_contour)
    max_y = max(p[1] for p in eye_contour)
    
    eye_width = max_x - min_x
    eye_height = max_y - min_y
    
    if eye_width == 0 or eye_height == 0:
        return 0.5, 0.5  # Default center position
    
    # Normalize iris position relative to eye contour
    normalized_x = (iris_center_x - min_x) / eye_width
    normalized_y = (iris_center_y - min_y) / eye_height
    
    return normalized_x, normalized_y

def get_pose_detector():
    """Initialize and return a MediaPipe pose detector with optimized settings."""
    return mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,  # Reduced complexity for better performance
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5)

def get_face_mesh_detector():
    """Initialize and return a MediaPipe face mesh detector."""
    return mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,  # Essential for accurate EAR and iris detection
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5)

def analyze_video(video_path, baseline_path=None, frame_skip=5):
    """
    Analyzes a video file to extract posture, emotion, eye contact, and blink metrics.
    
    Args:
        video_path (str): Path to the video file to analyze
        baseline_path (str): Path to baseline JSON file (optional)
        frame_skip (int): Process every Nth frame to speed up analysis
        
    Returns:
        dict: Dictionary containing average metrics and differences from baseline
    """
    logger.debug(f"Starting video analysis for: {video_path}")
    
    # Load baseline if provided
    baseline = None
    if baseline_path:
        try:
            with open(baseline_path, 'r') as f:
                baseline = json.load(f)
            logger.debug(f"Loaded baseline from {baseline_path}")
        except Exception as e:
            logger.warning(f"Could not load baseline file: {e}")
    
    logger.debug("Opening video file")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.error(f"Cannot open video file {video_path}")
        return None

    # Get video properties
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    logger.debug(f"Video dimensions: {frame_width}x{frame_height}")

    # Get approximate camera matrix (if no calibration available)
    focal_length = frame_width
    center = (frame_width/2, frame_height/2)
    mtx = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype=np.float64)
    dist = np.zeros((4, 1), dtype=np.float64)

    # Initialize detectors
    logger.debug("Initializing detectors")
    pose = get_pose_detector()
    face_mesh = get_face_mesh_detector()

    # Eye contact parameters
    FORWARD_VECTOR_THRESHOLD = 0.53
    FORWARD_Y_UP_THRESHOLD = 0.40
    FORWARD_Y_DOWN_THRESHOLD = 0.30
    
    # Blink detection parameters
    EAR_THRESHOLD = 0.20
    EYE_AR_MIN_CONSEC_FRAMES = 3 # Min frames closed to start considering a blink (filters noise)
    EYE_AR_MAX_CONSEC_FRAMES_FOR_FAST = 6 # Max frames closed for a blink to be "fast" (Tune this!)
    
    # Yawn detection parameters
    MAR_THRESHOLD = 0.4 # Threshold for Mouth Aspect Ratio (higher means more open)
    YAWN_TIME_THRESHOLD = 0.1 # Time in seconds mouth must be open to count as yawn
    
    # Gaze/restlessness detection parameters
    GAZE_MOVEMENT_THRESHOLD = 0.1  # Threshold for significant gaze movement
    GAZE_HISTORY_WINDOW = 30  # Number of frames to keep in history for frequency calculation
    
    # Eye landmark indices
    LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    
    # Iris landmark indices (from MediaPipe Face Mesh)
    LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]  # Left eye iris landmarks
    RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]  # Right eye iris landmarks
    
    # Eye contour indices for normalized iris position
    LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    
    # Mouth landmark indices
    MOUTH_INDICES = [61, 13, 14, 291, 17, 16]

    # Initialize metrics storage
    metrics = {
        # Posture metrics
        'alignments': [],
        'levelnesses': [],
        'twists': [],
        'shoulder_zs': [],
        'vertical_diffs': [],
        'ear_shoulder_vertical_aligns': [],
        'frame_count': 0,
        # Emotion metrics
        'emotion_counts': {
            "happy": 0,
            "neutral": 0
        },
        'processed_emotion_frames': 0,
        # Eye contact metrics
        'total_frames': 0,
        'good_eye_contact_frames': 0,
        # Blink metrics
        'normal_blink_count': 0,
        'fast_blink_count': 0,
        # Yawn metrics
        'yawn_count': 0,
        # Restlessness metrics
        'gaze_shifts': 0,
        'total_iris_movement': 0.0,
        'max_iris_movement': 0.0,
        # Face visibility metrics
        'face_visible_frames': 0
    }

    # Emotion smoothing
    smoothing_window_size = 5
    recent_emotions = deque(maxlen=smoothing_window_size)
    smoothed_emotion = "neutral"
    last_known_box = None

    # Eye contact and blink tracking state
    closed_eye_counter = 0
    blinking_state = False # True if eyes are currently considered in a blink closure phase
    previous_eye_state = None # Used for eye contact check
    
    # Yawn tracking state
    yawn_in_progress = False
    currently_yawning = False
    yawn_start_time = None
    
    # Gaze tracking state
    prev_left_iris_pos = None
    prev_right_iris_pos = None
    gaze_shift_history = deque(maxlen=GAZE_HISTORY_WINDOW)  # For tracking frequency
    frames_since_last_shift = 0

    try:
        logger.debug("Starting frame processing")
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            metrics['frame_count'] += 1
            # Only increment total_frames when we actually process the frame
            if metrics['frame_count'] % frame_skip == 0:
                metrics['total_frames'] += 1
                logger.debug(f"Processing frame {metrics['frame_count']}")
                
                # Convert to RGB for MediaPipe
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Face mesh processing
                face_results = face_mesh.process(frame_rgb)
                
                if face_results.multi_face_landmarks:
                    logger.debug("Face detected in frame")
                    metrics['face_visible_frames'] += 1
                    
                    # Emotion analysis
                    try:
                        logger.debug("Starting emotion analysis")
                        faces_data = DeepFace.extract_faces(
                            frame,
                            detector_backend='opencv',
                            enforce_detection=False,
                            align=False
                        )
                        
                        if faces_data:
                            face_data = faces_data[0]
                            facial_area = face_data['facial_area']
                            x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']
                            
                            padding = 10
                            y_start = max(0, y - padding)
                            y_end = min(frame.shape[0], y + h + padding)
                            x_start = max(0, x - padding)
                            x_end = min(frame.shape[1], x + w + padding)
                            face_roi = frame[y_start:y_end, x_start:x_end]
                            
                            if face_roi.size > 0:
                                emotions = DeepFace.analyze(
                                    face_roi,
                                    actions=['emotion'],
                                    detector_backend='opencv',
                                    enforce_detection=False,
                                    silent=True
                                )
                                
                                if emotions and isinstance(emotions, list):
                                    emotion_data = emotions[0]['emotion']
                                    relevant_emotions = {
                                        'happy': emotion_data.get('happy', 0),
                                        'neutral': emotion_data.get('neutral', 0)
                                    }
                                    if relevant_emotions:
                                        dominant_emotion = max(relevant_emotions, key=relevant_emotions.get)
                                        metrics['emotion_counts'][dominant_emotion] += 1
                                        logger.debug(f"Detected emotion: {dominant_emotion}")
                    except Exception as e:
                        logger.error(f"Error in emotion analysis: {str(e)}", exc_info=True)
                
                # Pose processing (when needed)
                pose_results = pose.process(frame_rgb)
                
                current_eye_state = None # Reset for this frame
                eyes_considered_open = True # Assume open unless detected otherwise for eye contact
                
                # Face mesh analysis for eye contact and blinks
                if face_results.multi_face_landmarks:
                    try:
                        face_landmarks = face_results.multi_face_landmarks[0].landmark
                        
                        # --- EAR & Blink Detection --- 
                        left_eye_pts = []
                        for idx in LEFT_EYE_INDICES:
                            lm = face_landmarks[idx]
                            left_eye_pts.append((lm.x * frame_width, lm.y * frame_height))
                        
                        right_eye_pts = []
                        for idx in RIGHT_EYE_INDICES:
                            lm = face_landmarks[idx]
                            right_eye_pts.append((lm.x * frame_width, lm.y * frame_height))
                        
                        # --- Extract Mouth Landmarks for MAR ---
                        mouth_pts = []
                        for idx in MOUTH_INDICES:
                            lm = face_landmarks[idx]
                            mouth_pts.append((lm.x * frame_width, lm.y * frame_height))
                        
                        # --- Extract Iris Positions for Restlessness Metric ---
                        left_iris_pos = get_iris_position(face_landmarks, LEFT_IRIS_INDICES, 
                                                        frame_width, frame_height, LEFT_EYE_CONTOUR)
                        right_iris_pos = get_iris_position(face_landmarks, RIGHT_IRIS_INDICES, 
                                                        frame_width, frame_height, RIGHT_EYE_CONTOUR)
                        
                        # Calculate iris movement if we have previous positions
                        if prev_left_iris_pos is not None and prev_right_iris_pos is not None:
                            # Calculate movement distance for each eye
                            left_movement = distance(left_iris_pos, prev_left_iris_pos)
                            right_movement = distance(right_iris_pos, prev_right_iris_pos)
                            
                            # Average movement of both eyes
                            avg_movement = (left_movement + right_movement) / 2.0
                            
                            # Update total movement
                            metrics['total_iris_movement'] += avg_movement
                            
                            # Update max movement if this is larger
                            metrics['max_iris_movement'] = max(metrics['max_iris_movement'], avg_movement)
                            
                            # Check if this movement constitutes a gaze shift
                            if avg_movement > GAZE_MOVEMENT_THRESHOLD:
                                metrics['gaze_shifts'] += 1
                                frames_since_last_shift = 0
                                gaze_shift_history.append(1)  # Record a shift
                            else:
                                frames_since_last_shift += 1
                                gaze_shift_history.append(0)  # Record no shift
                        
                        # Store current iris positions for next frame
                        prev_left_iris_pos = left_iris_pos
                        prev_right_iris_pos = right_iris_pos
                        
                        # Calculate EAR
                        left_ear = calculate_ear(left_eye_pts)
                        right_ear = calculate_ear(right_eye_pts)
                        avg_ear = (left_ear + right_ear) / 2.0
                        are_eyes_closed_this_frame = avg_ear < EAR_THRESHOLD
                        
                        # Calculate MAR
                        mar = calculate_mar(mouth_pts)
                        is_mouth_open = mar > MAR_THRESHOLD
                        
                        # --- Yawn Detection ---
                        if is_mouth_open and not yawn_in_progress:
                            # Mouth just opened wide
                            yawn_start_time = time.time()
                            yawn_in_progress = True
                        elif is_mouth_open and yawn_in_progress:
                            # Check if mouth has been open for more than threshold
                            if time.time() - yawn_start_time >= YAWN_TIME_THRESHOLD and not currently_yawning:
                                metrics['yawn_count'] += 1
                                currently_yawning = True
                                logger.debug(f"Yawn detected! Total yawns: {metrics['yawn_count']}")
                        elif not is_mouth_open and yawn_in_progress:
                            # Mouth closed, reset tracking
                            yawn_in_progress = False
                            currently_yawning = False
                        
                        current_eye_state = "closed" if are_eyes_closed_this_frame else "open"
                        
                        if current_eye_state == "closed":
                            closed_eye_counter += 1
                            # If eyes are closed for enough frames, enter blinking state
                            if closed_eye_counter >= EYE_AR_MIN_CONSEC_FRAMES and not blinking_state:
                                blinking_state = True
                        else: # Eyes are open
                            # If we were in a blinking state, this means the blink just ended
                            if blinking_state:
                                # Classify the blink based on duration
                                if closed_eye_counter <= EYE_AR_MAX_CONSEC_FRAMES_FOR_FAST:
                                    metrics['fast_blink_count'] += 1
                                else:
                                    metrics['normal_blink_count'] += 1
                                # Reset counter and state
                                closed_eye_counter = 0
                                blinking_state = False
                            else:
                                # If not in blinking state and eyes are open, ensure counter is 0
                                closed_eye_counter = 0
                        
                        # Determine if eyes are considered open for eye contact (uses simple consecutive count)
                        # This differs slightly from blink classification state
                        eyes_considered_open = closed_eye_counter < EYE_AR_MIN_CONSEC_FRAMES
                        
                        # --- Head Pose & Eye Contact Check --- 
                        landmark_indices = [1, 199, 33, 263, 61, 291]
                        model_points_3d_np = np.array([
                            (0.0, 0.0, 0.0),            # Nose tip
                            (0.0, -330.0, -65.0),       # Chin
                            (-225.0, 170.0, -100.0),    # Left eye left corner
                            (225.0, 170.0, -100.0),     # Right eye right corner
                            (-150.0, -150.0, -125.0),   # Left Mouth corner
                            (150.0, -150.0, -125.0)     # Right mouth corner
                        ], dtype=np.float64)
                        
                        # Extract 2D coordinates from landmarks
                        image_points_2d = []
                        for idx in landmark_indices:
                            lm = face_landmarks[idx]
                            image_points_2d.append((lm.x * frame_width, lm.y * frame_height))
                        
                        image_points_2d_np = np.array(image_points_2d, dtype=np.float64)
                        
                        # SolvePnP for head pose estimation
                        success_pnp, rotation_vector, translation_vector = cv2.solvePnP(
                            model_points_3d_np, image_points_2d_np, mtx, dist, flags=cv2.SOLVEPNP_ITERATIVE
                        )
                        
                        if success_pnp:
                            # Get rotation matrix
                            rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
                            
                            # Get forward vector (Z-axis of face in camera coords)
                            forward_x = rotation_matrix[0, 2]
                            forward_y = rotation_matrix[1, 2]
                            
                            # Check if looking straight and eyes are considered open
                            is_looking_straight = (
                                abs(forward_x) <= FORWARD_VECTOR_THRESHOLD and
                                forward_y <= FORWARD_Y_UP_THRESHOLD and
                                forward_y >= -FORWARD_Y_DOWN_THRESHOLD
                            )
                            
                            if is_looking_straight and eyes_considered_open:
                                metrics['good_eye_contact_frames'] += 1
                    except Exception as e:
                        logger.error(f"Error processing face landmarks: {str(e)}")
                        continue
            
            # Posture analysis - only process selected frames
            if metrics['frame_count'] % frame_skip == 0 and pose_results.pose_landmarks:
                pl = pose_results.pose_landmarks.landmark
                nose = pl[mp_pose.PoseLandmark.NOSE.value]
                l_sh = pl[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
                r_sh = pl[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
                l_ear = pl[mp_pose.PoseLandmark.LEFT_EAR.value]
                r_ear = pl[mp_pose.PoseLandmark.RIGHT_EAR.value]

                if nose.visibility > 0.5 and l_sh.visibility > 0.5 and r_sh.visibility > 0.5 and l_ear.visibility > 0.5 and r_ear.visibility > 0.5:
                    shoulder_mid_x = (l_sh.x + r_sh.x) / 2
                    shoulder_mid_y = (l_sh.y + r_sh.y) / 2
                    shoulder_mid_z = (l_sh.z + r_sh.z) / 2
                    
                    ear_mid_x = (l_ear.x + r_ear.x) / 2
                    ear_mid_y = (l_ear.y + r_ear.y) / 2
                    
                    ear_shoulder_vertical_align = abs(ear_mid_y - shoulder_mid_y)

                    metrics['alignments'].append(abs(nose.x - shoulder_mid_x))
                    metrics['levelnesses'].append(abs(l_sh.y - r_sh.y))
                    metrics['twists'].append(abs(l_sh.z - r_sh.z))
                    metrics['shoulder_zs'].append(shoulder_mid_z)
                    metrics['vertical_diffs'].append(abs(nose.y - shoulder_mid_y))
                    metrics['ear_shoulder_vertical_aligns'].append(ear_shoulder_vertical_align)

            # Emotion analysis (every 3rd frame)
            if metrics['frame_count'] % 3 == 0:
                metrics['processed_emotion_frames'] += 1
                try:
                    faces_data = DeepFace.extract_faces(
                        frame,
                        detector_backend='opencv',
                        enforce_detection=False,
                        align=False
                    )

                    if faces_data:
                        face_data = faces_data[0]
                        facial_area = face_data['facial_area']
                        x, y, w, h = facial_area['x'], facial_area['y'], facial_area['w'], facial_area['h']
                        last_known_box = (x, y, w, h)

                        padding = 10
                        y_start = max(0, y - padding)
                        y_end = min(frame.shape[0], y + h + padding)
                        x_start = max(0, x - padding)
                        x_end = min(frame.shape[1], x + w + padding)
                        face_roi = frame[y_start:y_end, x_start:x_end]

                        if face_roi.size > 0:
                            try:
                                # Use DeepFace for emotion analysis
                                emotions = DeepFace.analyze(
                                    face_roi,
                                    actions=['emotion'],
                                    detector_backend='opencv',
                                    enforce_detection=False,
                                    silent=True
                                )
                                
                                if emotions and isinstance(emotions, list):
                                    emotion_data = emotions[0]['emotion']
                                    # Only consider happy and neutral emotions
                                    relevant_emotions = {
                                        'happy': emotion_data.get('happy', 0),
                                        'neutral': emotion_data.get('neutral', 0)
                                    }
                                    if relevant_emotions:
                                        dominant_emotion = max(relevant_emotions, key=relevant_emotions.get)
                                        recent_emotions.append(dominant_emotion)

                                        if recent_emotions:
                                            most_common = Counter(recent_emotions).most_common(1)
                                            if most_common:
                                                smoothed_emotion = most_common[0][0]
                                                metrics['emotion_counts'][smoothed_emotion] += 1

                            except Exception as e:
                                pass  # Skip frame if emotion detection fails

                except Exception as e:
                    pass  # Skip frame if emotion detection fails

        # After processing all frames, check if any face was detected
        if metrics['face_visible_frames'] == 0:
            logger.warning("No face detected in any frame of the video")
            # Return default metrics with zeros
            return {
                'total_frames_analyzed': metrics['frame_count'],
                'blink_detection': {
                    'normal_blinks': 0,
                    'fast_blinks': 0,
                    'total_blinks': 0
                },
                'emotions': {
                    'happy': 0,
                    'neutral': 0
                },
                'posture': {
                    'alignment': 0.0,
                    'levelness': 0.0,
                    'twist': 0.0,
                    'vertical': 0.0,
                    'ear_shoulder_vertical': 0.0,
                    'depth_stability': 0.0
                },
                'eye_contact': {
                    'quality_percentage': 0.0,
                    'good_frames': 0,
                    'total_frames': metrics['total_frames']
                },
                'yawn_detection': {
                    'total_yawns': 0
                },
                'restlessness': {
                    'score': 0.0,
                    'gaze_shifts': 0,
                    'gaze_shift_frequency': 0.0,
                    'avg_iris_movement': 0.0,
                    'max_iris_movement': 0.0
                },
                'face_visibility': {
                    'percentage': 0.0,
                    'visible_frames': 0,
                    'total_frames': metrics['total_frames']
                },
                'processed_posture_frames': 0
            }

        # Calculate eye contact quality percentage
        eye_contact_quality = 0
        if metrics['total_frames'] > 0:
            eye_contact_quality = (metrics['good_eye_contact_frames'] / metrics['total_frames']) * 100
            
        # Calculate restlessness score
        gaze_shift_frequency = 0
        if metrics['total_frames'] > 0:
            gaze_shift_frequency = metrics['gaze_shifts'] / metrics['total_frames']
        
        # Normalize total iris movement by number of frames (average movement per frame)
        avg_iris_movement = 0
        if metrics['total_frames'] > 1:  # Need at least 2 frames to have movement
            avg_iris_movement = metrics['total_iris_movement'] / (metrics['total_frames'] - 1)
        
        # Calculate restlessness score (combine frequency and magnitude)
        # Higher score = more restless
        restlessness_score = (gaze_shift_frequency * 5) + (avg_iris_movement * 10)

        # Calculate face visibility percentage
        face_visibility_percentage = 0
        if metrics['total_frames'] > 0:
            face_visibility_percentage = (metrics['face_visible_frames'] / metrics['total_frames']) * 100
        
        # Calculate final stats
        analysis_results = {
            'total_frames_analyzed': metrics['frame_count'],
            'blink_detection': {
                'normal_blinks': metrics['normal_blink_count'],
                'fast_blinks': metrics['fast_blink_count'],
                'total_blinks': metrics['normal_blink_count'] + metrics['fast_blink_count']
            },
            'emotions': {
                'happy': metrics['emotion_counts']['happy'],
                'neutral': metrics['emotion_counts']['neutral']
            },
            'posture': {
                'alignment': float(np.mean(metrics['alignments'])) if metrics['alignments'] else 0.0,
                'levelness': float(np.mean(metrics['levelnesses'])) if metrics['levelnesses'] else 0.0,
                'twist': float(np.mean(metrics['twists'])) if metrics['twists'] else 0.0,
                'vertical': float(np.mean(metrics['vertical_diffs'])) if metrics['vertical_diffs'] else 0.0,
                'ear_shoulder_vertical': float(np.mean(metrics['ear_shoulder_vertical_aligns'])) if metrics['ear_shoulder_vertical_aligns'] else 0.0,
                'depth_stability': float(np.ptp(metrics['shoulder_zs'])) if metrics['shoulder_zs'] else 0.0
            },
            'eye_contact': {
                'quality_percentage': float(eye_contact_quality),
                'good_frames': metrics['good_eye_contact_frames'],
                'total_frames': metrics['total_frames']
            },
            'yawn_detection': {
                'total_yawns': metrics['yawn_count']
            },
            'restlessness': {
                'score': float(restlessness_score),
                'gaze_shifts': metrics['gaze_shifts'],
                'gaze_shift_frequency': float(gaze_shift_frequency),
                'avg_iris_movement': float(avg_iris_movement),
                'max_iris_movement': float(metrics['max_iris_movement'])
            },
            'face_visibility': {
                'percentage': float(face_visibility_percentage),
                'visible_frames': metrics['face_visible_frames'],
                'total_frames': metrics['total_frames']
            },
            'processed_posture_frames': len(metrics['alignments'])
        }

        # Calculate differences from baseline if provided
        if baseline:
            print("\nCalculating differences from baseline...")  # Debug print
            analysis_results['posture']['differences_from_baseline'] = {}
            for metric, value in analysis_results['posture']['raw_metrics'].items():
                if metric in baseline and value is not None:
                    baseline_value = baseline[metric]
                    difference = value - baseline_value
                    analysis_results['posture']['differences_from_baseline'][metric] = float(difference)
                    print(f"Calculated difference for {metric}: {difference} (current: {value}, baseline: {baseline_value})")
                else:
                    print(f"Warning: Metric {metric} not found in baseline or has no current value")  # Debug print

        print("Analysis complete.")
        return analysis_results

    except Exception as e:
        logger.error(f"Error in video analysis: {str(e)}", exc_info=True)
        # Return default metrics with zeros instead of None
        return {
            'total_frames_analyzed': metrics['frame_count'],
            'blink_detection': {
                'normal_blinks': 0,
                'fast_blinks': 0,
                'total_blinks': 0
            },
            'emotions': {
                'happy': 0,
                'neutral': 0
            },
            'posture': {
                'alignment': 0.0,
                'levelness': 0.0,
                'twist': 0.0,
                'vertical': 0.0,
                'ear_shoulder_vertical': 0.0,
                'depth_stability': 0.0
            },
            'eye_contact': {
                'quality_percentage': 0.0,
                'good_frames': 0,
                'total_frames': metrics['total_frames']
            },
            'yawn_detection': {
                'total_yawns': 0
            },
            'restlessness': {
                'score': 0.0,
                'gaze_shifts': 0,
                'gaze_shift_frequency': 0.0,
                'avg_iris_movement': 0.0,
                'max_iris_movement': 0.0
            },
            'face_visibility': {
                'percentage': 0.0,
                'visible_frames': 0,
                'total_frames': metrics['total_frames']
            },
            'processed_posture_frames': 0
        }
    
    finally:
        logger.debug("Cleaning up resources")
        cap.release()
        pose.close()
        face_mesh.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python visual_analysis.py <video_path> [baseline_json_path] [output_json_path]")
        sys.exit(1)

    video_path = sys.argv[1]
    baseline_path = sys.argv[2] if len(sys.argv) > 2 else None
    output_path = sys.argv[3] if len(sys.argv) > 3 else None

    # Analyze video
    results = analyze_video(video_path, baseline_path)
    if results:
        # Convert to JSON string
        json_results = json.dumps(results, indent=4)
        
        if output_path:
            # Save to file
            with open(output_path, 'w') as f:
                f.write(json_results)
            print(f"Results saved to {output_path}")
        else:
            # Print to console
            print(json_results)

# This code runs when the module is imported
current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
video_path = os.path.join(current_dir, "carlos.mp4")
if os.path.exists(video_path):
    print("Preloading analyzers using carlos.mp4...")
    analyze_video(video_path)
    print("Analyzers preloaded successfully!") 