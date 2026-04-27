import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { Login } from "./pages/Login.jsx";
import { Dashboard } from "./pages/Dashboard.jsx";
import { DevicePage } from "./pages/DevicePage.jsx";
import { PredictionPage } from "./pages/PredictionPage.jsx";
import { fetchConfig, fetchDevices } from "./api.js";

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("token"));
  const [checked, setChecked] = useState(false);
  const [skipAuth, setSkipAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchConfig();
        if (!cancelled) setSkipAuth(!!cfg.skipAuth);
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

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Layout onLogout={logout} showLogout={!skipAuth && !!localStorage.getItem("token")}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/devices/:deviceId" element={<DevicePage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
