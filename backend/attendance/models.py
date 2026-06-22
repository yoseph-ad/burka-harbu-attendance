from django.db import models
from django.conf import settings
from students.models import Student

class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
    ]
    MARKED_BY_CHOICES = [
        ('FACE', 'Face Recognition'),
        ('MANUAL', 'Manual'),
        ('AUTO', 'System Auto-Absent'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(blank=True, null=True)  # Null if auto-marked absent at end of day
    marked_by = models.CharField(max_length=10, choices=MARKED_BY_CHOICES, default='FACE')
    
    # We can also track who manually marked it (if applicable)
    marked_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='marked_attendance_records'
    )

    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date', 'student__full_name']

    def __str__(self):
        return f"{self.student.full_name} - {self.date}: {self.status}"
