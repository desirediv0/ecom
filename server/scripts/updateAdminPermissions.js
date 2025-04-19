import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Get default permissions based on role
const getDefaultPermissionsForRole = (role) => {
  const permissions = [];

  // Common permissions for all admins
  permissions.push({ resource: "dashboard", action: "read" });

  if (role === "SUPER_ADMIN") {
    // Super admin has all permissions
    permissions.push(
      { resource: "admins", action: "create" },
      { resource: "admins", action: "read" },
      { resource: "admins", action: "update" },
      { resource: "admins", action: "delete" },
      { resource: "users", action: "create" },
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "users", action: "delete" },
      { resource: "products", action: "create" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "products", action: "delete" },
      { resource: "orders", action: "create" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "orders", action: "delete" },
      { resource: "categories", action: "create" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "update" },
      { resource: "categories", action: "delete" },
      { resource: "reviews", action: "create" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "reviews", action: "delete" },
      { resource: "settings", action: "read" },
      { resource: "settings", action: "update" },
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "update" },
      { resource: "coupons", action: "delete" }
    );
  } else if (role === "ADMIN") {
    // Regular admin permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "users", action: "update" },
      { resource: "products", action: "create" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "create" },
      { resource: "categories", action: "update" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "update" }
    );
  } else if (role === "MANAGER") {
    // Manager permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "orders", action: "read" },
      { resource: "orders", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "reviews", action: "read" },
      { resource: "reviews", action: "update" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "create" },
      { resource: "coupons", action: "read" }
    );
  }

  return permissions;
};

async function updateAdminPermissions() {
  try {
    // Get all admins
    const admins = await prisma.admin.findMany({
      include: {
        permissions: true,
      },
    });

    console.log(`Found ${admins.length} admin accounts`);

    // Process each admin
    for (const admin of admins) {
      console.log(`Processing admin: ${admin.email} (${admin.role})`);

      // Get default permissions for this role
      const defaultPermissions = getDefaultPermissionsForRole(admin.role);

      // Create a record of existing permissions
      const existingPermissions = admin.permissions.map(
        (p) => `${p.resource}:${p.action}`
      );

      // Filter out permissions that already exist
      const newPermissions = defaultPermissions.filter(
        (p) => !existingPermissions.includes(`${p.resource}:${p.action}`)
      );

      if (newPermissions.length === 0) {
        console.log(`  ✓ No new permissions needed for ${admin.email}`);
        continue;
      }

      console.log(
        `  Adding ${newPermissions.length} new permissions for ${admin.email}:`
      );

      // Add missing permissions
      for (const permission of newPermissions) {
        console.log(`    • ${permission.resource}:${permission.action}`);

        await prisma.adminPermission.create({
          data: {
            adminId: admin.id,
            resource: permission.resource,
            action: permission.action,
          },
        });
      }

      console.log(`  ✓ Permissions updated for ${admin.email}`);
    }

    console.log("\nPermission update completed successfully!");
  } catch (error) {
    console.error("Error updating permissions:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
updateAdminPermissions();
