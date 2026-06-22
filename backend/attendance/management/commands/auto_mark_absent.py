from django.core.management.base import BaseCommand
from django.utils import timezone
from students.models import Student
from attendance.models import AttendanceRecord

class Command(BaseCommand):
    help = 'Automatically marks students who have not scanned in today as Absent'

    def handle(self, *args, **options):
        today = timezone.localdate()
        self.stdout.write(self.style.NOTICE(f"Starting auto-absent task for {today}..."))
        
        # Get all student IDs
        all_students = Student.objects.all()
        
        # Get IDs of students who already have an attendance record for today (PRESENT or ABSENT)
        marked_student_ids = AttendanceRecord.objects.filter(
            date=today
        ).values_list('student_id', flat=True)
        
        # Students who need to be marked absent
        unmarked_students = all_students.exclude(id__in=marked_student_ids)
        
        records_to_create = []
        for student in unmarked_students:
            records_to_create.append(
                AttendanceRecord(
                    student=student,
                    date=today,
                    status='ABSENT',
                    timestamp=None,
                    marked_by='AUTO'
                )
            )
            
        if records_to_create:
            # Bulk create to make database operations highly efficient
            created_records = AttendanceRecord.objects.bulk_create(records_to_create)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully marked {len(created_records)} students as ABSENT.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("All students already have attendance recorded for today.")
            )
        
        self.stdout.write(self.style.NOTICE("Auto-absent task completed."))
