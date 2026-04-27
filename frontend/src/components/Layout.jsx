import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

export function Layout({ children, onLogout, showLogout }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="layout">
      <nav className="nav">
        <div className="nav-brand">Smart Energy Monitor</div>
        <div className="nav-links">
          <NavLink end to="/">
            Dashboard
          </NavLink>
          <NavLink to="/devices/ac">AC</NavLink>
          <NavLink to="/devices/lights">Lights</NavLink>
          <NavLink to="/devices/fridge">Fridge</NavLink>
          <NavLink to="/prediction">Prediction</NavLink>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {showLogout && (
            <button type="button" className="btn" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}
