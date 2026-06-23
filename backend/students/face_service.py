import os
import base64
import io
import shutil
import logging
import urllib.request

import numpy as np
from PIL import Image
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OpenCV SFace face recognition
# ---------------------------------------------------------------------------
# We use two lightweight models that ship *inside* opencv-python-headless
# (no dlib, no extra heavy compiled dependency):
#   * YuNet  (cv2.FaceDetectorYN)  -> face detection
#   * SFace  (cv2.FaceRecognizerSF) -> 128-d face embedding
#
# Only the two small ONNX weight files are needed at runtime. They are fetched
# once into settings.ML_MODELS_DIR (see download_models()) rather than being
# committed to the repo.
#
# Matching uses cosine similarity (SFace convention: higher == more similar).
# The standard same-identity threshold for SFace is ~0.363.

YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"
SFACE_FILENAME = "face_recognition_sface_2021dec.onnx"

_ZOO_BASE = "https://github.com/opencv/opencv_zoo/raw/main/models"
MODEL_URLS = {
    YUNET_FILENAME: f"{_ZOO_BASE}/face_detection_yunet/{YUNET_FILENAME}",
    SFACE_FILENAME: f"{_ZOO_BASE}/face_recognition_sface/{SFACE_FILENAME}",
}

# Cosine similarity threshold for declaring a match (SFace recommended value).
SFACE_COSINE_THRESHOLD = 0.363

# YuNet's accuracy drops on very large images; downscale so the longest side is
# at most this many pixels before detection (webcam frames are well under this).
MAX_DETECT_DIMENSION = 1024

# Try to import cv2. If unavailable we run in Mock/Simulated mode so local dev
# without the native dependency still functions.
try:
    import cv2
    CV2_AVAILABLE = True
    logger.info("OpenCV (cv2) successfully imported for SFace recognition.")
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False
    logger.warning("OpenCV (cv2) not found! Running in Mock/Simulated face recognition mode.")


def _models_dir():
    """Directory where ONNX model weights live."""
    return str(getattr(settings, "ML_MODELS_DIR", os.path.join(settings.BASE_DIR, "ml_models")))


def _model_path(filename):
    return os.path.join(_models_dir(), filename)


def download_models(force=False, timeout=60):
    """
    Ensure the YuNet + SFace ONNX weights are present locally, downloading them
    from the OpenCV Zoo if missing. Returns True if both files are available.

    Downloads to a temporary ``.part`` file and atomically renames on success so
    a truncated/interrupted download is never left where it would be mistaken for
    a valid model. Safe to call repeatedly (build.sh or lazily on first use).
    """
    os.makedirs(_models_dir(), exist_ok=True)
    ok = True
    for filename, url in MODEL_URLS.items():
        dest = _model_path(filename)
        if not force and os.path.exists(dest) and os.path.getsize(dest) > 0:
            continue
        tmp = dest + '.part'
        try:
            logger.info(f"Downloading face model '{filename}' from {url} ...")
            with urllib.request.urlopen(url, timeout=timeout) as resp, open(tmp, 'wb') as out:
                shutil.copyfileobj(resp, out)
            if os.path.getsize(tmp) == 0:
                raise IOError("downloaded file is empty")
            os.replace(tmp, dest)
            logger.info(f"Downloaded '{filename}' ({os.path.getsize(dest)} bytes).")
        except Exception as e:
            logger.error(f"Failed to download model '{filename}': {e}")
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass
            ok = False
    return ok


# Lazily-created singletons (model loading is relatively expensive).
_detector = None
_recognizer = None
_models_unavailable = False  # set True once we know download/load failed


def _models_ready():
    """True if cv2 is importable AND both ONNX files exist (download if needed)."""
    global _models_unavailable
    if not CV2_AVAILABLE or _models_unavailable:
        return False
    yunet, sface = _model_path(YUNET_FILENAME), _model_path(SFACE_FILENAME)
    if not (os.path.exists(yunet) and os.path.exists(sface)):
        if not download_models():
            _models_unavailable = True
            return False
    return True


def _get_recognizer():
    global _recognizer
    if _recognizer is None:
        _recognizer = cv2.FaceRecognizerSF_create(_model_path(SFACE_FILENAME), "")
    return _recognizer


