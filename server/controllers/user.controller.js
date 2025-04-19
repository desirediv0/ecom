import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  generateAccessAndRefreshTokens,
  setCookies,
} from "../helper/generateAccessAndRefreshTokens.js";
import { validatePassword } from "../helper/validatePassword.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";

import sendEmail from "../utils/sendEmail.js";
import {
  getVerificationTemplate,
  getResetTemplate,
  getDeleteTemplate,
} from "../email/temp/EmailTemplate.js";

// Register a new user
export const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  // Validate password
  validatePassword(password);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiry = new Date();
  verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationTokenExpiry,
    },
  });

  // Remove sensitive data from response
  const userWithoutPassword = { ...newUser };
  delete userWithoutPassword.password;
  delete userWithoutPassword.emailVerificationToken;
  delete userWithoutPassword.emailVerificationExpiry;

  // Send verification email
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  try {
    await sendEmail({
      email,
      subject: "Verify Your Email - EcomSupplements",
      html: getVerificationTemplate(verificationLink),
    });

    console.log("Verification email sent to:", email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Don't throw error, still allow registration
  }

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        userWithoutPassword,
        "User registered successfully. Please verify your email."
      )
    );
});

// Login user
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if user account is active
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );

  // Set cookies
  setCookies(res, accessToken, refreshToken);

  // Remove sensitive data from response
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;
  delete userWithoutPassword.refreshToken;

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        user: userWithoutPassword,
        accessToken,
      },
      "Logged in successfully"
    )
  );
});

// Logout user
export const logoutUser = asyncHandler(async (req, res, next) => {
  // Clear refresh token in database
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
  });

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res.status(200).json(new ApiResponsive(200, {}, "Logged out successfully"));
});

// Refresh token
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // Verify token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
    });

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Verify if incoming token matches stored token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id
    );

    // Set cookies
    setCookies(res, accessToken, refreshToken);

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  // Find user with the token
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  // Update user verification status
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Email verified successfully"));
});

// Forgot password - request reset
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return success even if user doesn't exist (for security)
    return res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "If your email is registered, you will receive a password reset link"
        )
      );
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date();
  resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: resetTokenExpiry,
    },
  });

  // Send password reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      email,
      subject: "Reset Your Password - EcomSupplements",
      html: getResetTemplate(resetLink),
    });

    console.log("Password reset email sent to:", email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    // Don't throw error, still return success response
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {},
        "If your email is registered, you will receive a password reset link"
      )
    );
});

// Reset password with token
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, "Reset token and new password are required");
  }

  // Validate password
  validatePassword(password);

  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update user password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  res.status(200).json(new ApiResponsive(200, {}, "Password reset successful"));
});

// Change password
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  // Validate new password
  validatePassword(newPassword);

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Password changed successfully"));
});

// Get current user profile
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      addresses: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Remove sensitive data
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;
  delete userWithoutPassword.refreshToken;

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: userWithoutPassword },
        "User details fetched successfully"
      )
    );
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;
  let profileImage = null;

  // Process profile image if provided
  if (req.file) {
    // Get current user to check if there's an existing image to delete
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profileImage: true },
    });

    // Delete old image if it exists
    if (currentUser.profileImage) {
      await deleteFromS3(currentUser.profileImage);
    }

    // Upload new image
    profileImage = await processAndUploadImage(req.file);
  }

  // Prepare update data
  const updateData = {
    ...(name && { name }),
    ...(phone && { phone }),
    ...(profileImage && { profileImage }),
  };

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  // Remove sensitive data
  const userWithoutPassword = { ...updatedUser };
  delete userWithoutPassword.password;
  delete userWithoutPassword.refreshToken;

  // Add full URL for profile image
  if (userWithoutPassword.profileImage) {
    userWithoutPassword.profileImageUrl = getFileUrl(
      userWithoutPassword.profileImage
    );
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: userWithoutPassword },
        "Profile updated successfully"
      )
    );
});

// Add address
export const addUserAddress = asyncHandler(async (req, res, next) => {
  const { name, street, city, state, postalCode, country, isDefault } =
    req.body;

  // Validate required fields
  if (!street || !city || !state || !postalCode || !country) {
    throw new ApiError(400, "All address fields are required");
  }

  // If setting as default, clear default flag from other addresses
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  // Create new address
  const newAddress = await prisma.address.create({
    data: {
      userId: req.user.id,
      name,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault: isDefault || false,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { address: newAddress },
        "Address added successfully"
      )
    );
});

// Update address
export const updateUserAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;
  const { name, street, city, state, postalCode, country, isDefault } =
    req.body;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: req.user.id,
    },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // If setting as default, clear default flag from other addresses
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        isDefault: true,
        id: { not: addressId },
      },
      data: { isDefault: false },
    });
  }

  // Update address
  const updatedAddress = await prisma.address.update({
    where: { id: addressId },
    data: {
      ...(name !== undefined && { name }),
      ...(street !== undefined && { street }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(postalCode !== undefined && { postalCode }),
      ...(country !== undefined && { country }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { address: updatedAddress },
        "Address updated successfully"
      )
    );
});

// Delete address
export const deleteUserAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: req.user.id,
    },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // Delete address
  await prisma.address.delete({
    where: { id: addressId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Address deleted successfully"));
});

// Get all addresses for current user
export const getUserAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { addresses }, "Addresses fetched successfully")
    );
});

