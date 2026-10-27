export type Product = {
    id: string
    name: string
    price: number
    category: string
    stock: number
}

export type ProductFormData = {
    name: string
    price: number
    category: string
    stock: number
}

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