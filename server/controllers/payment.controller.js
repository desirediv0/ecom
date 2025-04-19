import crypto from "crypto";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { razorpay } from "../app.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { getFileUrl } from "../utils/deleteFromS3.js";

// Get Razorpay Key
export const getRazorpayKey = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { key: process.env.RAZORPAY_KEY_ID },
        "Razorpay key fetched successfully"
      )
    );
});

// Create Razorpay order
export const checkout = asyncHandler(async (req, res) => {
  const { amount, currency = "INR" } = req.body;

  if (!amount || amount < 1) {
    throw new ApiError(400, "Valid amount is required");
  }

  try {
    const options = {
      amount: Number(amount) * 100, // Razorpay takes amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      throw new ApiError(500, "Error creating Razorpay order");
    }

    res
      .status(200)
      .json(new ApiResponsive(200, order, "Order created successfully"));
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw new ApiError(500, "Error creating Razorpay order", [error.message]);
  }
});

// Verify payment and create order
export const paymentVerification = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddressId,
    billingAddressSameAsShipping = true,
    billingAddress,
    notes,
  } = req.body;

  // Validation
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment details");
  }

  if (!shippingAddressId) {
    throw new ApiError(400, "Shipping address is required");
  }

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  try {
    // Check if payment already processed
    const existingPayment = await prisma.razorpayPayment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id },
    });

    if (existingPayment) {
      throw new ApiError(400, "Payment already processed");
    }

    // Get user's cart items
    const userId = req.user.id;
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            flavor: true,
            weight: true,
          },
        },
      },
    });

    if (!cartItems.length) {
      throw new ApiError(400, "No items in cart");
    }

    // Verify shipping address
    const shippingAddress = await prisma.address.findFirst({
      where: {
        id: shippingAddressId,
        userId,
      },
    });

    if (!shippingAddress) {
      throw new ApiError(404, "Shipping address not found");
    }

    // Calculate order totals
    let subTotal = 0;
    let tax = 0;
    const shippingCost = 99; // Fixed shipping cost (could be made dynamic)
    let discount = 0;

    // Check inventory and calculate totals
    for (const item of cartItems) {
      const variant = item.productVariant;
      const price = variant.salePrice || variant.price;
      const itemTotal = parseFloat(price) * item.quantity;
      subTotal += itemTotal;

      // Check stock availability
      if (variant.quantity < item.quantity) {
        throw new ApiError(400, `Not enough stock for ${variant.product.name}`);
      }
    }

    // Calculate tax (5% of subtotal)
    tax = subTotal * 0.05;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get Razorpay payment details
    const razorpayPaymentDetails = await razorpay.payments.fetch(
      razorpay_payment_id
    );
    const paymentMethod = mapRazorpayMethod(razorpayPaymentDetails.method);

    // Create order and process payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subTotal: subTotal.toFixed(2),
          tax: tax.toFixed(2),
          shippingCost,
          discount,
          total: (subTotal + tax + shippingCost - discount).toFixed(2),
          shippingAddressId,
          billingAddressSameAsShipping,
          billingAddress: !billingAddressSameAsShipping
            ? billingAddress
            : undefined,
          notes,
          status: "PAID",
        },
      });

      // 2. Create the Razorpay payment record
      const payment = await tx.razorpayPayment.create({
        data: {
          orderId: order.id,
          amount: (subTotal + tax + shippingCost - discount).toFixed(2),
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature,
          status: "CAPTURED",
          paymentMethod,
          notes: razorpayPaymentDetails,
        },
      });

      // 3. Create order items and update inventory
      const orderItems = [];
      for (const item of cartItems) {
        const variant = item.productVariant;
        const price = variant.salePrice || variant.price;
        const subtotal = parseFloat(price) * item.quantity;

        // Create order item
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.product.id,
            variantId: variant.id,
            price,
            quantity: item.quantity,
            subtotal,
            isSupplement: variant.product.isSupplement,
          },
        });
        orderItems.push(orderItem);

        // Update inventory
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Log inventory change
        await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            quantityChange: -item.quantity,
            reason: "sale",
            referenceId: order.id,
            previousQuantity: variant.quantity,
            newQuantity: variant.quantity - item.quantity,
            createdBy: userId,
          },
        });
      }

      // 4. Clear the user's cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return { order, payment, orderItems };
    });

    // Send order confirmation email
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.email) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: result.order.id },
          include: {
            product: true,
            variant: {
              include: {
                flavor: true,
                weight: true,
              },
            },
          },
        });

        // Format items for email
        const emailItems = orderItems.map((item) => ({
          name: item.product.name,
          variant: `${item.variant.flavor?.name || ""} ${
            item.variant.weight?.value
          }${item.variant.weight?.unit || ""}`,
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
        }));

        // Send email
        await sendEmail({
          email: user.email,
          subject: `Order Confirmation - #${result.order.orderNumber}`,
          html: getOrderConfirmationTemplate({
            userName: user.name || "Valued Customer",
            orderNumber: result.order.orderNumber,
            orderDate: result.order.createdAt,
            paymentMethod: result.payment.paymentMethod || "Online",
            items: emailItems,
            subtotal: parseFloat(result.order.subTotal).toFixed(2),
            shipping: parseFloat(result.order.shippingCost).toFixed(2),
            tax: parseFloat(result.order.tax).toFixed(2),
            total: parseFloat(result.order.total).toFixed(2),
            shippingAddress: shippingAddress,
          }),
        });
      }
    } catch (emailError) {
      console.error("Order confirmation email error:", emailError);
      // Don't throw error, continue with response
    }

    // Return success response
    return res.status(200).json(
      new ApiResponsive(
        200,
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          paymentId: result.payment.id,
        },
        "Payment verified and order created successfully"
      )
    );
  } catch (error) {
    console.error("Payment Verification Error:", error);

    if (error.code === "P2002") {
      throw new ApiError(400, "Duplicate payment record");
    }

    if (error.code === "P2025") {
      throw new ApiError(404, "Related record not found");
    }

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Payment verification failed"
    );
  }
});

