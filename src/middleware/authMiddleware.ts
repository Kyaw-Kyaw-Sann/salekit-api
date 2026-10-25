import type {
  NextFunction,
  Request,
  Response,
} from "express"
import { verifyAccessToken } from "../auth/jwt.js"

const ACCESS_TOKEN_COOKIE_NAME = "access_token"

export function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const accessToken =
    request.cookies?.[ACCESS_TOKEN_COOKIE_NAME]

  if (
    typeof accessToken !== "string" ||
    accessToken === ""
  ) {
    return response.status(401).json({
      message: "Authentication required",
    })
  }

  try {
    request.userId = verifyAccessToken(accessToken)
    return next()
  } catch {
    return response.status(401).json({
      message: "Authentication required",
    })
  }
}