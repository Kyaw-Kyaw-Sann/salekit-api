import type { Request, Response } from "express";
import type {
  ForgotPasswordData,
  LoginData,
  ResendVerificationOtpData,
  ResetPasswordData,
  SignupData,
  VerifyEmailData,
} from "../types.js";
import bcrypt from "bcrypt";
import pool from "../db.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createOtpDigest, createOtpExpiry, generateOtp } from "../auth/otp.js";
import { sendPasswordResetOtp, sendVerificationOtp } from "../auth/email.js";
import { createAccessToken } from "../auth/jwt.js";

const ACCESS_TOKEN_COOKIE_NAME = "access_token";

const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

type UserIdRow = RowDataPacket & {
  id: string;
};

type UserVerificationRow = RowDataPacket & {
  id: string;
  is_verified: number;
  verification_otp_hash: string | null;
  verification_otp_expires_at: Date | null;
};

type ResendVerificationUserRow = RowDataPacket & {
  id: string;
  is_verified: number;
};

type LoginUserRow = RowDataPacket & {
  id: string;
  password_hash: string;
  is_verified: number;
};

type MeUserRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
};

type ForgotPasswordUserRow = RowDataPacket & {
  id: string;
};

type ResetPasswordUserRow = RowDataPacket & {
  id: string;
  reset_otp_hash: string | null;
  reset_otp_expires_at: Date | null;
};

function getSignupValidationError(signupData: SignupData): string | null {
  const { name, email, password } = signupData;

  if (typeof name !== "string" || name.trim() === "") {
    return "Name is required";
  }

  if (name.trim().length > 100) {
    return "Name must not exceed 100 characters";
  }

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "Valid email is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  if (typeof password !== "string" || password.length < 8) {
    return "Password must contain at least 8 characters";
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password must not exceed 72 bytes";
  }

  return null;
}

