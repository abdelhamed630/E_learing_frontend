import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import WatchCourse from './pages/WatchCourse'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InstructorDashboard from './pages/InstructorDashboard'
import { Categories, Instructors } from './pages/Extra'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner-wrap" style={{ paddingTop: 120 }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function DashboardRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner-wrap" style={{ paddingTop: 120 }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'instructor') return <Navigate to="/instructor/overview" replace />
  return <Navigate to="/dashboard/overview" replace />
}

function AppContent() {
  const [toast, setToast] = useState({ msg: '', type: '', show: false })

  function showToast(msg, type = 'info') {
    setToast({ msg, type, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  return (
    <>
      <Navbar showToast={showToast} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail showToast={showToast} />} />
        <Route path="/watch/:courseId" element={<ProtectedRoute><WatchCourse showToast={showToast} /></ProtectedRoute>} />
        <Route path="/watch/:courseId/:videoId" element={<ProtectedRoute><WatchCourse showToast={showToast} /></ProtectedRoute>} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/login" element={<Login showToast={showToast} />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/:panel" element={<ProtectedRoute role="student"><Dashboard showToast={showToast} /></ProtectedRoute>} />
        <Route path="/instructor" element={<Navigate to="/instructor/overview" replace />} />
        <Route path="/instructor/:panel" element={<ProtectedRoute role="instructor"><InstructorDashboard showToast={showToast} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <div className={`toast ${toast.show ? 'show' : ''} ${toast.type}`}>
        {toast.type === 'success' && '✓ '}{toast.type === 'error' && '✕ '}{toast.msg}
      </div>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
