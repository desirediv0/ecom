import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register a new admin
export const registerAdmin = asyncHandler(async (req, res, next) => {
  const { email, password, firstName, lastName, role } = req.body;

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    throw new ApiError(409, "Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin with default permissions
  const newAdmin = await prisma.$transaction(async (tx) => {
    // Create the admin user
    const admin = await tx.admin.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || "ADMIN",
        lastLogin: new Date(),
      },
    });

    // Set up default permissions based on role
    const defaultPermissions = getDefaultPermissionsForRole(role || "ADMIN");

    for (const perm of defaultPermissions) {
      await tx.permission.create({
        data: {
          adminId: admin.id,
          resource: perm.resource,
          action: perm.action,
        },
      });
    }

    return admin;
  });

  // Remove sensitive data from response
  const adminWithoutPassword = { ...newAdmin };
  delete adminWithoutPassword.password;

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        adminWithoutPassword,
        "Admin registered successfully"
      )
    );
});

// Login admin
export const loginAdmin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find admin
  const admin = await prisma.admin.findUnique({
    where: { email },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if admin account is active
  if (!admin.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate token
  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions.map((p) => `${p.resource}:${p.action}`),
    },
    process.env.ADMIN_JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_TOKEN_LIFE || "1d",
    }
  );

  // Update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  });

  // Remove sensitive data from response
  const adminWithoutPassword = { ...admin };
  delete adminWithoutPassword.password;

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        admin: adminWithoutPassword,
        token,
      },
      "Logged in successfully"
    )
  );
});

// Get admin profile
export const getAdminProfile = asyncHandler(async (req, res, next) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  // Remove sensitive data from response
  const adminWithoutPassword = { ...admin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin profile fetched successfully"
      )
    );
});

// Update admin profile
export const updateAdminProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName } = req.body;

  const updatedAdmin = await prisma.admin.update({
    where: { id: req.admin.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    },
  });

  // Remove sensitive data from response
  const adminWithoutPassword = { ...updatedAdmin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin profile updated successfully"
      )
    );
});

// Change admin password
export const changeAdminPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Find admin
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Password changed successfully"));
});

// Get all admins (super admin only)
export const getAllAdmins = asyncHandler(async (req, res, next) => {
  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  const admins = await prisma.admin.findMany({
    include: { permissions: true },
    orderBy: { createdAt: "desc" },
  });

  // Remove sensitive data
  const adminsWithoutPasswords = admins.map((admin) => {
    const adminData = { ...admin };
    delete adminData.password;
    return adminData;
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admins: adminsWithoutPasswords },
        "Admins fetched successfully"
      )
    );
});

// Update admin role (super admin only)
export const updateAdminRole = asyncHandler(async (req, res, next) => {
  const { adminId } = req.params;
  const { role, isActive } = req.body;

  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  // Prevent self-demotion
  if (adminId === req.admin.id) {
    throw new ApiError(400, "You cannot modify your own role");
  }

  const updatedAdmin = await prisma.$transaction(async (tx) => {
    // Update the admin role
    const admin = await tx.admin.update({
      where: { id: adminId },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // If role changed, update permissions
    if (role) {
      // Delete existing permissions
      await tx.permission.deleteMany({
        where: { adminId },
      });

      // Add new permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(role);

      for (const perm of defaultPermissions) {
        await tx.permission.create({
          data: {
            adminId,
            resource: perm.resource,
            action: perm.action,
          },
        });
      }
    }

    return admin;
  });

  // Remove sensitive data
  const adminWithoutPassword = { ...updatedAdmin };
  delete adminWithoutPassword.password;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { admin: adminWithoutPassword },
        "Admin role updated successfully"
      )
    );
});

// Delete admin (super admin only)
export const deleteAdmin = asyncHandler(async (req, res, next) => {
  const { adminId } = req.params;

  // Check if current admin is a super admin
  if (req.admin.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Forbidden: Insufficient permissions");
  }

  // Prevent self-deletion
  if (adminId === req.admin.id) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  // Delete admin
  await prisma.admin.delete({
    where: { id: adminId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Admin deleted successfully"));
});

// Update admin permissions based on their role
export const updateAdminPermissions = asyncHandler(async (req, res) => {
  const { adminId } = req.params;

  // Check if admin exists
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

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
    return res.status(200).json(
      new ApiResponsive(
        200,
        {
          adminId,
          message: "No new permissions to add",
        },
        "Admin permissions are already up to date"
      )
    );
  }

  // Add missing permissions in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const createdPermissions = [];

    for (const permission of newPermissions) {
      const createdPermission = await tx.adminPermission.create({
        data: {
          adminId,
          resource: permission.resource,
          action: permission.action,
        },
      });
      createdPermissions.push(createdPermission);
    }

    return createdPermissions;
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        adminId,
        addedPermissions: result,
        count: result.length,
      },
      `Added ${result.length} new permissions to admin`
    )
  );
});

// Helper function to get default permissions based on role
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
  } else if (role === "CONTENT_EDITOR") {
    // Content editor permissions
    permissions.push(
      { resource: "products", action: "read" },
      { resource: "products", action: "update" },
      { resource: "categories", action: "read" },
      { resource: "categories", action: "update" }
    );
  } else if (role === "SUPPORT_AGENT") {
    // Support agent permissions
    permissions.push(
      { resource: "users", action: "read" },
      { resource: "orders", action: "read" },
      { resource: "products", action: "read" },
      { resource: "reviews", action: "read" },
      { resource: "inventory", action: "read" }
    );
  }

  return permissions;
};