export async function signup(request: Request, response: Response) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const signupData: SignupData = request.body;
  const validationError = getSignupValidationError(signupData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const { name, email, password } = signupData;
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const [existingEmail] = await pool.query<UserIdRow[]>(
      `SELECT id FROM users WHERE email=? LIMIT 1`,
      [cleanEmail],
    );

    if (existingEmail.length > 0) {
      return response.status(409).json({
        message: "Email is already registered.",
      });
    }
    // 409 - conflict

    const id = randomUUID();
    const hashPassword = await bcrypt.hash(password, 12);
    // add these only here to prevent unnecessary password hashings if email duplicates

    const verificationOtp = generateOtp();
    const verificationOtpDigest = createOtpDigest(verificationOtp);
    const verificationOtpExpireAt = createOtpExpiry();

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, verification_otp_hash, verification_otp_expires_at)
         VALUES (?,?,?,?,?,?)`,
      [
        id,
        cleanName,
        cleanEmail,
        hashPassword,
        verificationOtpDigest,
        verificationOtpExpireAt,
      ],
    );

    await sendVerificationOtp(cleanEmail, verificationOtp);

    return response.status(201).json({
      message: "Account is created successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to signup";

    console.log(`Failed to signup, ${message}`);

    return response.status(500).json({
      message: "Failed to signup",
    });
  }
}

function getVerifyEmailError(verificationData: VerifyEmailData): string | null {
  const { email, otp } = verificationData;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "A valid email is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return "OTP must contain exactly 6 digits";
  }

  return null;
}

export async function verifyEmail(request: Request, response: Response) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const verificationData: VerifyEmailData = request.body;
  const validationError = getVerifyEmailError(verificationData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const cleanEmail = verificationData.email.trim().toLowerCase();

  try {
    const [users] = await pool.query<UserVerificationRow[]>(
      `SELECT
        id,
        is_verified,
        verification_otp_hash,
        verification_otp_expires_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    );

    if (users.length === 0) {
      return response.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    const user = users[0];

    if (user.is_verified === 1) {
      return response.status(409).json({
        message: "Email is already verified",
      });
    }

    if (!user.verification_otp_hash || !user.verification_otp_expires_at) {
      return response.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    //////////////////////////////

    const submittedOtpDigest = createOtpDigest(verificationData.otp);

    const submittedDigestBuffer = Buffer.from(submittedOtpDigest, "hex");

    const storedDigestBuffer = Buffer.from(user.verification_otp_hash, "hex");

    const otpMatches =
      submittedDigestBuffer.length === storedDigestBuffer.length &&
      timingSafeEqual(submittedDigestBuffer, storedDigestBuffer);

    const otpExpired = user.verification_otp_expires_at.getTime() <= Date.now();

    if (!otpMatches || otpExpired) {
      return response.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    ////////////////////////////////////

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users
       SET
         is_verified = 1,
         verification_otp_hash = NULL,
         verification_otp_expires_at = NULL
       WHERE id = ?
         AND is_verified = 0
         AND verification_otp_hash = ?
         AND verification_otp_expires_at > NOW()`,
      [user.id, user.verification_otp_hash],
    );

    if (result.affectedRows === 0) {
      return response.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    return response.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify email";

    console.error(`Failed to verify email: ${message}`);

    return response.status(500).json({
      message: "Failed to verify email",
    });
  }
}

function getResendVerificationError(
  resendData: ResendVerificationOtpData,
): string | null {
  const { email } = resendData;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "A valid email is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  return null;
}

export async function resendVerificationOtp(
  request: Request,
  response: Response,
) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const resendData: ResendVerificationOtpData = request.body;
  const validationError = getResendVerificationError(resendData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const cleanEmail = resendData.email.trim().toLowerCase();
  const successMessage =
    "If the account requires verification, a new OTP has been sent";

  try {
    const [users] = await pool.query<ResendVerificationUserRow[]>(
      `SELECT id, is_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    );

    if (users.length === 0 || users[0].is_verified === 1) {
      return response.status(200).json({
        message: successMessage,
      });
    }

    const user = users[0];
    const verificationOtp = generateOtp();
    const verificationOtpDigest = createOtpDigest(verificationOtp);
    const verificationOtpExpiresAt = createOtpExpiry();

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users
       SET
         verification_otp_hash = ?,
         verification_otp_expires_at = ?
       WHERE id = ?
         AND is_verified = 0`,
      [verificationOtpDigest, verificationOtpExpiresAt, user.id],
    );

    if (result.affectedRows === 0) {
      return response.status(200).json({
        message: successMessage,
      });
    }

    await sendVerificationOtp(cleanEmail, verificationOtp);

    return response.status(200).json({
      message: successMessage,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to resend verification OTP";

    console.error(`Failed to resend verification OTP: ${message}`);

    return response.status(500).json({
      message: "Failed to resend verification OTP",
    });
  }
}

function getLoginValidationError(loginData: LoginData): string | null {
  const { email, password } = loginData;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    email.trim().length > 255
  ) {
    return "A valid email is required";
  }

  if (typeof password !== "string" || password.length === 0) {
    return "Password is required";
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Email or password is incorrect";
  }

  return null;
}

export async function login(request: Request, response: Response) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const loginData: LoginData = request.body;
  const validationError = getLoginValidationError(loginData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const cleanEmail = loginData.email.trim().toLowerCase();
  const invalidCredentialsMessage = "Email or password is incorrect";

  try {
    const [users] = await pool.query<LoginUserRow[]>(
      `SELECT id, password_hash, is_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    );

    if (users.length === 0) {
      return response.status(401).json({
        message: invalidCredentialsMessage,
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      loginData.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      return response.status(401).json({
        message: invalidCredentialsMessage,
      });
    }

    if (user.is_verified !== 1) {
      return response.status(403).json({
        message: "Verify your email before logging in",
      });
    }

    const accessToken = createAccessToken(user.id);

    response.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      ...ACCESS_TOKEN_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000,
    });

    return response.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to login";

    console.error(`Failed to login: ${message}`);

    return response.status(500).json({
      message: "Failed to login",
    });
  }
}

export async function getMe(request: Request, response: Response) {
  if (!request.userId) {
    return response.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const [users] = await pool.query<MeUserRow[]>(
      `SELECT id, name, email
       FROM users
       WHERE id = ?
         AND is_verified = 1
       LIMIT 1`,
      [request.userId],
    );

    if (users.length === 0) {
      return response.status(401).json({
        message: "Authentication required",
      });
    }

    const user = users[0];

    return response.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get current user";

    console.error(`Failed to get current user: ${message}`);

    return response.status(500).json({
      message: "Failed to get current user",
    });
  }
}

export function logout(_request: Request, response: Response) {
  response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_COOKIE_OPTIONS);

  return response.status(200).json({
    message: "Logout successful",
  });
}

