from django.core.management.base import BaseCommand

from students.face_service import download_models, CV2_AVAILABLE


class Command(BaseCommand):
    help = 'Downloads the YuNet + SFace ONNX face-recognition model weights into ML_MODELS_DIR.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-download even if the model files already exist.',
        )

    def handle(self, *args, **options):
        if not CV2_AVAILABLE:
            self.stdout.write(self.style.WARNING(
                "OpenCV (cv2) is not installed; face recognition will run in mock mode. "
                "Downloading model files anyway."
            ))

        ok = download_models(force=options['force'])
        if ok:
            self.stdout.write(self.style.SUCCESS("Face recognition models are ready."))
        else:
            self.stdout.write(self.style.ERROR(
                "One or more model files failed to download. "
                "Recognition will fall back to mock mode until they are available."
            ))
