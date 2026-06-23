import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://burka-harbu-attendance.onrender.com/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and redirect to login if unauthorized
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const response = await api.post('auth/login/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  getProfile: async () => {
    const response = await api.get('accounts/me/');
    return response.data;
  }
};

export const teacherService = {
  list: async () => {
    const response = await api.get('accounts/teachers/');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('accounts/teachers/', data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`accounts/teachers/${id}/`);
    return response.data;
  },
  listAssignments: async () => {
    const response = await api.get('accounts/assignments/');
    return response.data;
  },
  createAssignment: async (teacherId, sectionId) => {
    const response = await api.post('accounts/assignments/', { teacher: teacherId, section: sectionId });
    return response.data;
  },
  deleteAssignment: async (id) => {
    const response = await api.delete(`accounts/assignments/${id}/`);
    return response.data;
  }
};

export const studentService = {
  list: async (params = {}) => {
    const response = await api.get('students/students/', { params });
    return response.data;
  },
  register: async (studentData) => {
    const response = await api.post('students/students/register/', studentData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`students/students/${id}/`);
    return response.data;
  },
  getGrades: async () => {
    const response = await api.get('students/grades/');
    return response.data;
  },
  getSections: async () => {
    const response = await api.get('students/sections/');
    return response.data;
  },
  createGrade: async (name) => {
    const response = await api.post('students/grades/', { name });
    return response.data;
  },
  createSection: async (gradeId, name) => {
    const response = await api.post('students/sections/', { grade: gradeId, name });
    return response.data;
  }
};

export const attendanceService = {
  listRecords: async (params = {}) => {
    const response = await api.get('attendance/records/', { params });
    return response.data;
  },
  markManual: async (studentId, status, date) => {
    const response = await api.post('attendance/records/', { student: studentId, status, date });
    return response.data;
  },
  scan: async (frameBase64) => {
    const response = await api.post('attendance/scan/', { frame: frameBase64 });
    return response.data;
  }
};

export const reportService = {
  getStats: async () => {
    const response = await api.get('reports/stats/');
    return response.data;
  },
  downloadExcel: async (params = {}) => {
    const token = localStorage.getItem('access_token');
    const response = await axios({
      url: `${API_BASE_URL}reports/download/excel/`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Burka_Harbu_Attendance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadPdf: async (params = {}) => {
    const token = localStorage.getItem('access_token');
    const response = await axios({
      url: `${API_BASE_URL}reports/download/pdf/`,
      method: 'GET',
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Burka_Harbu_Attendance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

export default api;
