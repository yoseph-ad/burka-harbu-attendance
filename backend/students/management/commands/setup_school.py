from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from students.models import Grade, Section, Student, FaceEncoding, TeacherAssignment
from attendance.models import AttendanceRecord
import datetime
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with grades, sections, users, students, and historical attendance'

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # 1. Create Admin User
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@burkaharbu.edu.et',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN'
            }
        )
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (credentials: admin / admin123)"))
        else:
            self.stdout.write("Admin user already exists")

        # 2. Create Teacher User
        teacher_user, created = User.objects.get_or_create(
            username='teacher',
            defaults={
                'email': 'teacher@burkaharbu.edu.et',
                'first_name': 'Abebe',
                'last_name': 'Keba',
                'role': 'TEACHER'
            }
        )
        if created:
            teacher_user.set_password('teacher123')
            teacher_user.save()
            self.stdout.write(self.style.SUCCESS("Created teacher user (credentials: teacher / teacher123)"))
        else:
            self.stdout.write("Teacher user already exists")

        # 3. Create Grades 9 to 12
        grade_objects = {}
        for g_num in [9, 10, 11, 12]:
            grade, created = Grade.objects.get_or_create(name=f"Grade {g_num}")
            grade_objects[g_num] = grade
            if created:
                self.stdout.write(f"Created Grade {g_num}")

        # 4. Create Sections (A, B, C) for each Grade
        section_objects = []
        for g_num, grade_obj in grade_objects.items():
            for s_char in ['A', 'B', 'C']:
                section, created = Section.objects.get_or_create(
                    grade=grade_obj,
                    name=s_char
                )
                section_objects.append(section)
                if created:
                    self.stdout.write(f"Created Section {grade_obj.name} - {s_char}")

        # 5. Assign Teacher to Section Grade 9 - A
        sec_9a = Section.objects.get(grade__name="Grade 9", name="A")
        assignment, created = TeacherAssignment.objects.get_or_create(
            teacher=teacher_user,
            section=sec_9a
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Assigned teacher '{teacher_user.username}' to section '{sec_9a}'"))

        # 6. Create Sample Students
        sample_students_data = [
            # Grade 9A (Assigned to our teacher)
            {"student_id": "BH-0091", "full_name": "Lensa Tolosa", "gender": "F", "dob": "2010-04-12", "section": sec_9a},
            {"student_id": "BH-0092", "full_name": "Chala Bekele", "gender": "M", "dob": "2010-09-18", "section": sec_9a},
            {"student_id": "BH-0093", "full_name": "Fatuma Ahmed", "gender": "F", "dob": "2011-01-05", "section": sec_9a},
            {"student_id": "BH-0094", "full_name": "Kenean Samuel", "gender": "M", "dob": "2010-11-22", "section": sec_9a},
            {"student_id": "BH-0095", "full_name": "Tigist Hailu", "gender": "F", "dob": "2010-07-30", "section": sec_9a},
            
            # Grade 9B
            {"student_id": "BH-0096", "full_name": "Desta Alemu", "gender": "M", "dob": "2010-03-15", "section": Section.objects.get(grade__name="Grade 9", name="B")},
            {"student_id": "BH-0097", "full_name": "Aster Kebede", "gender": "F", "dob": "2010-12-01", "section": Section.objects.get(grade__name="Grade 9", name="B")},

            # Grade 10A
            {"student_id": "BH-0101", "full_name": "Yared Yosef", "gender": "M", "dob": "2009-02-14", "section": Section.objects.get(grade__name="Grade 10", name="A")},
            {"student_id": "BH-0102", "full_name": "Selam Daniel", "gender": "F", "dob": "2009-08-25", "section": Section.objects.get(grade__name="Grade 10", name="A")},

            # Grade 11A
            {"student_id": "BH-0111", "full_name": "Bekele Gerba", "gender": "M", "dob": "2008-05-19", "section": Section.objects.get(grade__name="Grade 11", name="A")},
            {"student_id": "BH-0112", "full_name": "Marta Feyisa", "gender": "F", "dob": "2008-10-02", "section": Section.objects.get(grade__name="Grade 11", name="A")},

            # Grade 12A
            {"student_id": "BH-0121", "full_name": "Jafar Mohammed", "gender": "M", "dob": "2007-11-10", "section": Section.objects.get(grade__name="Grade 12", name="A")},
            {"student_id": "BH-0122", "full_name": "Hirut Abebe", "gender": "F", "dob": "2007-06-20", "section": Section.objects.get(grade__name="Grade 12", name="A")},
        ]

        students = []
        for s_data in sample_students_data:
            student, created = Student.objects.get_or_create(
                student_id=s_data["student_id"],
                defaults={
                    "full_name": s_data["full_name"],
                    "gender": s_data["gender"],
                    "dob": datetime.datetime.strptime(s_data["dob"], "%Y-%m-%d").date(),
                    "section": s_data["section"]
                }
            )
            students.append(student)
            if created:
                self.stdout.write(f"Created student: {student.full_name}")

                # Create Mock Face encodings so they are ready for scanning simulation
                # Generates deterministic mock 128 floats
                for angle in ['front', 'left', 'right', 'up', 'down']:
                    # Use a seed based on student ID to keep it deterministic
                    random.seed(int(student.student_id.split('-')[1]) + hash(angle))
                    mock_enc = [random.uniform(-0.1, 0.1) for _ in range(128)]
                    FaceEncoding.objects.create(
                        student=student,
                        encoding=mock_enc,
                        angle=angle
                    )
                self.stdout.write(f"  Added mock face encodings for {student.full_name}")

        # 7. Create Historical Attendance (for the last 15 days)
        # This will provide a beautiful chart database out of the box!
        today = timezone.localdate()
        for i in range(15):
            date = today - datetime.timedelta(days=i)
            # Skip Sundays
            if date.weekday() == 6:
                continue
                
            for student in students:
                # Randomly mark present (85% probability) or absent (15% probability)
                # Ensure Lens Tolosa has high attendance, Chala has low attendance (for ranking)
                if student.student_id == "BH-0091": # Lensa
                    status = 'PRESENT' if random.random() < 0.95 else 'ABSENT'
                elif student.student_id == "BH-0092": # Chala
                    status = 'PRESENT' if random.random() < 0.60 else 'ABSENT'
                else:
                    status = 'PRESENT' if random.random() < 0.85 else 'ABSENT'

                # Skip today's scans for some students to show unmarked dashboard state
                if date == today and random.random() < 0.3:
                    continue

                timestamp = None
                if status == 'PRESENT':
                    # Random scan time in morning: 07:30 to 08:20
                    h = random.choice([7, 8])
                    m = random.randint(30, 59) if h == 7 else random.randint(0, 20)
                    s = random.randint(0, 59)
                    # Create aware datetime
                    naive_dt = datetime.datetime.combine(date, datetime.time(h, m, s))
                    timestamp = timezone.make_aware(naive_dt)

                AttendanceRecord.objects.get_or_create(
                    student=student,
                    date=date,
                    defaults={
                        'status': status,
                        'timestamp': timestamp,
                        'marked_by': 'FACE' if status == 'PRESENT' else 'AUTO'
                    }
                )

        self.stdout.write(self.style.SUCCESS("Database seeding completed!"))
