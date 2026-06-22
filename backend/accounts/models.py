from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ADMIN = 'ADMIN'
    TEACHER = 'TEACHER'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (TEACHER, 'Teacher'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=TEACHER)
    
    # Add related_name to avoid clash with django's default user
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='accounts_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='accounts_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    @property
    def is_admin(self):
        return self.role == self.ADMIN

    @property
    def is_teacher(self):
        return self.role == self.TEACHER

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
