import { verifyUserToken } from "../lib/jwt.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  req.user = verifyUserToken(token);
  next();
}

export function requireAuth(skipAuth) {
  return (req, res, next) => {
    if (skipAuth) return next();
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };
}
