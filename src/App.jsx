import { Routes, Route } from 'react-router-dom'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CheckInboxPage from './pages/CheckInboxPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import WaitingApprovalPage from './pages/WaitingApprovalPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DisputesPage from './pages/DisputesPage.jsx'
import DisputeDetailPage from './pages/DisputeDetailPage.jsx'
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
        element={
          <RequireActiveMember>
            <AppLayout />
          </RequireActiveMember>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/disputes" element={<DisputesPage />} />
        <Route path="/disputes/:id" element={<DisputeDetailPage />} />

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
