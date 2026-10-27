>>>> .env

PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306

DB_USER=root
DB_PASSWORD=rootkyaw2026Oct

DB_NAME=salekit_db

JWT_SECRET=b460d3937955e2aca81d071ceaa8567bbe33a5caabefeff00b66190b8ef81360
OTP_SECRET=58a35ffe99b4bd01e03180ccb0cc996712e2b63d9bf0647f2871c05289336870

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kyawhsan042219@gmail.com
SMTP_PASSWORD=tybgydrjzxaosjyo
SMTP_FROM="SaleKit <kyawhsan042219@gmail.com>"


/////////////////////////////////////////////////////

>>>> user table create

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',

  verification_otp_hash CHAR(64) NULL,
  verification_otp_expires_at DATETIME NULL,

  reset_otp_hash CHAR(64) NULL,
  reset_otp_expires_at DATETIME NULL,

  created_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

////////////////////////////////////////////////////

>>>> types

export type SignupData = {
    name: string
    email: string
    password: string
}

export type VerifyEmailData = {
    email: string
    otp: string
}

export type ResendVerificationOtpData = {
    email: string
}

export type LoginData = {
  email: string
  password: string
}

export type ForgotPasswordData = {
  email: string
}

export type ResetPasswordData = {
  email: string
  otp: string
  newPassword: string
}

export type UserRole = "user" | "admin"

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: UserRole
    }
  }
}

///////////////////////////////////////////////

>>>> all row types in auth controllers

import type { Request, Response } from "express";
import type {
  ForgotPasswordData,
  LoginData,
  ResendVerificationOtpData,
  ResetPasswordData,
  SignupData,
  UserRole,
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
  role: UserRole
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

///////////////////////////////////////////////

>>> email.ts

import "dotenv/config";
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT);
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;

const smtpFrom = process.env.SMTP_FROM;

if (
  !smtpHost ||
  !Number.isInteger(smtpPort) ||
  smtpPort <= 0 ||
  !smtpUser ||
  !smtpPassword ||
   !smtpFrom
) {
  throw new Error("SMTP configuration is incomplete");
}

export async function sendVerificationOtp(
  recipientEmail: string,
  otp: string,
): Promise<void> {
  await emailTransporter.sendMail({
    from: smtpFrom,
    to: recipientEmail,
    subject: "Verify your SaleKit account",
    text: `Your SaleKit verification code is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendPasswordResetOtp(
  recipientEmail: string,
  otp: string,
): Promise<void> {
  await emailTransporter.sendMail({
    from: smtpFrom,
    to: recipientEmail,
    subject: "Reset your SaleKit password",
    text: `Your SaleKit password reset code is ${otp}. It expires in 10 minutes.`,
  })
}

const emailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort === 587,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

export default emailTransporter;

/////////////////////////////////////////////

>>>> otp.ts

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

/////////////////////////////////////////////////

import "dotenv/config"
import jwt from "jsonwebtoken"

const JWT_ISSUER = "salekit-api"
const JWT_AUDIENCE = "salekit-frontend"
const JWT_ALGORITHM = "HS256"

export function createAccessToken(userId: string): string {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured")
  }

  return jwt.sign(
    {
      type: "access",
    },
    jwtSecret,
    {
      algorithm: JWT_ALGORITHM,
      subject: userId,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: "1h",
    },
  )
}

export function verifyAccessToken(token: string): string {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured")
  }

  const payload = jwt.verify(token, jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    payload.sub === "" ||
    payload.type !== "access" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid access token")
  }

  return payload.sub
}

//////////////////////////////////////////

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

/////////////////////////////////////////

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


//////////////////////////////////////////////////

-- 1. Nullable owner column အရင်ထည့်မယ်
ALTER TABLE products
ADD COLUMN user_id CHAR(36)
COLLATE utf8mb4_unicode_ci NULL
AFTER id;

-- 2. Existing products 10 ခုကို Borope ပိုင်အဖြစ်သတ်မှတ်မယ်
UPDATE products
SET user_id = '2e157dba-d2af-4339-8210-1793d6a2e0cb'
WHERE user_id IS NULL;

-- 3. Unowned product မကျန်ကြောင်း စစ်မယ်
SELECT COUNT(*) AS unowned_products
FROM products
WHERE user_id IS NULL;

-- 4. Required ownership နဲ့ foreign key ထည့်မယ်
ALTER TABLE products
MODIFY COLUMN user_id CHAR(36)
  COLLATE utf8mb4_unicode_ci NOT NULL,
ADD INDEX idx_products_user_id (user_id),
ADD CONSTRAINT fk_products_user
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON UPDATE RESTRICT
  ON DELETE RESTRICT;

--5. 
SELECT
  p.id,
  p.name,
  p.user_id,
  u.name AS owner_name,
  u.email AS owner_email
FROM products AS p
JOIN users AS u
  ON u.id = p.user_id;

/////////////////////////////////////////////////

>>>>>>>>>>> RBAC migration sql

ALTER TABLE users
ADD COLUMN role ENUM('user', 'admin')
NOT NULL DEFAULT 'user'
AFTER is_verified;

UPDATE users
SET role = 'admin'
WHERE id = '2e157dba-d2af-4339-8210-1793d6a2e0cb'
  AND is_verified = 1;

SELECT
  id,
  name,
  email,
  is_verified,
  role
FROM users
ORDER BY created_at;

////////////////////////////////////////////////

