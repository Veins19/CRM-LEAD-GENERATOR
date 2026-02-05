// frontend/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import './global.css';

// Page imports
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LeadsPage from './pages/LeadsPage';
import AddLeadPage from './pages/AddLeadPage';
import EditLeadPage from './pages/EditLeadPage';
import UsersPage from './pages/UsersPage';
import AddUserPage from './pages/AddUserPage';
import EditUserPage from './pages/EditUserPage';
import ActivitiesPage from './pages/ActivitiesPage';
import AddActivityPage from './pages/AddActivityPage';
import EditActivityPage from './pages/EditActivityPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import LeadsKanbanPage from './pages/LeadsKanbanPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              },
            }}
          />

          {/* Header shown on all authenticated pages */}
          <Header />

          <div className="app-content" style={{ minHeight: 'calc(100vh - 64px)' }}>
            <Routes>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" />} />

              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Analytics */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />

              {/* Leads */}
              <Route
                path="/leads"
                element={
                  <ProtectedRoute>
                    <LeadsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads/add"
                element={
                  <ProtectedRoute>
                    <AddLeadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditLeadPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads/board"
                element={
                  <ProtectedRoute>
                    <LeadsKanbanPage />
                  </ProtectedRoute>
                }
              />

              {/* Users (Admin only – role handled inside ProtectedRoute / page) */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/add"
                element={
                  <ProtectedRoute>
                    <AddUserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditUserPage />
                  </ProtectedRoute>
                }
              />

              {/* Activities */}
              <Route
                path="/activities"
                element={
                  <ProtectedRoute>
                    <ActivitiesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities/add"
                element={
                  <ProtectedRoute>
                    <AddActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activities/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditActivityPage />
                  </ProtectedRoute>
                }
              />

              {/* Profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <EditProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Fallback */}
              <Route
                path="*"
                element={
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '80vh',
                      textAlign: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <h1 style={{ fontSize: '4rem', color: 'var(--danger)' }}>404</h1>
                    <p style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>
                      Page Not Found
                    </p>
                  </div>
                }
              />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
