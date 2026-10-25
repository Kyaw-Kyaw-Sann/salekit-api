import { rateLimit } from "express-rate-limit"

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many login attempts. Please try again later.",
  },
})

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many OTP requests or attempts. Please try again later.",
  },
})

// IP တစ်ခု
// → 15 minutes window
// → request 10 ကြိမ်အထိ
// → 11 ကြိမ်မြောက်မှ 429