function getForgotPasswordValidationError(
  forgotPasswordData: ForgotPasswordData,
): string | null {
  const { email } = forgotPasswordData;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "A valid email is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  return null;
}

export async function forgotPassword(request: Request, response: Response) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const forgotPasswordData: ForgotPasswordData = request.body;

  const validationError = getForgotPasswordValidationError(forgotPasswordData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const cleanEmail = forgotPasswordData.email.trim().toLowerCase();

  const successMessage =
    "If an account exists for that email, a password reset OTP has been sent";

  try {
    const [users] = await pool.query<ForgotPasswordUserRow[]>(
      `SELECT id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    );

    if (users.length === 0) {
      return response.status(200).json({
        message: successMessage,
      });
    }

    const user = users[0];
    const resetOtp = generateOtp();
    const resetOtpDigest = createOtpDigest(resetOtp);
    const resetOtpExpiresAt = createOtpExpiry();

    await pool.execute(
      `UPDATE users
       SET
         reset_otp_hash = ?,
         reset_otp_expires_at = ?
       WHERE id = ?`,
      [resetOtpDigest, resetOtpExpiresAt, user.id],
    );

    await sendPasswordResetOtp(cleanEmail, resetOtp);

    return response.status(200).json({
      message: successMessage,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to request password reset";

    console.error(`Failed to request password reset: ${message}`);

    return response.status(500).json({
      message: "Failed to request password reset",
    });
  }
}

function getResetPasswordValidationError(
  resetData: ResetPasswordData,
): string | null {
  const { email, otp, newPassword } = resetData;

  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return "A valid email is required";
  }

  if (email.trim().length > 255) {
    return "Email must not exceed 255 characters";
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return "OTP must contain exactly 6 digits";
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return "New password must contain at least 8 characters";
  }

  if (Buffer.byteLength(newPassword, "utf8") > 72) {
    return "New password must not exceed 72 bytes";
  }

  return null;
}

export async function resetPassword(request: Request, response: Response) {
  if (
    !request.body ||
    typeof request.body !== "object" ||
    Array.isArray(request.body)
  ) {
    return response.status(400).json({
      message: "Request body is required",
    });
  }

  const resetData: ResetPasswordData = request.body;
  const validationError = getResetPasswordValidationError(resetData);

  if (validationError) {
    return response.status(400).json({
      message: validationError,
    });
  }

  const cleanEmail = resetData.email.trim().toLowerCase();
  const invalidOtpMessage = "Invalid or expired OTP";

  try {
    const [users] = await pool.query<ResetPasswordUserRow[]>(
      `SELECT
         id,
         reset_otp_hash,
         reset_otp_expires_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [cleanEmail],
    );

    if (users.length === 0) {
      return response.status(400).json({
        message: invalidOtpMessage,
      });
    }

    const user = users[0];

    if (!user.reset_otp_hash || !user.reset_otp_expires_at) {
      return response.status(400).json({
        message: invalidOtpMessage,
      });
    }

    const submittedOtpDigest = createOtpDigest(resetData.otp);

    const submittedDigestBuffer = Buffer.from(submittedOtpDigest, "hex");

    const storedDigestBuffer = Buffer.from(user.reset_otp_hash, "hex");

    const otpMatches =
      submittedDigestBuffer.length === storedDigestBuffer.length &&
      timingSafeEqual(submittedDigestBuffer, storedDigestBuffer);

    const otpExpired = user.reset_otp_expires_at.getTime() <= Date.now();

    if (!otpMatches || otpExpired) {
      return response.status(400).json({
        message: invalidOtpMessage,
      });
    }

    const newPasswordHash = await bcrypt.hash(resetData.newPassword, 12);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users
       SET
         password_hash = ?,
         reset_otp_hash = NULL,
         reset_otp_expires_at = NULL
       WHERE id = ?
         AND reset_otp_hash = ?
         AND reset_otp_expires_at > NOW()`,
      [newPasswordHash, user.id, user.reset_otp_hash],
    );

    if (result.affectedRows === 0) {
      return response.status(400).json({
        message: invalidOtpMessage,
      });
    }

    response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, ACCESS_TOKEN_COOKIE_OPTIONS);

    return response.status(200).json({
      message: "Password reset successfully. Please log in again.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password";

    console.error(`Failed to reset password: ${message}`);

    return response.status(500).json({
      message: "Failed to reset password",
    });
  }
}
