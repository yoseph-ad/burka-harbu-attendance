import base64
import io
import numpy as np
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# Try to import face_recognition and cv2
try:
    import face_recognition
    import cv2
    FACE_RECOGNITION_AVAILABLE = True
    logger.info("face_recognition and OpenCV successfully imported!")
except ImportError:
    face_recognition = None
    cv2 = None
    FACE_RECOGNITION_AVAILABLE = False
    logger.warning("face_recognition or OpenCV not found! Running in Mock/Simulated Face Recognition mode.")

def base64_to_numpy_image(base64_str):
    """
    Convert base64 image string (data URL or raw data) to numpy array (RGB)
    """
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        # Ensure image is in RGB mode
        if img.mode != 'RGB':
            img = img.convert('RGB')
        return np.array(img)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        raise ValueError(f"Invalid image format: {str(e)}")

def extract_face_encoding(base64_image_str):
    """
    Extracts the 128-dimensional face encoding from a base64 image.
    If face_recognition is not available, returns a simulated encoding.
    """
    if not FACE_RECOGNITION_AVAILABLE:
        # Generate a deterministic mock 128-dimensional vector based on the base64 string
        # This allows us to register and match faces even in development without dlib
        h = hash(base64_image_str[:1000])
        np.random.seed(abs(h) % (2**32))
        mock_vector = np.random.uniform(-0.1, 0.1, 128).tolist()
        return mock_vector

    try:
        img_np = base64_to_numpy_image(base64_image_str)
        # Find all face locations and encodings
        face_locations = face_recognition.face_locations(img_np)
        if not face_locations:
            raise ValueError("No face detected in the image.")
            
        encodings = face_recognition.face_encodings(img_np, face_locations)
        if not encodings:
            raise ValueError("Could not extract face encoding.")
            
        # Return the first face encoding as a list of floats
        return encodings[0].tolist()
    except Exception as e:
        if "No face detected" in str(e) or "Could not extract" in str(e):
            raise e
        logger.error(f"Face encoding error: {str(e)}")
        raise ValueError(f"Error processing image: {str(e)}")

def match_face(face_to_compare, known_encodings_dict, tolerance=0.6):
    """
    Compares a detected face encoding against a dictionary of known student face encodings.
    known_encodings_dict format: {student_id: [encoding_vector_1, encoding_vector_2, ...]}
    Returns: student_id if matched, None otherwise.
    """
    if not FACE_RECOGNITION_AVAILABLE:
        # In mock mode, we simulate matching by comparing our mock vectors
        # If the vectors are identical or very close, match them.
        # For demo purposes, we can match if the correlation is high,
        # or if the base64 input contains a specific mock token, or simply match the first one
        # to show the kiosk scanning flow.
        
        # Let's perform standard Euclidean distance on the lists of floats
        face_vec = np.array(face_to_compare)
        best_student_id = None
        best_dist = float('inf')
        
        for student_id, encodings in known_encodings_dict.items():
            for enc in encodings:
                dist = np.linalg.norm(face_vec - np.array(enc))
                # Mock tolerance is tighter or looser depending on seed
                if dist < 0.1 and dist < best_dist:
                    best_dist = dist
                    best_student_id = student_id
        return best_student_id

    try:
        face_vec = np.array(face_to_compare)
        best_student_id = None
        best_dist = tolerance
        
        for student_id, encodings in known_encodings_dict.items():
            # Convert list of lists to numpy array
            n_encodings = [np.array(enc) for enc in encodings]
            if not n_encodings:
                continue
            # Calculate distances to all encodings for this student
            distances = face_recognition.face_distance(n_encodings, face_vec)
            min_dist = np.min(distances)
            
            if min_dist < best_dist:
                best_dist = min_dist
                best_student_id = student_id
                
        return best_student_id
    except Exception as e:
        logger.error(f"Error matching face: {str(e)}")
        return None
