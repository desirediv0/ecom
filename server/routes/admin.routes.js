import express from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  getAllAdmins,
  updateAdminRole,
  deleteAdmin,
  updateAdminPermissions,
} from "../controllers/admin.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
  hasRole,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// Admin Auth Routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// Admin Profile Routes
router.get("/profile", verifyAdminJWT, getAdminProfile);
router.patch("/profile", verifyAdminJWT, updateAdminProfile);
router.post("/change-password", verifyAdminJWT, changeAdminPassword);

// Admin Management Routes (Super Admin Only)
router.get("/admins", verifyAdminJWT, hasRole("SUPER_ADMIN"), getAllAdmins);

router.patch(
  "/admins/:adminId",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  updateAdminRole
);

router.delete(
  "/admins/:adminId",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  deleteAdmin
);

// Update admin permissions (can be used to fix missing permissions)
router.post(
  "/admins/:adminId/update-permissions",
  verifyAdminJWT,
  hasRole("SUPER_ADMIN"),
  updateAdminPermissions
);

export default router;
