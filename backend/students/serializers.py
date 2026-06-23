import os
import base64
import uuid
from django.conf import settings
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import Grade, Section, Student, FaceEncoding
from .face_service import extract_face_encoding

class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = ['id', 'name']

class SectionSerializer(serializers.ModelSerializer):
    grade_name = serializers.CharField(source='grade.name', read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'grade', 'grade_name', 'name']

class FaceEncodingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaceEncoding
        fields = ['id', 'angle', 'photo_path', 'created_at']

class StudentSerializer(serializers.ModelSerializer):
    grade_id = serializers.IntegerField(source='section.grade.id', read_only=True)
    grade_name = serializers.CharField(source='section.grade.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    section_full = serializers.SerializerMethodField()
    encodings = FaceEncodingSerializer(many=True, read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'full_name', 'gender', 'dob', 
            'section', 'grade_id', 'grade_name', 'section_name', 
            'section_full', 'photo_path', 'created_at', 'encodings'
        ]

    def get_section_full(self, obj):
        return f"{obj.section.grade.name} - {obj.section.name}"

class StudentRegisterSerializer(serializers.ModelSerializer):
    images = serializers.JSONField(write_only=True)  # Dictionary of angle -> base64 string

    class Meta:
        model = Student
        fields = ['student_id', 'full_name', 'gender', 'dob', 'section', 'images']

    def validate_images(self, value):
        required_angles = ['front', 'left', 'right', 'up', 'down', 'tilt']
        if not isinstance(value, dict):
            raise serializers.ValidationError("Images must be a dictionary of angle-base64 mappings.")
            
        for angle in required_angles:
            if angle not in value or not value[angle]:
                raise serializers.ValidationError(f"Missing image for angle: '{angle}'")
        return value

    def create(self, validated_data):
        images_data = validated_data.pop('images')
        student = Student.objects.create(**validated_data)
        
        # Ensure media directory exists
        faces_dir = os.path.join(settings.MEDIA_ROOT, 'faces', student.student_id)
        os.makedirs(faces_dir, exist_ok=True)
        
        front_photo_relative_path = None

        # Process each angle image
        for angle, base64_str in images_data.items():
            try:
                # 1. Extract face encoding
                encoding_vector = extract_face_encoding(base64_str)
                
                # 2. Save image file
                # Extract image header if present
                if ',' in base64_str:
                    header, base64_str = base64_str.split(',')
                    
                image_bytes = base64.b64decode(base64_str)
                filename = f"{student.student_id}_{angle}_{uuid.uuid4().hex[:6]}.jpg"
                filepath = os.path.join(faces_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(image_bytes)
                
                # Create relative path for media
                relative_path = f"faces/{student.student_id}/{filename}"
                
                if angle == 'front':
                    front_photo_relative_path = relative_path
                
                # 3. Save FaceEncoding to database
                FaceEncoding.objects.create(
                    student=student,
                    encoding=encoding_vector,
                    angle=angle,
                    photo_path=relative_path
                )
            except Exception as e:
                # Rollback student creation if any encoding fails
                student.delete()
                # Clean up any saved files
                import shutil
                if os.path.exists(faces_dir):
                    shutil.rmtree(faces_dir)
                raise serializers.ValidationError(
                    {f"images.{angle}": f"Failed to process image: {str(e)}"}
                )

        # Update student principal photo path
        if front_photo_relative_path:
            student.photo_path = front_photo_relative_path
            student.save()

        return student
