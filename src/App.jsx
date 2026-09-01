import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
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
import ApprovalsPage from './pages/admin/ApprovalsPage.jsx'
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import RequireActiveMember from './components/RequireActiveMember.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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
        path="/profile"
        element={
          <RequireActiveMember>
            <EditProfilePage />
          </RequireActiveMember>
        }
      />
      <Route
        path="/directory"
        element={
          <RequireActiveMember>
            <DirectoryPage />
          </RequireActiveMember>
        }
      />
      <Route
        path="/projects"
        element={
          <RequireActiveMember>
            <ProjectsPage />
          </RequireActiveMember>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <RequireActiveMember>
            <ProjectDetailPage />
          </RequireActiveMember>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <RequireAdmin>
            <ApprovalsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AdminUsersPage />
          </RequireAdmin>
        }
      />
    </Routes>
  )
}

export default App
