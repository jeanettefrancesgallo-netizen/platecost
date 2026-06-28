import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CurrentOrgProvider } from '@/features/organizations/CurrentOrgProvider'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RequireOrg } from '@/routes/RequireOrg'
import { RequireSuperAdmin } from '@/routes/RequireSuperAdmin'
import { AppShell } from '@/components/layout/AppShell'
import { AdminShell } from '@/components/admin/AdminShell'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { IngredientsPage } from '@/pages/IngredientsPage'
import { RecipesPage } from '@/pages/RecipesPage'
import { RecipeDetailPage } from '@/pages/RecipeDetailPage'
import { BeveragesPage } from '@/pages/BeveragesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { TeamPage } from '@/pages/TeamPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminTenantsPage } from '@/pages/admin/AdminTenantsPage'
import { AdminTenantDetailPage } from '@/pages/admin/AdminTenantDetailPage'
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage'
import { AdminAnnouncementsPage } from '@/pages/admin/AdminAnnouncementsPage'
import { AdminFeatureFlagsPage } from '@/pages/admin/AdminFeatureFlagsPage'
import { AdminAuditLogPage } from '@/pages/admin/AdminAuditLogPage'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <CurrentOrgProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <RequireOrg>
                      <AppShell />
                    </RequireOrg>
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/ingredients" element={<IngredientsPage />} />
                <Route path="/recipes" element={<RecipesPage />} />
                <Route path="/recipes/:id" element={<RecipeDetailPage />} />
                <Route path="/beverages" element={<BeveragesPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute>
                    <RequireSuperAdmin>
                      <AdminShell />
                    </RequireSuperAdmin>
                  </ProtectedRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/tenants" element={<AdminTenantsPage />} />
                <Route path="/admin/tenants/:id" element={<AdminTenantDetailPage />} />
                <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                <Route path="/admin/feature-flags" element={<AdminFeatureFlagsPage />} />
                <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CurrentOrgProvider>
        </BrowserRouter>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
