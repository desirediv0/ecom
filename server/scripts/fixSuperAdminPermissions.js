import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function fixSuperAdminPermissions() {
  try {
    // Get the admin by ID
    const adminId = "65c86eef-416c-46e7-9846-930afc8d2293"; // Your admin ID

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        permissions: true,
      },
    });

    if (!admin) {
      console.error("Admin not found!");
      return;
    }

    if (admin.role !== "SUPER_ADMIN") {
      console.error("Admin is not a SUPER_ADMIN!");
      return;
    }

    console.log(`Fixing permissions for SUPER_ADMIN: ${admin.email}`);

    // Define ALL permissions that a SUPER_ADMIN should have, following exactly the route configuration
    const allSuperAdminPermissions = [
      // Admin management
      { resource: "admins", action: "create" },
      { resource: "admins", action: "read" },
      { resource: "admins", action: "update" },
      { resource: "admins", action: "delete" },

      // User management
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },

      // Products management
      { resource: "products", action: "create" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "products", action: "delete" },

      // Orders management
      { resource: "orders", action: "create" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "orders", action: "delete" },

      // Categories management
      { resource: "categories", action: "create" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "update" },
      { resource: "categories", action: "delete" },

      // Reviews management
      { resource: "reviews", action: "create" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "reviews", action: "delete" },

      // Settings management
      { resource: "settings", action: "read" },
      { resource: "settings", action: "update" },

      // Inventory management
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },

      // Coupons management
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "update" },
      { resource: "coupons", action: "delete" },

      // Dashboard
      { resource: "dashboard", action: "read" },
    ];

    // Create a record of existing permissions
    const existingPermissions = admin.permissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    // Track how many permissions were added
    let addedCount = 0;

    // Add each missing permission
    for (const permission of allSuperAdminPermissions) {
      const permString = `${permission.resource}:${permission.action}`;

      // Skip if permission already exists
      if (existingPermissions.includes(permString)) {
        console.log(`  - Already has: ${permString}`);
        continue;
      }

      console.log(`  + Adding: ${permString}`);

      // Add the permission
      await prisma.permission.create({
        data: {
          adminId: adminId,
          resource: permission.resource,
          action: permission.action,
        },
      });

      addedCount++;
    }

    console.log(`Added ${addedCount} new permissions for ${admin.email}`);
    console.log("Permission fix completed successfully!");
  } catch (error) {
    console.error("Error fixing permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixSuperAdminPermissions();
