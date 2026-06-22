from django.db import models
from django.conf import settings

class Grade(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., "Grade 9", "Grade 10"

    def __str__(self):
        return self.name

class Section(models.Model):
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=50)  # e.g., "A", "B"

    class Meta:
        unique_together = ('grade', 'name')

    def __str__(self):
        return f"{self.grade.name} - {self.name}"

class TeacherAssignment(models.Model):
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='assignments',
        limit_choices_to={'role': 'TEACHER'}
    )
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='teacher_assignments')

    class Meta:
        unique_together = ('teacher', 'section')

    def __str__(self):
        return f"{self.teacher.username} -> {self.section}"

class Student(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]
    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=150)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    dob = models.DateField()
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='students')
    photo_path = models.CharField(max_length=255, blank=True, null=True)  # Path to principal photo if any
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.student_id}) - {self.section}"

class FaceEncoding(models.Model):
    ANGLE_CHOICES = [
        ('front', 'Frontal'),
        ('left', 'Left profile'),
        ('right', 'Right profile'),
        ('up', 'Slightly up'),
        ('down', 'Slightly down'),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='encodings')
    encoding = models.JSONField()  # Stored as a list of 128 floats
    angle = models.CharField(max_length=10, choices=ANGLE_CHOICES)
    photo_path = models.CharField(max_length=255, blank=True, null=True)  # Path to the specific angle capture
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.full_name} - {self.get_angle_display()}"
