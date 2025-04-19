import express from "express";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";
import {
  getInventoryLogs,
  getInventoryLogById,
  addInventory,
  removeInventory,
  getInventoryOverview,
  getLowStockProducts,
} from "../controllers/inventory.controller.js";

const router = express.Router();

// All routes require authentication and admin rights
router.use(verifyAdminJWT);

// Inventory overview dashboard
router.get(
  "/inventory/overview",
  hasPermission("inventory", "read"),
  getInventoryOverview
);

// Get low stock products
router.get(
  "/inventory/low-stock",
  hasPermission("inventory", "read"),
  getLowStockProducts
);

// Get inventory logs with filters
router.get(
  "/inventory/logs",
  hasPermission("inventory", "read"),
  getInventoryLogs
);

// Get specific inventory log
router.get(
  "/inventory/logs/:logId",
  hasPermission("inventory", "read"),
  getInventoryLogById
);

// Add inventory (restock)
router.post(
  "/inventory/add",
  hasPermission("inventory", "create"),
  addInventory
);

// Remove inventory
router.post(
  "/inventory/remove",
  hasPermission("inventory", "delete"),
  removeInventory
);

export default router;
