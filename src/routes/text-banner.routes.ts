import { Router } from "express";
import {
  createTextBanner,
  getAllTextBanners,
  getTextBanner,
  updateTextBanner,
  deleteTextBanner,
  toggleTextBannerStatus,
  getActiveTextBanners
} from "../controllers/text-banner.controller";
import { validateAdminAccess } from "../middleware/auth.middleware";

const router = Router();

// Public route (no authentication required)
router.get("/active", getActiveTextBanners);

// Admin routes (require authentication and admin role)
router.post("/", validateAdminAccess, createTextBanner);
router.get("/", validateAdminAccess, getAllTextBanners);
router.get("/:id", validateAdminAccess, getTextBanner);
router.put("/:id", validateAdminAccess, updateTextBanner);
router.delete("/:id", validateAdminAccess, deleteTextBanner);
router.patch("/:id/toggle-status", validateAdminAccess, toggleTextBannerStatus);

export default router;