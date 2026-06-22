# 🏫 Burka Harbu Secondary School - Digital Attendance Management System

A production-ready, face-recognition-powered web application designed to automate student attendance tracking for Grade 9–12 students at Burka Harbu Secondary School. The system features JWT-based authentication, role-based dashboards (Admin vs. Teacher), live entrance webcam scanning, visual charts, and PDF/Excel report downloads.

---

## 🏗️ Tech Stack
- **Backend**: Python (Django REST Framework)
- **Frontend**: React (Vite + Recharts + Lucide Icons)
- **Database**: PostgreSQL (with SQLite fallback for development)
- **AI Core**: `face_recognition` (dlib) + `OpenCV` (mock mode fallback included)
- **Reports**: `ReportLab` (PDF generation) + `openpyxl` (Excel generation)

---

## 📂 Project Structure
```text
/
├── backend/                  # Django REST API project
│   ├── accounts/             # User profiles, JWT auth, and assigned sections
│   ├── students/             # Grades, Sections, Profiles, and Face Encodings
│   │   └── face_service.py   # AI Facial recognition algorithms and Mock engine
│   ├── attendance/           # Scans, Manual overrides, and Auto-absent tasks
│   ├── reports/              # Statistics computation and PDF/Excel generators
│   └── config/               # Django settings and URL routes
├── frontend/                 # React application
│   ├── src/
│   │   ├── services/api.js   # Axios instance + secure blob download handlers
│   │   ├── pages/            # Login, Dashboard, Registration, Reports, Kiosk
│   │   ├── App.jsx           # Routing & Sidebar framework
│   │   └── index.css         # Design tokens & animations (Laser scanning, Flashes)
├── requirements.txt          # Python packages
├── .env.example              # Server environment variable template
└── README.md                 # Project handbook (this file)
```

---

## 🛠️ Prerequisites & Installation

### 1. System Dependencies (Required for C++ compilation of `dlib`)
If running with real face recognition, your system must have C++ compilers and Cmake installed to compile dlib. On Ubuntu/Debian, run:
```bash
sudo apt update
sudo apt install -y build-essential cmake python3-dev libx11-dev libgtk-3-dev
```

### 2. Backend Setup
1. **Initialize Environment & Install Packages**:
   Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and adjust database credentials:
   ```bash
   cp .env.example .env
   ```
   *Note: If `DB_NAME` is left empty in `.env`, the system automatically falls back to an SQLite database (`db.sqlite3`), making development startup immediate and configuration-free.*

3. **Migrate & Seed the Database**:
   Create tables and populate them with active Grades, Sections, Teacher assignments, registered Students (with mock face vectors), and 15 days of historical logs:
   ```bash
   python3 manage.py makemigrations accounts students attendance
   python3 manage.py migrate
   python3 manage.py setup_school
   ```

4. **Start Django Server**:
   ```bash
   python3 manage.py runserver
   ```
   The backend API will start at `http://localhost:8000/`.

---

### 3. Frontend Setup
1. **Navigate & Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   The frontend app will launch at `http://localhost:5173/`.

---

## 🔐 Credentials & Roles

The `setup_school` seeder creates two pre-configured accounts:

| Role | Username | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full school access, multi-angle face registration, teacher management, kiosk scanning activation, PDF/Excel downloads. |
| **Teacher** | `teacher` | `teacher123` | Restrained access to assigned section (**Grade 9 - A**), daily/weekly/monthly stats, student absence log, PDF/Excel reports. |

---

## 📸 Face Recognition Core Details

### Multi-Angle Registration (Admin Dashboard)
Admins register students by filling in profile details and capturing **5 mandatory angles** using the built-in webcam interface:
1. **Front** (Principal photo used on dashboards)
2. **Left Profile**
3. **Right Profile**
4. **Slightly Up**
5. **Slightly Down**

The backend processes the base64 frames, uses the `face_recognition` library to detect the face locations, extracts the 128-dimensional embedding vectors, and saves them in the database linked to the student profile.

### Entrance Scanner (Kiosk Mode)
The scanner kiosk runs at school entrances. It continuously captures frames every 1.5 seconds:
- **Match Success**: Displays student info, front photo, section, and flashes **Green** with a high-pitched chime confirmation. Marks attendance as `PRESENT` for today.
- **Double Scans**: If a student is already marked present today, shows a **Yellow** warning panel and friendly double-beep, preventing duplicate logs.
- **Not Registered / Match Failed**: Flashes **Red** with a low-pitched warning buzz.
- **End of Day Auto-Absent**: Run the following management command at the end of the school day (e.g., 4:00 PM) via a cron job to automatically mark students without records today as `ABSENT`:
  ```bash
  python3 manage.py auto_mark_absent
  ```

### 🧠 Developer/Mock Face Recognition Fallback
If your development environment does not have C++ headers or cannot compile `dlib` (e.g., headless virtual machines), the application automatically falls back to **Mock Face Recognition Mode**. 
- Form submissions and webcam flows still function.
- Encodings are generated deterministically based on hashes.
- In Kiosk mode, a **Test Simulation** panel appears on the right, allowing you to click registered students to simulate a webcam scanning success/failure immediately.

---

## 📥 Attendance Reports & Analytics
- **Summary Metrics**: Today's present/absent numbers, active attendance rate, and ranked absentees list.
- **Visuals**: Recharts-powered Grade-level comparisons, Section-level comparisons, and daily trend lines.
- **PDF Export**: Print-ready letters with school header, date ranges, summary boxes, and tabular status outputs.
- **Excel Export**: Fully formatted spreadsheets with column width autoscaling, headers styling, and Green/Red colored status highlights.
- **Manual Overrides**: Admins and assigned teachers can override attendance status (Present ⇄ Absent) with a click in the detailed log view.
