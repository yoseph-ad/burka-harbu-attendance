from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
import numpy as np
from django.conf import settings

from accounts.permissions import IsAdminOrTeacher, IsAdminUser, IsKioskOrAdmin
from students.models import Student, FaceEncoding, TeacherAssignment
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, ScanAttendanceSerializer
from students.face_service import extract_face_encoding, match_face, face_recognition_active, SFACE_COSINE_THRESHOLD

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = AttendanceRecord.objects.all().select_related('student', 'student__section', 'student__section__grade')
        
        # Teachers only see attendance of students in their assigned sections
        if user.role == 'TEACHER':
            assigned_sections = TeacherAssignment.objects.filter(teacher=user).values_list('section_id', flat=True)
            queryset = queryset.filter(student__section_id__in=assigned_sections)

        # Filters
        grade_id = self.request.query_params.get('grade')
        section_id = self.request.query_params.get('section')
        status_param = self.request.query_params.get('status')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        date_param = self.request.query_params.get('date')

        if grade_id:
            queryset = queryset.filter(student__section__grade_id=grade_id)
        if section_id:
            queryset = queryset.filter(student__section_id=section_id)
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if date_param:
            queryset = queryset.filter(date=date_param)
        else:
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Manually marks/updates attendance. Admin and assigned Teachers can do this.
        """
        student_id = request.data.get('student')
        date_str = request.data.get('date', timezone.localdate().isoformat())
        status_val = request.data.get('status', 'PRESENT').upper()
        
        student = get_object_or_404(Student, id=student_id)
        
        # Check permissions for teachers: must be assigned to student's section
        user = request.user
        if user.role == 'TEACHER':
            is_assigned = TeacherAssignment.objects.filter(
                teacher=user, 
                section=student.section
            ).exists()
            if not is_assigned:
                return Response(
                    {"error": "You can only mark attendance for students in your assigned sections."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Update or create the record
        record, created = AttendanceRecord.objects.update_or_create(
            student=student,
            date=date_str,
            defaults={
                'status': status_val,
                'timestamp': timezone.now() if status_val == 'PRESENT' else None,
                'marked_by': 'MANUAL',
                'marked_by_user': user
            }
        )
        
        serializer = self.get_serializer(record)
        return Response(serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

class ScanAttendanceView(APIView):
    permission_classes = [IsAuthenticated, IsKioskOrAdmin]  # Enforce authenticated kiosk or admin user

    def post(self, request):
        # Cleanly check for active session/authentication
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"status": "ERROR", "message": "Active session or authentication credentials missing."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = ScanAttendanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        frame_base64 = serializer.validated_data['frame']
        if not frame_base64:
            return Response(
                {"status": "ERROR", "message": "Missing image frame data."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 1. Fetch all students with active encodings
        students_with_encodings = Student.objects.prefetch_related('encodings').filter(encodings__isnull=False).distinct()
        
        if not students_with_encodings.exists():
            return Response(
                {"status": "ERROR", "message": "No registered face encodings found in the system."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Extract encoding from webcam frame, catching decoding and detector errors
        try:
            detected_encoding = extract_face_encoding(frame_base64)
        except ValueError as e:
            err_msg = str(e)
            # Distinctly separate detector-level face absence from base64 decoding failures
            if "No face detected" in err_msg:
                return Response(
                    {"status": "UNKNOWN", "message": f"Face detection failed: {err_msg}"},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"status": "ERROR", "message": f"Base64 image decoding failed: {err_msg}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"status": "ERROR", "message": f"Unexpected frame processing error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine alignment similarity threshold
        is_active = face_recognition_active()
        threshold = SFACE_COSINE_THRESHOLD if is_active else 0.999

        # 3. Match the detected encoding against known encodings manually for granular console logging
        best_student = None
        best_score = -1.0

        for student in students_with_encodings:
            for face_encoding_obj in student.encodings.all():
                enc = face_encoding_obj.encoding
                if not enc:
                    continue
                # Calculate raw cosine similarity score
                a = np.asarray(detected_encoding, dtype=np.float32)
                b = np.asarray(enc, dtype=np.float32)
                denom = np.linalg.norm(a) * np.linalg.norm(b)
                score = float(np.dot(a, b) / denom) if denom != 0 else -1.0
                
                # Roster Math Logging
                print(f"[Face Recognition Loop] Student: {student.full_name}, ID: {student.student_id}, Cosine Similarity: {score:.6f}")
                
                if score > best_score:
                    best_score = score
                    best_student = student

        # Handle mismatch state
        if not best_student or best_score < threshold:
            return Response(
                {"status": "UNKNOWN", "message": f"Face not recognized (highest similarity: {best_score:.4f} < threshold: {threshold})."},
                status=status.HTTP_200_OK
            )

        today = timezone.localdate()

        # 4. Commit or update attendance records avoiding duplicate DB operations
        try:
            existing_record = AttendanceRecord.objects.filter(student=best_student, date=today).first()
            
            if existing_record:
                if existing_record.status == 'PRESENT':
                    # Face matched, but already logged today
                    return Response({
                        "status": "ALREADY_PRESENT",
                        "message": f"{best_student.full_name} is already marked Present today.",
                        "student": {
                            "full_name": best_student.full_name,
                            "student_id": best_student.student_id,
                            "grade": best_student.section.grade.name,
                            "section": best_student.section.name,
                            "photo_path": best_student.photo_path
                        },
                        "timestamp": existing_record.timestamp
                    }, status=status.HTTP_200_OK)
                else:
                    # Update status to PRESENT from ABSENT/AUTO
                    existing_record.status = 'PRESENT'
                    existing_record.timestamp = timezone.now()
                    existing_record.marked_by = 'FACE'
                    existing_record.save()
                    return Response({
                        "status": "SUCCESSFUL",
                        "message": f"Welcome, {best_student.full_name}! Attendance updated to Present.",
                        "student": {
                            "full_name": best_student.full_name,
                            "student_id": best_student.student_id,
                            "grade": best_student.section.grade.name,
                            "section": best_student.section.name,
                            "photo_path": best_student.photo_path
                        },
                        "timestamp": existing_record.timestamp
                    }, status=status.HTTP_200_OK)
            else:
                # Create a fresh present record
                record = AttendanceRecord.objects.create(
                    student=best_student,
                    date=today,
                    status='PRESENT',
                    timestamp=timezone.now(),
                    marked_by='FACE'
                )
                return Response({
                    "status": "SUCCESSFUL",
                    "message": f"Welcome, {best_student.full_name}! Attendance recorded.",
                    "student": {
                        "full_name": best_student.full_name,
                        "student_id": best_student.student_id,
                        "grade": best_student.section.grade.name,
                        "section": best_student.section.name,
                        "photo_path": best_student.photo_path
                    },
                    "timestamp": record.timestamp
                }, status=status.HTTP_201_CREATED)
                
        except IntegrityError:
            # Handle race condition for concurrent API scans
            existing_record = AttendanceRecord.objects.filter(student=best_student, date=today).first()
            if existing_record and existing_record.status == 'PRESENT':
                return Response({
                    "status": "ALREADY_PRESENT",
                    "message": f"{best_student.full_name} is already marked Present today.",
                    "student": {
                        "full_name": best_student.full_name,
                        "student_id": best_student.student_id,
                        "grade": best_student.section.grade.name,
                        "section": best_student.section.name,
                        "photo_path": best_student.photo_path
                    },
                    "timestamp": existing_record.timestamp
                }, status=status.HTTP_200_OK)
            return Response(
                {"status": "ERROR", "message": "Failed to resolve database integrity during scan save."},
                status=status.HTTP_400_BAD_REQUEST
            )
