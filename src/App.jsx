import { Routes, Route } from 'react-router-dom'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CheckInboxPage from './pages/CheckInboxPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import WaitingApprovalPage from './pages/WaitingApprovalPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import CompleteProfilePage from './pages/CompleteProfilePage.jsx'
import EditProfilePage from './pages/EditProfilePage.jsx'
import DirectoryPage from './pages/DirectoryPage.jsx'
import ProjectsPage from './pages/ProjectsPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import RequireActiveMember from './components/RequireActiveMember.jsx'
import AppLayout from './components/AppLayout.jsx'

function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/check-inbox" element={<CheckInboxPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/waiting-approval" element={<WaitingApprovalPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/complete-profile"
        element={
          <RequireActiveMember>
            <CompleteProfilePage />
          </RequireActiveMember>
        }
      />

      <Route
        element={
          <RequireActiveMember>
            <AppLayout />
          </RequireActiveMember>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<EditProfilePage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
