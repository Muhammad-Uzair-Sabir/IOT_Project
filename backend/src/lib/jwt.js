import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "dev-secret";

export function signUserToken(userDoc) {
  return jwt.sign(
    { sub: userDoc._id.toString(), email: userDoc.email },
    secret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function verifyUserToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}
