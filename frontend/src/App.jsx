import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SprintBoard from './pages/SprintBoard';
import Tasks from './pages/Tasks';
import Bugs from './pages/Bugs';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import LandingPage from './pages/LandingPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
      />

      {/* Protected routes with Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board" element={<SprintBoard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeContextProvider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        autoHideDuration={4000}
      >
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeContextProvider>
  );
}
