import { Router } from "express";
import { getDashboardStats, getRecentOrders } from "@/controllers/dashboard.controller";
import { validateUserAccess } from "@/middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all dashboard routes
router.use(validateUserAccess);

// GET /api/dashboard/stats - Get dashboard statistics
router.get("/stats", getDashboardStats);

// GET /api/dashboard/recent-orders - Get recent orders
router.get("/recent-orders", getRecentOrders);

export default router;
