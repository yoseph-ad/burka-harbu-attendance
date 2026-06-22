from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Deletes the existing admin user if it exists, and creates a fresh one.'

    def handle(self, *args, **options):
        User = get_user_model()
        username = 'admin'
        password = 'admin123'
        email = 'admin@example.com'
        
        # Delete existing admin user if it exists
        deleted_count, _ = User.objects.filter(username=username).delete()
        if deleted_count > 0:
            self.stdout.write(self.style.WARNING(f"Deleted existing user: {username}"))

        # Create a fresh admin user
        admin_user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name="School",
            last_name="Admin",
            role="ADMIN"
        )
        # Verify staff and superuser permissions are set
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()

        self.stdout.write(self.style.SUCCESS(f"Successfully created fresh admin user: {username}"))
