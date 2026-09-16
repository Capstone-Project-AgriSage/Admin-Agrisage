import { createBrowserRouter } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RequirePermission from './components/auth/RequirePermission'
import LoginPage from './features/auth/LoginPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import DashboardPage from './features/dashboard/DashboardPage'
import AccountsPage from './features/accounts/AccountsPage'
import RolesPage from './features/roles/RolesPage'
import AiModerationPage from './features/ai-moderation/AiModerationPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: (
              <RequirePermission module="reports">
                <DashboardPage />
              </RequirePermission>
            ),
          },
          {
            path: 'accounts',
            element: (
              <RequirePermission module="accounts">
                <AccountsPage />
              </RequirePermission>
            ),
          },
          {
            path: 'roles',
            element: (
              <RequirePermission module="roles">
                <RolesPage />
              </RequirePermission>
            ),
          },
          {
            path: 'ai-moderation',
            element: (
              <RequirePermission module="ai-moderation">
                <AiModerationPage />
              </RequirePermission>
            ),
          },
        ],
      },
    ],
  },
])
