import { Router } from "express"
import { getAdminStats, getAdminUsers } from "../controllers/adminControllers.js"
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js"

const adminRouter = Router()

adminRouter.use(requireAuth)
adminRouter.use(requireRole("admin"))

adminRouter.get("/users", getAdminUsers)
adminRouter.get("/stats", getAdminStats)

export default adminRouter