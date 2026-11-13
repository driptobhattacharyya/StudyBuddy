import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'

const lz = (loader) => lazy(loader)
const Landing = lz(() => import('@/pages/Landing'))
const Login = lz(() => import('@/pages/auth/Login'))
const AuthCallback = lz(() => import('@/pages/auth/AuthCallback'))
const NotFound = lz(() => import('@/pages/NotFound'))

const StudentDashboard = lz(() => import('@/pages/student/Dashboard'))
const StudentNotes = lz(() => import('@/pages/student/Notes'))
const StudentAssignments = lz(() => import('@/pages/student/Assignments'))
const StudentCodeList = lz(() => import('@/pages/student/CodeList'))
const StudentCodeEditor = lz(() => import('@/pages/student/CodeEditor'))
const StudentFlashcards = lz(() => import('@/pages/student/Flashcards'))
const StudentChat = lz(() => import('@/pages/student/Chat'))

const InstructorDashboard = lz(() => import('@/pages/instructor/Dashboard'))
const InstructorNotes = lz(() => import('@/pages/instructor/Notes'))
const InstructorAssignments = lz(() => import('@/pages/instructor/Assignments'))
const InstructorCode = lz(() => import('@/pages/instructor/Code'))

const AdminOverview = lz(() => import('@/pages/admin/Overview'))
const AdminUsers = lz(() => import('@/pages/admin/Users'))
const AdminAIUsage = lz(() => import('@/pages/admin/AIUsage'))
const AdminLogs = lz(() => import('@/pages/admin/Logs'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/app" element={<ProtectedRoute role="student" />}>
        <Route element={<AppShell shell="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="courses/:courseId/notes" element={<StudentNotes />} />
          <Route path="courses/:courseId/assignments" element={<StudentAssignments />} />
          <Route path="courses/:courseId/code" element={<StudentCodeList />} />
          <Route path="courses/:courseId/code/:assignmentId" element={<StudentCodeEditor />} />
          <Route path="courses/:courseId/flashcards" element={<StudentFlashcards />} />
          <Route path="courses/:courseId/chat" element={<StudentChat />} />
        </Route>
      </Route>

      {/* Admins can do everything instructors can. */}
      <Route path="/instructor" element={<ProtectedRoute role={['instructor', 'admin']} />}>
        <Route element={<AppShell shell="instructor" />}>
          <Route index element={<InstructorDashboard />} />
          <Route path="courses/:courseId/notes" element={<InstructorNotes />} />
          <Route path="courses/:courseId/assignments" element={<InstructorAssignments />} />
          <Route path="courses/:courseId/code" element={<InstructorCode />} />
        </Route>
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<AppShell shell="admin" />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="ai" element={<AdminAIUsage />} />
          <Route path="logs" element={<AdminLogs />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
