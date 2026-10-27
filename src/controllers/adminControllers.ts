import type { Request, Response } from "express"
import type { RowDataPacket } from "mysql2"
import type { UserRole } from "../types.js"
import pool from "../db.js"

type AdminUserRow = RowDataPacket & {
  id: string
  name: string
  email: string
  role: UserRole
  is_verified: number
}

type AdminStatsRow = RowDataPacket & {
  total_users: number
  verified_users: number
  total_products: number
}

export async function getAdminUsers(
  _request: Request,
  response: Response,
) {
  try {
    const [users] = await pool.query<AdminUserRow[]>(
      `SELECT id, name, email, role, is_verified
       FROM users
       ORDER BY created_at DESC`,
    )

    return response.status(200).json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified === 1,
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get users"

    console.error(`Failed to get admin users: ${message}`)

    return response.status(500).json({
      message: "Failed to get users",
    })
  }
}

export async function getAdminStats(
  _request: Request,
  response: Response,
) {
  try {
    const [rows] = await pool.query<AdminStatsRow[]>(
      `SELECT
         (SELECT COUNT(*) FROM users) AS total_users,
         (
           SELECT COUNT(*)
           FROM users
           WHERE is_verified = 1
         ) AS verified_users,
         (
           SELECT COUNT(*)
           FROM products
         ) AS total_products`,
    )

    const stats = rows[0]

    return response.status(200).json({
      totalUsers: stats.total_users,
      verifiedUsers: stats.verified_users,
      totalProducts: stats.total_products,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to get admin stats"

    console.error(`Failed to get admin stats: ${message}`)

    return response.status(500).json({
      message: "Failed to get admin stats",
    })
  }
}