import { createHmac, randomInt } from "node:crypto";

const OTP_LIFETIME_MINUTES = 10;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createOtpDigest(otp: string): string {
  const otpSecret = process.env.OTP_SECRET;

  if (!otpSecret) {
    throw new Error("OTP_SECRET is not configured");
  }

  return createHmac("sha256", otpSecret).update(otp).digest("hex");
}

export function createOtpExpiry(): Date {
  return new Date(Date.now() + OTP_LIFETIME_MINUTES * 60 * 1000);
}

// - `generateOtp()` — cryptographically secure ၆ လုံး OTP ထုတ်မယ်။
// - `createOtpDigest()` — `OTP_SECRET` နဲ့ HMAC-SHA-256 digest ပြုလုပ်မယ်။
// - `createOtpExpiry()` — လက်ရှိအချိန်မှ ၁၀ မိနစ်နောက် expiry ထုတ်မယ်။
