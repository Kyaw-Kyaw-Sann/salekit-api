import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/jwt.js";
import type { UserRole } from "../types.js";

const ACCESS_TOKEN_COOKIE_NAME = "access_token";

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

  if (typeof accessToken !== "string" || accessToken === "") {
    return response.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const authenticatedUser = verifyAccessToken(accessToken);

    request.userId = authenticatedUser.userId;
    request.userRole = authenticatedUser.role;

    return next();
  } catch {
    return response.status(401).json({
      message: "Authentication required",
    });
  }
}

export function requireRole(requiredRole: UserRole) {
  return function (
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    if (!request.userId || !request.userRole) {
      return response.status(401).json({
        message: "Authentication required",
      })
    }

    if (request.userRole !== requiredRole) {
      return response.status(403).json({
        message: "Access denied",
      })
    }

    return next()
  }
}
