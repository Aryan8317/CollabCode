import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RoomDashboard from './pages/RoomDashboard';
import Workspace from './pages/Workspace';
import Community from './pages/Community';
import Settings from './pages/Settings';
import GitHubCallback from './pages/GitHubCallback';
import GoogleCallback from './pages/GoogleCallback';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserProfile from './pages/UserProfile';
import RoomsExplorer from './pages/RoomsExplorer';
import Notifications from './pages/Notifications';
import { AuthProvider } from './utils/AuthContext';
import ProtectedRoute from './utils/ProtectedRoute';
import CommandPalette from './components/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <CommandPalette />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/github/callback" element={<GitHubCallback />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <RoomDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/:id?" 
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rooms" 
              element={<Navigate to="/rooms-explorer" replace />} 
            />
            <Route 
              path="/rooms-explorer" 
              element={
                <ProtectedRoute>
                  <RoomsExplorer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/community" 
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/workspace/:roomId" 
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
