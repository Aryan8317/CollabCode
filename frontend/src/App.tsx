import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RoomDashboard from './pages/RoomDashboard';
import Workspace from './pages/Workspace';
import Rooms from './pages/Rooms';
import Community from './pages/Community';
import Settings from './pages/Settings';
import GitHubCallback from './pages/GitHubCallback';
import { AuthProvider } from './utils/AuthContext';
import ProtectedRoute from './utils/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <RoomDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rooms" 
            element={
              <ProtectedRoute>
                <Rooms />
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
  );
}

export default App;
