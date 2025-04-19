import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function fixPermissions() {
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

    console.log(`Fixing permissions for admin: ${admin.email}`);

    // Define the missing permissions we want to add
    const missingPermissions = [
      { resource: "inventory", action: "create" },
      { resource: "inventory", action: "read" },
      { resource: "inventory", action: "update" },
      { resource: "inventory", action: "delete" },
      { resource: "coupons", action: "create" },
      { resource: "coupons", action: "read" },
      { resource: "coupons", action: "update" },
      { resource: "coupons", action: "delete" },
    ];

    // Create a record of existing permissions
    const existingPermissions = admin.permissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    // Track how many permissions were added
    let addedCount = 0;

    // Add each missing permission
    for (const permission of missingPermissions) {
      const permString = `${permission.resource}:${permission.action}`;

      // Skip if permission already exists
      if (existingPermissions.includes(permString)) {
        console.log(`  - Already has: ${permString}`);
        continue;
      }

      console.log(`  + Adding: ${permString}`);

      // Add the permission using the correct table name
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
fixPermissions();
