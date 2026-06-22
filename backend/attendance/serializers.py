from rest_framework import serializers
from .models import AttendanceRecord
from students.models import Student

class StudentBriefSerializer(serializers.ModelSerializer):
    grade_name = serializers.CharField(source='section.grade.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'full_name', 'grade_name', 'section_name', 'photo_path']

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_details = StudentBriefSerializer(source='student', read_only=True)
    marked_by_user_username = serializers.CharField(source='marked_by_user.username', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'student', 'student_details', 'date', 'status', 
            'timestamp', 'marked_by', 'marked_by_user_username'
        ]

class ScanAttendanceSerializer(serializers.Serializer):
    frame = serializers.CharField(required=True, help_text="Base64 encoded webcam image frame")
