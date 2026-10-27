import "dotenv/config";
import jwt from "jsonwebtoken";
import type { UserRole } from "../types.js";

const JWT_ISSUER = "salekit-api";
const JWT_AUDIENCE = "salekit-frontend";
const JWT_ALGORITHM = "HS256";

export function createAccessToken(userId: string, role: UserRole): string {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      type: "access",
      role,
    },
    jwtSecret,
    {
      algorithm: JWT_ALGORITHM,
      subject: userId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: "1h",
    },
  );
}

export function verifyAccessToken(token: string): {
  userId: string;
  role: UserRole;
} {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const payload = jwt.verify(token, jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (
  typeof payload === "string" ||
  typeof payload.sub !== "string" ||
  payload.sub === "" ||
  payload.type !== "access" ||
  typeof payload.exp !== "number" ||
  (payload.role !== "user" && payload.role !== "admin")
) {
  throw new Error("Invalid access token")
}

  return {
  userId: payload.sub,
  role: payload.role,
}
}