// Add product to wishlist
export const addToWishlist = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if already in wishlist
  const existingWishlistItem = await prisma.wishlistItem.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  if (existingWishlistItem) {
    throw new ApiError(409, "Product already in wishlist");
  }

  // Add to wishlist
  const wishlistItem = await prisma.wishlistItem.create({
    data: {
      userId: req.user.id,
      productId,
    },
    include: {
      product: {
        include: {
          images: true,
          variants: {
            include: {
              flavor: true,
              weight: true,
            },
          },
        },
      },
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(201, { wishlistItem }, "Product added to wishlist")
    );
});

// Remove product from wishlist
export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  const { wishlistItemId } = req.params;

  // Check if wishlist item exists and belongs to user
  const wishlistItem = await prisma.wishlistItem.findFirst({
    where: {
      id: wishlistItemId,
      userId: req.user.id,
    },
  });

  if (!wishlistItem) {
    throw new ApiError(404, "Wishlist item not found");
  }

  // Delete wishlist item
  await prisma.wishlistItem.delete({
    where: { id: wishlistItemId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product removed from wishlist"));
});

// Get user's wishlist
export const getUserWishlist = asyncHandler(async (req, res, next) => {
  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: {
      product: {
        include: {
          images: true,
          variants: {
            include: {
              flavor: true,
              weight: true,
            },
          },
        },
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { wishlistItems }, "Wishlist fetched successfully")
    );
});

// Get user's orders with pagination
export const getUserOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get total orders count for pagination
  const totalOrders = await prisma.order.count({
    where: { userId: req.user.id },
  });

  // Get paginated orders
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          product: true,
          variant: {
            include: {
              flavor: true,
              weight: true,
            },
          },
        },
      },
      tracking: true,
      razorpayPayment: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: parseInt(limit),
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        orders,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOrders / parseInt(limit)),
        },
      },
      "Orders fetched successfully"
    )
  );
});

// Get order details
export const getOrderDetails = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  // Get order with full details
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.id,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          variant: {
            include: {
              flavor: true,
              weight: true,
            },
          },
        },
      },
      tracking: {
        include: {
          updates: true,
        },
      },
      razorpayPayment: true,
      shippingAddress: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  res
    .status(200)
    .json(
      new ApiResponsive(200, { order }, "Order details fetched successfully")
    );
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.id,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if order can be cancelled
  if (order.status !== "PENDING" && order.status !== "PROCESSING") {
    throw new ApiError(400, "This order cannot be cancelled");
  }

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
    },
  });

  // TODO: Handle inventory restock and payment refund logic

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { order: updatedOrder },
        "Order cancelled successfully"
      )
    );
});

// Request account deletion
export const requestAccountDeletion = asyncHandler(async (req, res, next) => {
  // Generate deletion token
  const deletionToken = crypto.randomBytes(32).toString("hex");
  const deletionTokenExpiry = new Date();
  deletionTokenExpiry.setHours(deletionTokenExpiry.getHours() + 24);

  // Save token to database
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      deletionToken,
      deletionTokenExpiry,
    },
  });

  // Send account deletion confirmation email
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { email: true, name: true },
  });

  const deletionLink = `${process.env.FRONTEND_URL}/confirm-account-deletion/${deletionToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Confirm Account Deletion - EcomSupplements",
      html: getDeleteTemplate(deletionLink),
    });

    console.log("Account deletion email sent to:", user.email);
  } catch (error) {
    console.error("Error sending account deletion email:", error);
    // Don't throw error, still return success response
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {},
        "Account deletion request submitted. Please confirm via the email sent to your registered email address."
      )
    );
});

// Confirm account deletion
export const confirmAccountDeletion = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Deletion token is required");
  }

  // Find user with the token
  const user = await prisma.user.findFirst({
    where: {
      deletionToken: token,
      deletionTokenExpiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired deletion token");
  }

  // Delete user's data
  // Start a transaction to handle cascading deletes
  await prisma.$transaction(async (tx) => {
    // Delete addresses, orders, reviews, etc. if not handled by cascade

    // Delete the profile image if exists
    if (user.profileImage) {
      await deleteFromS3(user.profileImage);
    }

    // Delete user
    await tx.user.delete({
      where: { id: user.id },
    });
  });

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Account deleted successfully"));
});

// Get user reviews
export const getUserReviews = asyncHandler(async (req, res, next) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.user.id },
    include: {
      product: {
        include: {
          images: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, { reviews }, "Reviews fetched successfully"));
});

// Add review
export const addReview = asyncHandler(async (req, res, next) => {
  const { productId, rating, title, comment } = req.body;

  // Validate required fields
  if (!productId || !rating) {
    throw new ApiError(400, "Product ID and rating are required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if user has already reviewed this product
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this product");
  }

  // Check if user has purchased the product
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      order: {
        userId: req.user.id,
        status: {
          in: ["DELIVERED", "SHIPPED"],
        },
      },
      productId,
    },
  });

  if (!hasPurchased) {
    throw new ApiError(403, "You can only review products you have purchased");
  }

  // Add review
  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      productId,
      rating,
      title,
      comment,
      status: "PENDING", // Reviews need approval before display
    },
  });

  res
    .status(201)
    .json(new ApiResponsive(201, { review }, "Review submitted successfully"));
});

// Update review
export const updateReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;
  const { rating, title, comment } = req.body;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      userId: req.user.id,
    },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined && { rating }),
      ...(title !== undefined && { title }),
      ...(comment !== undefined && { comment }),
      status: "PENDING", // Reset to pending when updated
      updatedAt: new Date(),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { review: updatedReview },
        "Review updated successfully"
      )
    );
});

// Delete review
export const deleteReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      userId: req.user.id,
    },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Delete review
  await prisma.review.delete({
    where: { id: reviewId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Review deleted successfully"));
});
