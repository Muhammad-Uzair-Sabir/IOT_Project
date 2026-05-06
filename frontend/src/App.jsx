import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { Login } from "./pages/Login.jsx";
import { SignUp } from "./pages/SignUp.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { DevicePage } from "./pages/DevicePage.jsx";
import { PredictionPage } from "./pages/PredictionPage.jsx";
import { fetchConfig, fetchDevices } from "./api.js";

function AppRoutes({ authed, skipAuth, onLogout, googleEnabled, setAuthed }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authed) return;
    if (location.pathname === "/login" || location.pathname === "/signup") {
      navigate("/", { replace: true });
    }
  }, [authed, location.pathname, navigate]);

  if (!authed) {
    return (
      <Routes>
        <Route path="/signup" element={<SignUp onSuccess={() => setAuthed(true)} />} />
        <Route
          path="/login"
          element={<Login onSuccess={() => setAuthed(true)} googleEnabled={googleEnabled} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout onLogout={onLogout} showLogout={!skipAuth && !!localStorage.getItem("token")}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/devices/:deviceId" element={<DevicePage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));
  const [checked, setChecked] = useState(false);
  const [skipAuth, setSkipAuth] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchConfig();
        if (!cancelled) {
          setSkipAuth(!!cfg.skipAuth);
          const hasServerId = !!cfg.googleClientId;
          const hasViteId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
          setGoogleEnabled(hasServerId && hasViteId);
        }
        await fetchDevices();
        if (!cancelled) setAuthed(true);
      } catch (e) {
        if (!cancelled) {
          if (e.status === 401) {
            localStorage.removeItem("token");
            setAuthed(false);
          } else {
            setAuthed(false);
          }
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    localStorage.removeItem("token");
    if (skipAuth) {
      setAuthed(true);
      return;
    }
    setAuthed(false);
  }

  if (!checked) {
    return (
      <div className="layout">
        <p className="loading">Starting…</p>
      </div>
    );
  }

  return (
    <AppRoutes
      authed={authed}
      skipAuth={skipAuth}
      onLogout={logout}
      googleEnabled={googleEnabled}
      setAuthed={setAuthed}
    />
  );
}
