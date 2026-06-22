from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    CustomTokenObtainPairSerializer, 
    TeacherCreateSerializer, 
    UserSerializer, 
    TeacherAssignmentSerializer
)
from .permissions import IsAdminUser
from students.models import TeacherAssignment, Section

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        
        # Add extra details depending on the role
        if request.user.role == 'TEACHER':
            assignments = TeacherAssignment.objects.filter(teacher=request.user)
            data['assigned_sections'] = [
                {
                    'id': item.section.id,
                    'grade': item.section.grade.name,
                    'section': item.section.name,
                    'full_name': f"{item.section.grade.name} - {item.section.name}"
                } for item in assignments
            ]
        return Response(data)

class TeacherViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.filter(role='TEACHER')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TeacherCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        # Prevent deleting admin or itself
        user_to_delete = self.get_object()
        if user_to_delete == request.user:
            return Response(
                {"error": "You cannot delete your own admin account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user_to_delete.role == 'ADMIN':
            return Response(
                {"error": "Admin accounts cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = TeacherAssignment.objects.all()
    serializer_class = TeacherAssignmentSerializer

    def create(self, request, *args, **kwargs):
        teacher_id = request.data.get('teacher')
        section_id = request.data.get('section')
        
        # Validate that the teacher exists and has the TEACHER role
        try:
            teacher = User.objects.get(id=teacher_id, role='TEACHER')
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid teacher ID or selected user is not a teacher."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate that the section exists
        try:
            section = Section.objects.get(id=section_id)
        except Section.DoesNotExist:
            return Response(
                {"error": "Section does not exist."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or return existing assignment
        assignment, created = TeacherAssignment.objects.get_or_create(
            teacher=teacher,
            section=section
        )
        
        serializer = self.get_serializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