// Get order history
export const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalOrders = await prisma.order.count({
    where: { userId },
  });

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
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
      tracking: true,
      razorpayPayment: {
        select: {
          paymentMethod: true,
          status: true,
          razorpayPaymentId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  // Format response
  const formattedOrders = orders.map((order) => {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      status: order.status,
      total: parseFloat(order.total),
      paymentMethod: order.razorpayPayment?.paymentMethod || "ONLINE",
      paymentStatus: order.razorpayPayment?.status || order.status,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        image: item.product.images[0]
          ? getFileUrl(item.product.images[0].url)
          : null,
        flavor: item.variant.flavor?.name,
        weight: item.variant.weight
          ? `${item.variant.weight.value}${item.variant.weight.unit}`
          : null,
        price: parseFloat(item.price),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
      })),
      tracking: order.tracking
        ? {
            carrier: order.tracking.carrier,
            trackingNumber: order.tracking.trackingNumber,
            status: order.tracking.status,
            estimatedDelivery: order.tracking.estimatedDelivery,
          }
        : null,
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        orders: formattedOrders,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOrders / parseInt(limit)),
        },
      },
      "Order history fetched successfully"
    )
  );
});

// Get order details by ID
export const getOrderDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  // Get order with details
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
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
      shippingAddress: true,
      tracking: {
        include: {
          updates: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      },
      razorpayPayment: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Format response
  const formattedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    status: order.status,
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount),
    total: parseFloat(order.total),
    paymentMethod: order.razorpayPayment?.paymentMethod || "ONLINE",
    paymentId: order.razorpayPayment?.razorpayPaymentId,
    paymentStatus: order.razorpayPayment?.status || order.status,
    notes: order.notes,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      image: item.product.images[0]
        ? getFileUrl(item.product.images[0].url)
        : null,
      flavor: item.variant.flavor?.name,
      weight: item.variant.weight
        ? `${item.variant.weight.value}${item.variant.weight.unit}`
        : null,
      price: parseFloat(item.price),
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddressSameAsShipping
      ? order.shippingAddress
      : order.billingAddress,
    tracking: order.tracking
      ? {
          carrier: order.tracking.carrier,
          trackingNumber: order.tracking.trackingNumber,
          status: order.tracking.status,
          estimatedDelivery: order.tracking.estimatedDelivery,
          updates: order.tracking.updates.map((update) => ({
            status: update.status,
            timestamp: update.timestamp,
            location: update.location,
            description: update.description,
          })),
        }
      : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        formattedOrder,
        "Order details fetched successfully"
      )
    );
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Only allow cancellation for certain statuses
  const allowedStatuses = ["PENDING", "PROCESSING"];
  if (!allowedStatuses.includes(order.status)) {
    throw new ApiError(400, "This order cannot be cancelled");
  }

  // Process cancellation in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    });

    // 2. Return items to inventory
    for (const item of order.items) {
      // Update inventory
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          quantityChange: item.quantity,
          reason: "cancellation",
          referenceId: order.id,
          previousQuantity: item.variant.quantity,
          newQuantity: item.variant.quantity + item.quantity,
          createdBy: userId,
        },
      });
    }

    // 3. Handle payment refund if needed (just mark as refund pending)
    if (order.razorpayPayment) {
      await tx.razorpayPayment.update({
        where: { orderId },
        data: {
          status: "REFUNDED",
        },
      });
    }
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { success: true }, "Order cancelled successfully")
    );
});

// Helper function to map Razorpay payment method to our enum
function mapRazorpayMethod(method) {
  const methodMap = {
    card: "CARD",
    netbanking: "NETBANKING",
    wallet: "WALLET",
    upi: "UPI",
    emi: "EMI",
  };

  return methodMap[method] || "OTHER";
}
