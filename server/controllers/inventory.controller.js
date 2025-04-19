import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get inventory logs with pagination and filters
export const getInventoryLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    variantId,
    reason,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filters = {
    ...(variantId && { variantId }),
    ...(reason && { reason }),
    ...(startDate &&
      endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count for pagination
  const totalLogs = await prisma.inventoryLog.count({
    where: filters,
  });

  // Get logs with pagination
  const logs = await prisma.inventoryLog.findMany({
    where: filters,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip,
    take,
  });

  // Get product variants for each log
  const logsWithVariants = await Promise.all(
    logs.map(async (log) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: log.variantId },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
          flavor: true,
          weight: true,
        },
      });

      return {
        ...log,
        variant,
      };
    })
  );

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        logs: logsWithVariants,
        pagination: {
          total: totalLogs,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalLogs / parseInt(limit)),
        },
      },
      "Inventory logs fetched successfully"
    )
  );
});

// Get inventory log by ID
export const getInventoryLogById = asyncHandler(async (req, res) => {
  const { logId } = req.params;

  const log = await prisma.inventoryLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    throw new ApiError(404, "Inventory log not found");
  }

  // Get the variant information
  const variant = await prisma.productVariant.findUnique({
    where: { id: log.variantId },
    include: {
      product: {
        select: {
          name: true,
          slug: true,
        },
      },
      flavor: true,
      weight: true,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { log: { ...log, variant } },
        "Inventory log fetched successfully"
      )
    );
});

// Add inventory (restock)
export const addInventory = asyncHandler(async (req, res) => {
  const { variantId, quantity, notes } = req.body;

  if (!variantId || !quantity || quantity <= 0) {
    throw new ApiError(400, "Valid variant ID and quantity are required");
  }

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Update inventory in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update variant quantity
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        quantity: {
          increment: quantity,
        },
      },
    });

    // Create inventory log
    const inventoryLog = await tx.inventoryLog.create({
      data: {
        variantId,
        quantityChange: quantity,
        reason: "restock",
        previousQuantity: variant.quantity,
        newQuantity: variant.quantity + quantity,
        createdBy: req.user.id,
        notes,
      },
    });

    return { variant: updatedVariant, log: inventoryLog };
  });

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        variant: {
          id: result.variant.id,
          sku: result.variant.sku,
          quantity: result.variant.quantity,
          product: variant.product.name,
        },
        log: result.log,
      },
      "Inventory added successfully"
    )
  );
});

// Remove inventory
export const removeInventory = asyncHandler(async (req, res) => {
  const { variantId, quantity, reason = "adjustment", notes } = req.body;

  if (!variantId || !quantity || quantity <= 0) {
    throw new ApiError(400, "Valid variant ID and quantity are required");
  }

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Check if enough inventory
  if (variant.quantity < quantity) {
    throw new ApiError(400, "Not enough inventory to remove");
  }

  // Update inventory in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update variant quantity
    const updatedVariant = await tx.productVariant.update({
      where: { id: variantId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    // Create inventory log
    const inventoryLog = await tx.inventoryLog.create({
      data: {
        variantId,
        quantityChange: -quantity,
        reason,
        previousQuantity: variant.quantity,
        newQuantity: variant.quantity - quantity,
        createdBy: req.user.id,
        notes,
      },
    });

    return { variant: updatedVariant, log: inventoryLog };
  });

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        variant: {
          id: result.variant.id,
          sku: result.variant.sku,
          quantity: result.variant.quantity,
          product: variant.product.name,
        },
        log: result.log,
      },
      "Inventory removed successfully"
    )
  );
});

// Get inventory overview
export const getInventoryOverview = asyncHandler(async (req, res) => {
  // Get total variants
  const totalVariants = await prisma.productVariant.count({
    where: { isActive: true },
  });

  // Get low stock products (less than 5 in stock)
  const lowStockCount = await prisma.productVariant.count({
    where: {
      isActive: true,
      quantity: {
        lte: 5,
        gt: 0,
      },
    },
  });

  // Get out of stock products
  const outOfStockCount = await prisma.productVariant.count({
    where: {
      isActive: true,
      quantity: 0,
    },
  });

  // Get recent inventory logs
  const recentLogs = await prisma.inventoryLog.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get product variants for each log
  const recentLogsWithVariants = await Promise.all(
    recentLogs.map(async (log) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: log.variantId },
        include: {
          product: {
            select: {
              name: true,
            },
          },
          flavor: true,
          weight: true,
        },
      });

      return {
        ...log,
        variant,
      };
    })
  );

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        totalVariants,
        lowStockCount,
        outOfStockCount,
        inStockPercentage:
          totalVariants > 0
            ? (
                ((totalVariants - outOfStockCount) / totalVariants) *
                100
              ).toFixed(2)
            : 0,
        recentLogs: recentLogsWithVariants,
      },
      "Inventory overview fetched successfully"
    )
  );
});

// Get low stock products
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold = 5, page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalCount = await prisma.productVariant.count({
    where: {
      isActive: true,
      quantity: {
        lte: parseInt(threshold),
      },
    },
  });

  // Get low stock products
  const lowStockProducts = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      quantity: {
        lte: parseInt(threshold),
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
      flavor: true,
      weight: true,
    },
    orderBy: {
      quantity: "asc",
    },
    skip,
    take,
  });

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: lowStockProducts,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit)),
        },
      },
      "Low stock products fetched successfully"
    )
  );
});
