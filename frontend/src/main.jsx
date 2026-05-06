import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";
import "./chartSetup.js";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function Root() {
  const inner = (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{inner}</GoogleOAuthProvider> : inner;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
