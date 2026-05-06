import { useState } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { googleAuth, login } from "../api.js";

export function Login({ onSuccess, googleEnabled }) {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem("token", res.token);
      onSuccess();
    } catch (err) {
      setError(err.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Sign in</h1>
        <p>
          Use the seeded demo account <strong>demo@example.com</strong> / <strong>demo123</strong>, sign up, or Google. Server{" "}
          <code>SKIP_AUTH=true</code> skips login entirely.
        </p>
        {googleEnabled && (
          <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={async (cred) => {
                setError("");
                if (!cred.credential) return;
                try {
                  const res = await googleAuth(cred.credential);
                  localStorage.setItem("token", res.token);
                  onSuccess();
                } catch (err) {
                  setError(err.message || "Google sign-in failed.");
                }
              }}
              onError={() => setError("Google sign-in was cancelled or failed.")}
            />
          </div>
        )}
        {googleEnabled && (
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 1rem" }}>or with email</p>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="pass">Password</label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
