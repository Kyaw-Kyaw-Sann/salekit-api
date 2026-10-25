import { Router } from "express";
import { forgotPassword, getMe, login, logout, resendVerificationOtp, resetPassword, signup, verifyEmail } from "../controllers/authControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { loginLimiter, otpLimiter } from "../middleware/rateLimiters.js";

const authRouter = Router()

authRouter.post("/signup", otpLimiter, signup)
authRouter.post("/verify-email", otpLimiter, verifyEmail)
authRouter.post("/resend-verification-otp", otpLimiter, resendVerificationOtp)
authRouter.post("/login", loginLimiter, login)
authRouter.get("/me", requireAuth, getMe)
authRouter.post("/logout", logout)
authRouter.post("/forgot-password", otpLimiter, forgotPassword)
authRouter.post("/reset-password", otpLimiter, resetPassword)

export default authRouter