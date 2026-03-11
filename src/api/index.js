import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // لو الـ data فيها FormData، اشيل الـ Content-Type عشان المتصفح يحطه بنفسه مع الـ boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // فقط لو الـ request محتاج authentication (مش public endpoints)
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const isPublic = (
        url.includes('/accounts/login/') ||
        url.includes('/accounts/register/') ||
        url.includes('/courses/courses/') ||
        url.includes('/courses/categories/')
      )
      if (!isPublic) {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh')
        // استخدم history بدل window.location عشان متعملش full reload
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ─── ACCOUNTS ───────────────────────────────────────
export const authAPI = {
  login:                (data) => api.post('/accounts/login/', data),
  register:             (data) => api.post('/accounts/register/', data),
  logout:               (data) => api.post('/accounts/logout/', data || {}),
  getProfile:           ()     => api.get('/accounts/profile/'),
  updateProfile:        (data) => api.patch('/accounts/profile/update/', data),
  changePassword:       (data) => api.post('/accounts/password/change/', data),
  resetPasswordRequest: (data) => api.post('/accounts/password/reset/request/', data),
  resetPasswordConfirm: (data) => api.post('/accounts/password/reset/confirm/', data),
  verifyEmail:          (data) => api.post('/accounts/verify-email/', data),
  loginHistory:         ()     => api.get('/accounts/login-history/'),
  clearLoginHistory:    ()     => api.delete('/accounts/login-history/clear/'),
  deleteLoginEntry:     (id)   => api.delete(`/accounts/login-history/${id}/delete/`),
  deleteAccount:        ()     => api.delete('/accounts/delete/'),
  refreshToken:         (data) => api.post('/accounts/token/refresh/', data),
}

// ─── COURSES ────────────────────────────────────────
export const coursesAPI = {
  // للعامة
  list:         (params) => api.get('/courses/courses/', { params }),
  detail:       (slug)   => api.get(`/courses/courses/${slug}/`),
  reviews:      (slug)   => api.get(`/courses/courses/${slug}/reviews/`),
  addReview:    (slug, data) => api.post(`/courses/courses/${slug}/add_review/`, data),

  // تصنيفات
  categories: (params) => api.get('/courses/categories/', { params })
    .then(r => ({ data: { results: Array.isArray(r.data) ? r.data : (r.data.results || []) } })),

  // فيديوهات
  videoDetail: (id) => api.get(`/courses/videos/${id}/`),

  // للمدرب
  myCourses:   (params)    => api.get('/courses/instructor-courses/', { params }),
  create:      (data)      => api.post('/courses/instructor-courses/', data),
  update:      (id, data)  => api.patch(`/courses/instructor-courses/${id}/`, data),
  delete:      (id)        => api.delete(`/courses/instructor-courses/${id}/`),
  publish:     (id)        => api.post(`/courses/instructor-content/${id}/toggle-publish/`),
  courseStats: (id)        => api.get(`/courses/instructor-content/${id}/stats/`),
  courseStudents: (id)     => api.get(`/courses/instructor-content/${id}/students/`),

  // محتوى الكورس (أقسام + فيديوهات)
  getContent:    (id)             => api.get(`/courses/instructor-content/${id}/sections/`),
  addSection:    (id, data)       => api.post(`/courses/instructor-content/${id}/sections/add/`, data),
  editSection:   (id, sId, data)  => api.patch(`/courses/instructor-content/${id}/sections/${sId}/edit/`, data),
  deleteSection: (id, sId)        => api.delete(`/courses/instructor-content/${id}/sections/${sId}/delete/`),
  reorderSections: (id, data)     => api.post(`/courses/instructor-content/${id}/sections/reorder/`, data),
  addVideo: (id, data, onProgress) => {
    const isFormData = data instanceof FormData
    return api.post(`/courses/instructor-content/${id}/videos/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      onUploadProgress: onProgress ? (e) => {
        const pct = Math.round((e.loaded * 100) / (e.total || 1))
        onProgress(pct)
      } : undefined
    })
  },
  editVideo:     (id, vId, data)  => api.patch(`/courses/instructor-content/${id}/videos/${vId}/edit/`, data),
  deleteVideo:   (id, vId)        => api.delete(`/courses/instructor-content/${id}/videos/${vId}/delete/`),
  reorderVideos: (id, data)       => api.post(`/courses/instructor-content/${id}/videos/reorder/`, data),
}

// ─── STUDENTS ───────────────────────────────────────
export const studentsAPI = {
  me:     () => api.get('/students/me/'),
  list:   (params) => api.get('/students/', { params }),
  detail: (id)     => api.get(`/students/${id}/`),
}

// ─── INSTRUCTORS ────────────────────────────────────
export const instructorsAPI = {
  list:   (params)    => api.get('/instructors/', { params }),
  detail: (id)        => api.get(`/instructors/${id}/`),
  me:     ()          => api.get('/instructors/me/'),
  update: (data)      => api.patch('/instructors/me/', data),
  courses:(id)        => api.get(`/instructors/${id}/courses/`),
}

// ─── ENROLLMENTS ────────────────────────────────────
export const enrollmentsAPI = {
  list:     (params)     => api.get('/enrollments/enrollments/', { params }),
  detail:   (id)         => api.get(`/enrollments/enrollments/${id}/`),
  enroll:   (course_id)  => api.post('/enrollments/enrollments/enroll/', { course_id }),
  drop:     (id)         => api.post(`/enrollments/enrollments/${id}/drop/`),
  active:   ()           => api.get('/enrollments/enrollments/active/'),
  completed:()           => api.get('/enrollments/enrollments/completed/'),

  progress:       (params)     => api.get('/enrollments/progress/', { params }),
  updateProgress: (id, data)   => api.patch(`/enrollments/progress/${id}/`, data),
  markProgress:   (data)       => api.post('/enrollments/progress/update_progress/', data),

  notes:      (params) => api.get('/enrollments/notes/', { params }),
  createNote: (data)   => api.post('/enrollments/notes/', data),
  deleteNote: (id)     => api.delete(`/enrollments/notes/${id}/`),
  notesByCourse: (id)  => api.get(`/enrollments/notes/by_course/?course_id=${id}`),

  certificates:       (params) => api.get('/enrollments/certificates/', { params }),
  certificateDetail:  (id)     => api.get(`/enrollments/certificates/${id}/`),

  // ── للمدرب ──
  instructorList:    (params)       => api.get('/enrollments/instructor-enrollments/', { params }),
  instructorDetail:  (id)           => api.get(`/enrollments/instructor-enrollments/${id}/`),
  approve:           (id, data)     => api.post(`/enrollments/instructor-enrollments/${id}/approve/`, data || {}),
  reject:            (id, data)     => api.post(`/enrollments/instructor-enrollments/${id}/reject/`, data || {}),
  block:             (id, data)     => api.post(`/enrollments/instructor-enrollments/${id}/block/`, data || {}),
  unblock:           (id, data)     => api.post(`/enrollments/instructor-enrollments/${id}/unblock/`, data || {}),
  setProgress:       (id, progress) => api.patch(`/enrollments/instructor-enrollments/${id}/progress/`, { progress }),
  addNote:           (id, note)     => api.patch(`/enrollments/instructor-enrollments/${id}/note/`, { note }),
}

// ─── EXAMS ──────────────────────────────────────────
export const examsAPI = {
  // للطالب
  list:       (params)     => api.get('/exams/', { params }),
  detail:     (id)         => api.get(`/exams/${id}/`),
  start:      (id)         => api.post(`/exams/${id}/start/`),
  submit:     (aId, data)  => api.post(`/exams/attempts/${aId}/submit/`, data),
  result:     (aId)        => api.get(`/exams/attempts/${aId}/result/`),
  myAttempts: (params)     => api.get('/exams/my_attempts/', { params }),
  myStats:    (id)         => api.get(`/exams/${id}/my_stats/`),

  // للمدرب
  instructorList:   (params)       => api.get('/exams/instructor/', { params }),
  instructorCreate: (data)         => api.post('/exams/instructor/', data),
  instructorUpdate: (id, data)     => api.patch(`/exams/instructor/${id}/`, data),
  instructorDelete: (id)           => api.delete(`/exams/instructor/${id}/`),
  instructorDetail: (id)           => api.get(`/exams/instructor/${id}/`),
  publishExam:      (id)           => api.post(`/exams/instructor/${id}/publish/`),
  addQuestion:      (eId, data)    => api.post(`/exams/instructor/${eId}/questions/`, data),
  deleteQuestion:   (eId, qId)     => api.delete(`/exams/instructor/${eId}/questions/${qId}/`),
  examResults:      (eId)          => api.get(`/exams/instructor/${eId}/results/`),
  attemptDetail:    (eId, aId)     => api.get(`/exams/instructor/${eId}/results/${aId}/`),
  examStats:        (eId)          => api.get(`/exams/instructor/${eId}/stats/`),
}

// ─── PAYMENTS ───────────────────────────────────────
export const paymentsAPI = {
  list:          (params) => api.get('/payments/payments/', { params }),
  create:        (data)   => api.post('/payments/payments/', data),
  detail:        (id)     => api.get(`/payments/payments/${id}/`),
  coupons:       ()       => api.get('/payments/coupons/'),
  applyCoupon:   (data)   => api.post('/payments/coupons/apply/', data),
  refunds:       (params) => api.get('/payments/refunds/', { params }),
  requestRefund: (data)   => api.post('/payments/refunds/', data),
}

// ─── NOTIFICATIONS ──────────────────────────────────
export const notificationsAPI = {
  list:              (params) => api.get('/notifications/notifications/', { params }),
  unreadCount:       ()       => api.get('/notifications/notifications/unread_count/'),
  markRead:          (id)     => api.post(`/notifications/notifications/${id}/mark_as_read/`),
  markAllRead:       ()       => api.post('/notifications/notifications/mark_all_as_read/'),
  delete:            (id)     => api.delete(`/notifications/notifications/${id}/`),
  preferences:       ()       => api.get('/notifications/preferences/'),
  updatePreferences: (data)   => api.patch('/notifications/preferences/', data),
  announcements:     (params) => api.get('/notifications/announcements/', { params }),
}

export default api
