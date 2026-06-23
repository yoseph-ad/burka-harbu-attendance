from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from accounts.permissions import IsAdminOrTeacher, IsAdminUser
from students.models import Student, FaceEncoding, TeacherAssignment
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, ScanAttendanceSerializer
from students.face_service import extract_face_encoding, match_face

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
    permission_classes = [IsAuthenticated]  # The kiosk frontend will be logged in (typically as admin or kiosk user)

    def post(self, request):
        serializer = ScanAttendanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        frame_base64 = serializer.validated_data['frame']
        
        # 1. Fetch all students with active encodings
        students_with_encodings = Student.objects.prefetch_related('encodings').filter(encodings__isnull=False).distinct()
        
        if not students_with_encodings.exists():
            return Response(
                {"status": "ERROR", "message": "No registered face encodings found in the system."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Compile dictionary of known encodings { student_id: [enc_1, enc_2, ...] }
        known_encodings_dict = {}
        student_map = {}
        for student in students_with_encodings:
            student_map[student.student_id] = student
            known_encodings_dict[student.student_id] = [enc.encoding for enc in student.encodings.all()]

        # 2. Extract encoding from webcam frame
        try:
            detected_encoding = extract_face_encoding(frame_base64)
        except Exception as e:
            return Response(
                {"status": "NO_FACE", "message": str(e)},
                status=status.HTTP_200_OK  # Return 200 OK so the kiosk loop continues without error
            )

        # 3. Match the detected encoding against known encodings (cosine similarity)
        matched_student_id = match_face(detected_encoding, known_encodings_dict)
        
        if not matched_student_id:
            return Response(
                {"status": "UNKNOWN", "message": "Face not recognized."},
                status=status.HTTP_200_OK
            )
            
        student = student_map[matched_student_id]
        today = timezone.localdate()
        
        # 4. Record attendance
        try:
            # Check if student is already marked present today
            existing_record = AttendanceRecord.objects.filter(student=student, date=today).first()
            
            if existing_record:
                if existing_record.status == 'PRESENT':
                    # Already marked present today - don't update timestamp to prevent duplicates
                    return Response({
                        "status": "ALREADY_MARKED",
                        "message": f"{student.full_name} is already marked Present today.",
                        "student": {
                            "full_name": student.full_name,
                            "student_id": student.student_id,
                            "grade": student.section.grade.name,
                            "section": student.section.name,
                            "photo_path": student.photo_path
                        },
                        "timestamp": existing_record.timestamp
                    }, status=status.HTTP_200_OK)
                else:
                    # Existing record was ABSENT (maybe auto-marked or manual), update to PRESENT
                    existing_record.status = 'PRESENT'
                    existing_record.timestamp = timezone.now()
                    existing_record.marked_by = 'FACE'
                    existing_record.save()
                    record = existing_record
            else:
                # Create a new PRESENT record
                record = AttendanceRecord.objects.create(
                    student=student,
                    date=today,
                    status='PRESENT',
                    timestamp=timezone.now(),
                    marked_by='FACE'
                )
                
            return Response({
                "status": "SUCCESS",
                "message": f"Welcome, {student.full_name}! Attendance recorded.",
                "student": {
                    "full_name": student.full_name,
                    "student_id": student.student_id,
                    "grade": student.section.grade.name,
                    "section": student.section.name,
                    "photo_path": student.photo_path
                },
                "timestamp": record.timestamp
            }, status=status.HTTP_200_OK)
            
        except IntegrityError:
            # Handle edge case where concurrent scans happen
            return Response({
                "status": "ALREADY_MARKED",
                "message": "Attendance already recorded.",
                "student": {
                    "full_name": student.full_name,
                    "student_id": student.student_id,
                }
            }, status=status.HTTP_200_OK)
