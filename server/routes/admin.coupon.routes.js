import express from "express";
import { PrismaClient } from "@prisma/client";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// Get all coupons
router.get("/coupons", isAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: [{ code: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      data: { coupons },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
      error: error.message,
    });
  }
});

// Get coupon by ID
router.get("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon fetched successfully",
      data: { coupon },
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coupon",
      error: error.message,
    });
  }
});

// Create coupon
router.post("/coupons", isAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (!code || !discountType || !discountValue || !startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Code, discount type, discount value, and start date are required",
      });
    }

    // Validate discount value
    const discountValueNum = parseFloat(discountValue);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be a positive number",
      });
    }

    // Validate min order amount if provided
    let minOrderAmountNum = null;
    if (minOrderAmount) {
      minOrderAmountNum = parseFloat(minOrderAmount);
      if (isNaN(minOrderAmountNum) || minOrderAmountNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum order amount must be a non-negative number",
        });
      }
    }

    // Validate max uses if provided
    let maxUsesNum = null;
    if (maxUses) {
      maxUsesNum = parseInt(maxUses);
      if (isNaN(maxUsesNum) || maxUsesNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Maximum uses must be a positive integer",
        });
      }
    }

    // Validate dates
    const startDateObj = new Date(startDate);
    let endDateObj = null;

    if (endDate) {
      endDateObj = new Date(endDate);
      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: { equals: code, mode: "insensitive" },
      },
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }

    // Create coupon
    const newCoupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discountType,
        discountValue: discountValueNum,
        minOrderAmount: minOrderAmountNum,
        maxUses: maxUsesNum,
        startDate: startDateObj,
        endDate: endDateObj,
        isActive: isActive === undefined ? true : Boolean(isActive),
        usedCount: 0,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: { coupon: newCoupon },
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
});

// Update coupon
router.patch("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate,
      endDate,
      isActive,
    } = req.body;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Prepare update data
    const updateData = {};

    // Update code if provided
    if (code !== undefined) {
      // Check if another coupon with the same code exists
      const duplicateCoupon = await prisma.coupon.findFirst({
        where: {
          code: { equals: code, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicateCoupon) {
        return res.status(400).json({
          success: false,
          message: "A coupon with this code already exists",
        });
      }

      updateData.code = code;
    }

    // Update description if provided
    if (description !== undefined) {
      updateData.description = description;
    }

    // Update discount type if provided
    if (discountType !== undefined) {
      updateData.discountType = discountType;
    }

    // Update discount value if provided
    if (discountValue !== undefined) {
      const discountValueNum = parseFloat(discountValue);
      if (isNaN(discountValueNum) || discountValueNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be a positive number",
        });
      }
      updateData.discountValue = discountValueNum;
    }

    // Update min order amount if provided
    if (minOrderAmount !== undefined) {
      if (minOrderAmount === null || minOrderAmount === "") {
        updateData.minOrderAmount = null;
      } else {
        const minOrderAmountNum = parseFloat(minOrderAmount);
        if (isNaN(minOrderAmountNum) || minOrderAmountNum < 0) {
          return res.status(400).json({
            success: false,
            message: "Minimum order amount must be a non-negative number",
          });
        }
        updateData.minOrderAmount = minOrderAmountNum;
      }
    }

    // Update max uses if provided
    if (maxUses !== undefined) {
      if (maxUses === null || maxUses === "") {
        updateData.maxUses = null;
      } else {
        const maxUsesNum = parseInt(maxUses);
        if (isNaN(maxUsesNum) || maxUsesNum < 1) {
          return res.status(400).json({
            success: false,
            message: "Maximum uses must be a positive integer",
          });
        }
        updateData.maxUses = maxUsesNum;
      }
    }

    // Update start date if provided
    if (startDate !== undefined) {
      const startDateObj = new Date(startDate);
      updateData.startDate = startDateObj;

      // Validate end date if start date is updated
      if (existingCoupon.endDate) {
        const existingEndDate = new Date(existingCoupon.endDate);
        if (startDateObj >= existingEndDate) {
          return res.status(400).json({
            success: false,
            message: "Start date must be before end date",
          });
        }
      }
    }

    // Update end date if provided
    if (endDate !== undefined) {
      if (endDate === null || endDate === "") {
        updateData.endDate = null;
      } else {
        const endDateObj = new Date(endDate);
        const startDateToCompare =
          startDate !== undefined
            ? new Date(startDate)
            : existingCoupon.startDate;

        if (endDateObj <= startDateToCompare) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
        updateData.endDate = endDateObj;
      }
    }

    // Update is active if provided
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // Update coupon
    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: { coupon: updatedCoupon },
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update coupon",
      error: error.message,
    });
  }
});

// Delete coupon
router.delete("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Delete coupon
    await prisma.coupon.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
      error: error.message,
    });
  }
});

export default router;
