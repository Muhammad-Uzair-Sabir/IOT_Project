import { Router } from "express";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { signUserToken } from "../lib/jwt.js";
import { authMiddleware } from "../middleware/auth.js";

const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN = 8;

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

export function createAuthRouter({ googleClientId }) {
  const r = Router();
  const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

  r.post("/register", async (req, res) => {
    try {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address." });
      }
      if (password.length < PASSWORD_MIN) {
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} characters.` });
      }

      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(409).json({ error: "Email already registered." });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await User.create({
        email,
        name,
        passwordHash,
        provider: "local",
      });
      const token = signUserToken(user);
      res.status(201).json({
        token,
        user: { email: user.email, name: user.name, provider: user.provider },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post("/login", async (req, res) => {
    try {
      const email = String(req.body?.email || req.body?.username || "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || "");

      if (!isValidEmail(email) || !password) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const user = await User.findOne({ email });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const token = signUserToken(user);
      res.json({
        token,
        user: { email: user.email, name: user.name, provider: user.provider },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  r.post("/google", async (req, res) => {
    try {
      const credential = req.body?.credential;
      if (!googleClient || !googleClientId) {
        return res.status(503).json({ error: "Google sign-in is not configured on the server." });
      }
      if (!credential || typeof credential !== "string") {
        return res.status(400).json({ error: "Missing Google credential." });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        return res.status(401).json({ error: "Invalid Google token." });
      }

      const email = String(payload.email).toLowerCase();
      const googleId = payload.sub;
      const name = String(payload.name || "").trim();

      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      if (!user) {
        user = await User.create({
          email,
          name,
          googleId,
          provider: "google",
          passwordHash: null,
        });
      } else {
        if (!user.googleId) user.googleId = googleId;
        if (user.provider !== "google") user.provider = "google";
        if (name && !user.name) user.name = name;
        await user.save();
      }

      const token = signUserToken(user);
      res.json({
        token,
        user: { email: user.email, name: user.name, provider: user.provider },
      });
    } catch (e) {
      console.error("Google auth error:", e.message);
      res.status(401).json({ error: "Google sign-in failed." });
    }
  });

  r.get("/me", authMiddleware, (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    res.json({
      user: { email: req.user.email },
    });
  });

  return r;
}
