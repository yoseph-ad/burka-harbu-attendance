from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from accounts.permissions import IsAdminUser, IsAdminOrTeacher
from .models import Grade, Section, Student, TeacherAssignment
from .serializers import (
    GradeSerializer, 
    SectionSerializer, 
    StudentSerializer, 
    StudentRegisterSerializer
)

class GradeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated(), IsAdminOrTeacher()]

class SectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    serializer_class = SectionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated(), IsAdminOrTeacher()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Section.objects.all()
        # Teachers only see assigned sections
        assigned_section_ids = TeacherAssignment.objects.filter(teacher=user).values_list('section_id', flat=True)
        return Section.objects.filter(id__in=assigned_section_ids)

class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]
    serializer_class = StudentSerializer

    def get_permissions(self):
        if self.action in ['register', 'create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated(), IsAdminOrTeacher()]

    def get_queryset(self):
        user = self.request.user
        queryset = Student.objects.all()
        
        # Role isolation: teachers only see students in their assigned sections
        if user.role == 'TEACHER':
            assigned_section_ids = TeacherAssignment.objects.filter(teacher=user).values_list('section_id', flat=True)
            queryset = queryset.filter(section_id__in=assigned_section_ids)

        # Filtering
        grade_id = self.request.query_params.get('grade')
        section_id = self.request.query_params.get('section')
        search_query = self.request.query_params.get('search')

        if grade_id:
            queryset = queryset.filter(section__grade_id=grade_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if search_query:
            queryset = queryset.filter(
                Q(full_name__icontains=search_query) | 
                Q(student_id__icontains=search_query)
            )

        return queryset

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        Registers a new student and captures 5 photos from multiple angles in base64 format.
        """
        serializer = StudentRegisterSerializer(data=request.data)
        if serializer.is_valid():
            student = serializer.save()
            return Response(
                StudentSerializer(student).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
