from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from students.models import TeacherAssignment, Section

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id', 'role']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra user info to the login response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
        }
        # If the user is a teacher, add their assigned sections
        if self.user.role == 'TEACHER':
            assignments = TeacherAssignment.objects.filter(teacher=self.user)
            data['user']['assigned_sections'] = [
                {
                    'id': item.section.id,
                    'grade': item.section.grade.name,
                    'section': item.section.name,
                    'full_name': f"{item.section.grade.name} - {item.section.name}"
                } for item in assignments
            ]
        return data

class TeacherCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        # Always create as teacher
        validated_data['role'] = 'TEACHER'
        user = User.objects.create_user(**validated_data)
        return user

class SectionBriefSerializer(serializers.ModelSerializer):
    grade_name = serializers.CharField(source='grade.name', read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'grade_name']

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    section_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherAssignment
        fields = ['id', 'teacher', 'teacher_name', 'section', 'section_name']

    def get_section_name(self, obj):
        return f"{obj.section.grade.name} - {obj.section.name}"
