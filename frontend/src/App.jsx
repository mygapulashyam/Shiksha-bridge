import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Auth
import LoginPage from './pages/LoginPage';

// Admin
import AdminDashboard   from './pages/admin/AdminDashboard';
import AdminSchools     from './pages/admin/AdminSchools';
import AdminUsers       from './pages/admin/AdminUsers';
import AdminAnalytics   from './pages/admin/AdminAnalytics';
import AdminSubjects    from './pages/admin/AdminSubjects';
import AdminImport      from './pages/admin/AdminImport';
import AdminRankings    from './pages/admin/AdminRankings';
import AdminClasses     from './pages/admin/AdminClasses';
import AdminResources   from './pages/admin/AdminResources';

// Teacher
import TeacherDashboard    from './pages/teacher/TeacherDashboard';
import TeacherQuizzes      from './pages/teacher/TeacherQuizzes';
import TeacherQuizBuilder  from './pages/teacher/TeacherQuizBuilder';
import TeacherClassView    from './pages/teacher/TeacherClassView';
import TeacherStudentDetail from './pages/teacher/TeacherStudentDetail';
import TeacherAIQuiz       from './pages/teacher/TeacherAIQuiz';
import TeacherAlerts       from './pages/teacher/TeacherAlerts';
import TeacherDoubts       from './pages/teacher/TeacherDoubts';
import TeacherResources    from './pages/teacher/TeacherResources';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import StudentQuizzes   from './pages/student/StudentQuizzes';
import StudentAttempt   from './pages/student/StudentAttempt';
import StudentResult    from './pages/student/StudentResult';
import StudentProgress  from './pages/student/StudentProgress';
import StudentPaths     from './pages/student/StudentPaths';
import StudentDoubts    from './pages/student/StudentDoubts';
import StudentReport    from './pages/student/StudentReport';
import StudentResources from './pages/student/StudentResources';

import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* ── Admin ────────────────────────────────────────────── */}
            <Route path="/admin"           element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/schools"   element={<ProtectedRoute roles={['admin']}><AdminSchools /></ProtectedRoute>} />
            <Route path="/admin/users"     element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/classes"   element={<ProtectedRoute roles={['admin']}><AdminClasses /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
            <Route path="/admin/subjects"  element={<ProtectedRoute roles={['admin']}><AdminSubjects /></ProtectedRoute>} />
            <Route path="/admin/import"    element={<ProtectedRoute roles={['admin']}><AdminImport /></ProtectedRoute>} />
            <Route path="/admin/rankings"  element={<ProtectedRoute roles={['admin']}><AdminRankings /></ProtectedRoute>} />
            <Route path="/admin/resources" element={<ProtectedRoute roles={['admin']}><AdminResources /></ProtectedRoute>} />

            {/* ── Teacher ───────────────────────────────────── */}
            <Route path="/teacher"                     element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/quizzes"             element={<ProtectedRoute roles={['teacher']}><TeacherQuizzes /></ProtectedRoute>} />
            <Route path="/teacher/quizzes/new"         element={<ProtectedRoute roles={['teacher']}><TeacherQuizBuilder /></ProtectedRoute>} />
            <Route path="/teacher/quizzes/:id/edit"    element={<ProtectedRoute roles={['teacher']}><TeacherQuizBuilder /></ProtectedRoute>} />
            <Route path="/teacher/class/:classId"      element={<ProtectedRoute roles={['teacher']}><TeacherClassView /></ProtectedRoute>} />
            <Route path="/teacher/students/:studentId" element={<ProtectedRoute roles={['teacher']}><TeacherStudentDetail /></ProtectedRoute>} />
            <Route path="/teacher/ai-quiz"             element={<ProtectedRoute roles={['teacher']}><TeacherAIQuiz /></ProtectedRoute>} />
            <Route path="/teacher/alerts"              element={<ProtectedRoute roles={['teacher']}><TeacherAlerts /></ProtectedRoute>} />
            <Route path="/teacher/doubts"              element={<ProtectedRoute roles={['teacher']}><TeacherDoubts /></ProtectedRoute>} />
            <Route path="/teacher/resources"           element={<ProtectedRoute roles={['teacher']}><TeacherResources /></ProtectedRoute>} />

            {/* ── Student ───────────────────────────────────── */}
            <Route path="/student"                      element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/quizzes"              element={<ProtectedRoute roles={['student']}><StudentQuizzes /></ProtectedRoute>} />
            <Route path="/student/quiz/:id/attempt"     element={<ProtectedRoute roles={['student']}><StudentAttempt /></ProtectedRoute>} />
            <Route path="/student/attempts/:id/result"  element={<ProtectedRoute roles={['student']}><StudentResult /></ProtectedRoute>} />
            <Route path="/student/progress"             element={<ProtectedRoute roles={['student']}><StudentProgress /></ProtectedRoute>} />
            <Route path="/student/paths"                element={<ProtectedRoute roles={['student']}><StudentPaths /></ProtectedRoute>} />
            <Route path="/student/resources"            element={<ProtectedRoute roles={['student']}><StudentResources /></ProtectedRoute>} />
            <Route path="/student/doubts"               element={<ProtectedRoute roles={['student']}><StudentDoubts /></ProtectedRoute>} />
            <Route path="/student/report"               element={<ProtectedRoute roles={['student']}><StudentReport /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
