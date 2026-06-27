from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Creates or resets a dedicated Kiosk Device user with least-privilege permissions.'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='kiosk_device')
        parser.add_argument('--password', type=str, default='kiosk1234')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        password = options['password']
        
        # Remove if already exists to ensure clean reset
        User.objects.filter(username=username).delete()

        kiosk_user = User.objects.create_user(
            username=username,
            password=password,
            first_name="Kiosk",
            last_name="Terminal",
            role="KIOSK_DEVICE"
        )
        kiosk_user.is_staff = False
        kiosk_user.is_superuser = False
        kiosk_user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created least-privilege kiosk user: '{username}' with role '{kiosk_user.role}'."
            )
        )
