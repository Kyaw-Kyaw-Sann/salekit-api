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