def _get_detector(width, height):
    """Return the YuNet detector, sized for the given input image."""
    global _detector
    if _detector is None:
        _detector = cv2.FaceDetectorYN_create(_model_path(YUNET_FILENAME), "", (width, height))
    else:
        _detector.setInputSize((width, height))
    return _detector


def face_recognition_active():
    """Whether real (non-mock) recognition is currently available."""
    return _models_ready()


def base64_to_bgr_image(base64_str):
    """
    Convert a base64 image string (data URL or raw) to a numpy array in BGR
    order (OpenCV's expected channel order).
    """
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        rgb = np.array(img)
        # PIL gives RGB; OpenCV models expect BGR.
        return rgb[:, :, ::-1].copy()
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        raise ValueError(f"Invalid image format: {str(e)}")


def _largest_face(faces):
    """
    From YuNet's detection output (N x 15 array) pick the row with the largest
    bounding-box area. Returns a single (15,) row, or None.
    """
    if faces is None or len(faces) == 0:
        return None
    # columns 2,3 are width,height of the bounding box
    areas = faces[:, 2] * faces[:, 3]
    return faces[int(np.argmax(areas))]


def extract_face_encoding(base64_image_str):
    """
    Extract a 128-dimensional SFace embedding from a base64 image.
    Raises ValueError("No face detected in the image.") when no face is found.
    Falls back to a deterministic mock vector when models are unavailable.
    """
    if not _models_ready():
        # Deterministic mock vector based on the image bytes so the flow still
        # works on dev machines without OpenCV/models. NOTE: mock encodings are
        # NOT real and cannot match a live webcam frame.
        h = hash(base64_image_str[:1000])
        rng = np.random.RandomState(abs(h) % (2**32))
        return rng.uniform(-0.1, 0.1, 128).tolist()

    try:
        img = base64_to_bgr_image(base64_image_str)
        # Downscale large images so YuNet detects reliably.
        h, w = img.shape[:2]
        longest = max(h, w)
        if longest > MAX_DETECT_DIMENSION:
            scale = MAX_DETECT_DIMENSION / longest
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        h, w = img.shape[:2]
        detector = _get_detector(w, h)
        _, faces = detector.detect(img)
        face = _largest_face(faces)
        if face is None:
            raise ValueError("No face detected in the image.")

        recognizer = _get_recognizer()
        aligned = recognizer.alignCrop(img, face)
        feature = recognizer.feature(aligned)
        return np.array(feature).flatten().tolist()
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Face encoding error: {str(e)}")
        raise ValueError(f"Error processing image: {str(e)}")


def _cosine_similarity(a, b):
    a = np.asarray(a, dtype=np.float32)
    b = np.asarray(b, dtype=np.float32)
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return -1.0
    return float(np.dot(a, b) / denom)


def match_face(face_to_compare, known_encodings_dict, threshold=SFACE_COSINE_THRESHOLD):
    """
    Compare a detected face embedding against known student embeddings using
    cosine similarity (higher == more similar).

    known_encodings_dict: {student_id: [encoding_vector_1, encoding_vector_2, ...]}
    Returns: student_id of the best match above `threshold`, or None.
    """
    if not _models_ready():
        # Mock matching: compare deterministic mock vectors. Two captures of the
        # same source bytes produce identical vectors -> cosine ~1.0.
        best_student_id = None
        best_sim = 0.999  # require near-identical in mock mode
        for student_id, encodings in known_encodings_dict.items():
            for enc in encodings:
                sim = _cosine_similarity(face_to_compare, enc)
                if sim > best_sim:
                    best_sim = sim
                    best_student_id = student_id
        return best_student_id

    try:
        best_student_id = None
        best_sim = threshold
        for student_id, encodings in known_encodings_dict.items():
            for enc in encodings:
                if not enc:
                    continue
                sim = _cosine_similarity(face_to_compare, enc)
                if sim > best_sim:
                    best_sim = sim
                    best_student_id = student_id
        return best_student_id
    except Exception as e:
        logger.error(f"Error matching face: {str(e)}")
        return None
