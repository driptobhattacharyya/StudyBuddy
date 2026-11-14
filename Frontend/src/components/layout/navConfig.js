import { Activity, BookOpen, ClipboardList, Code2, Layers, LayoutDashboard, MessagesSquare, ScrollText, Users, Presentation, Table2 } from 'lucide-react'

/** Sidebar definition per shell. `to(courseId)` builds the link; `course: true` items need a selected course. */
export const SHELLS = {
  student: {
    base: '/app',
    label: 'Student',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: () => '/app', end: true },
      { key: 'notes', label: 'Notes', icon: BookOpen, course: true, to: (c) => `/app/courses/${c}/notes` },
      { key: 'assignments', label: 'Assignments', icon: ClipboardList, course: true, to: (c) => `/app/courses/${c}/assignments` },
      { key: 'code', label: 'Code', icon: Code2, course: true, to: (c) => `/app/courses/${c}/code` },
      { key: 'flashcards', label: 'Flashcards', icon: Layers, course: true, to: (c) => `/app/courses/${c}/flashcards` },
      { key: 'chat', label: 'Course chat', icon: MessagesSquare, course: true, to: (c) => `/app/courses/${c}/chat` },
    ],
  },
  instructor: {
    base: '/instructor',
    label: 'Instructor',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: () => '/instructor', end: true },
      { key: 'notes', label: 'Notes', icon: BookOpen, course: true, to: (c) => `/instructor/courses/${c}/notes` },
      { key: 'assignments', label: 'Assignments', icon: ClipboardList, course: true, to: (c) => `/instructor/courses/${c}/assignments` },
      { key: 'code', label: 'Code assignments', icon: Code2, course: true, to: (c) => `/instructor/courses/${c}/code` },
      { key: 'gradebook', label: 'Gradebook', icon: Table2, course: true, to: (c) => `/instructor/courses/${c}/gradebook` },
    ],
  }
  ,
  admin: {
    base: '/admin',
    label: 'Admin',
    noCourses: true,
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: () => '/admin', end: true },
      { key: 'users', label: 'Users', icon: Users, to: () => '/admin/users' },
      { key: 'ai', label: 'AI usage', icon: Activity, to: () => '/admin/ai' },
      { key: 'logs', label: 'AI call log', icon: ScrollText, to: () => '/admin/logs' },
      { key: 'instructor', label: 'Instructor view', icon: Presentation, to: () => '/instructor' },
    ],
  },
}
