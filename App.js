// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import History from './pages/History';
import RequireAuth from './RequireAuth';

function App() {
  // ambil client id dari .env
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '67979327941-3j8oajgeernpront17kcttjontcpnrli.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>

        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              localStorage.getItem('token') || localStorage.getItem('google_credential')
                ? <Navigate to="/dashboard" replace />
                : <Login />
            }
          />
          <Route
            path="/login"
            element={
              localStorage.getItem('token') || localStorage.getItem('google_credential')
                ? <Navigate to="/dashboard" replace />
                : <Login />
            }
          />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/history"
            element={
              <RequireAuth>
                <History />
              </RequireAuth>
            }
          />

          {/* Unknown -> home (login or dashboard) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
