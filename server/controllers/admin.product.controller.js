import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { createSlug } from "../helper/Slug.js";

// Get all products with pagination, filtering, and sorting
export const getProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    sort = "createdAt",
    order = "desc",
    featured,
    isActive,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && { categoryId: category }),
    ...(featured !== undefined && { featured: featured === "true" }),
    ...(isActive !== undefined && { isActive: isActive === "true" }),
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: filterConditions,
  });

  // Get products with sorting
  const products = await prisma.product.findMany({
    where: filterConditions,
    include: {
      category: true,
      images: true,
      variants: {
        include: {
          flavor: true,
          weight: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: {
      [sort]: order,
    },
    skip,
    take: parseInt(limit),
  });

  // Format the response data
  const formattedProducts = products.map((product) => {
    // Add image URLs and clean up the data
    return {
      ...product,
      images: product.images.map((image) => ({
        ...image,
        url: getFileUrl(image.url),
      })),
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      "Products fetched successfully"
    )
  );
});

// Get product details by ID
export const getProductById = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: true,
      variants: {
        include: {
          flavor: true,
          weight: true,
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Format the response data
  const formattedProduct = {
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    })),
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { product: formattedProduct },
        "Product fetched successfully"
      )
    );
});

// Create a new product
export const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    categoryId,
    isSupplement,
    ingredients,
    nutritionInfo,
    featured,
  } = req.body;

  // Validation checks
  if (!name || !categoryId) {
    throw new ApiError(400, "Name and category are required");
  }

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Generate slug from name
  const slug = createSlug(name);

  // Check if slug already exists
  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    throw new ApiError(409, "Product with similar name already exists");
  }

  // Create the product
  const newProduct = await prisma.product.create({
    data: {
      name,
      description,
      slug,
      categoryId,
      isSupplement: isSupplement === "true" || isSupplement === true,
      ingredients,
      nutritionInfo: nutritionInfo ? JSON.parse(nutritionInfo) : null,
      featured: featured === "true" || featured === true,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { product: newProduct },
        "Product created successfully"
      )
    );
});

// Update product
export const updateProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const {
    name,
    description,
    categoryId,
    isSupplement,
    ingredients,
    nutritionInfo,
    featured,
    isActive,
  } = req.body;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Prepare update data
  const updateData = {
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(categoryId && { categoryId }),
    ...(isSupplement !== undefined && {
      isSupplement: isSupplement === "true" || isSupplement === true,
    }),
    ...(ingredients !== undefined && { ingredients }),
    ...(nutritionInfo !== undefined && {
      nutritionInfo: nutritionInfo ? JSON.parse(nutritionInfo) : null,
    }),
    ...(featured !== undefined && {
      featured: featured === "true" || featured === true,
    }),
    ...(isActive !== undefined && {
      isActive: isActive === "true" || isActive === true,
    }),
  };

  // If name is changed, update the slug
  if (name && name !== product.name) {
    const newSlug = createSlug(name);

    // Check if new slug already exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        slug: newSlug,
        id: { not: productId },
      },
    });

    if (existingProduct) {
      throw new ApiError(409, "Product with similar name already exists");
    }

    updateData.slug = newSlug;
  }

  // Update product
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { product: updatedProduct },
        "Product updated successfully"
      )
    );
});

// Delete product
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: true,
      variants: true,
      reviews: true,
      orderItems: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if product has any order items
  if (product.orderItems.length > 0) {
    // Instead of deleting, mark it as inactive
    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "Product has associated orders and has been marked as inactive"
        )
      );
    return;
  }

  // Delete product and related entities
  await prisma.$transaction(async (tx) => {
    // Delete images from S3
    for (const image of product.images) {
      await deleteFromS3(image.url);
    }

    // Delete product and all related items (cascading deletes)
    await tx.product.delete({
      where: { id: productId },
    });
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product deleted successfully"));
});

// Upload product image
export const uploadProductImage = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { isPrimary } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Process and upload image
  const imageUrl = await processAndUploadImage(req.file);

  // If setting as primary, update other images to not be primary
  if (isPrimary === "true" || isPrimary === true) {
    await prisma.productImage.updateMany({
      where: {
        productId,
        isPrimary: true,
      },
      data: { isPrimary: false },
    });
  }

  // Create image record
  const image = await prisma.productImage.create({
    data: {
      productId,
      url: imageUrl,
      alt: req.body.alt || product.name,
      isPrimary: isPrimary === "true" || isPrimary === true,
    },
  });

  // Add full URL to response
  image.fullUrl = getFileUrl(imageUrl);

  res
    .status(201)
    .json(
      new ApiResponsive(201, { image }, "Product image uploaded successfully")
    );
});

// Delete product image
export const deleteProductImage = asyncHandler(async (req, res, next) => {
  const { imageId } = req.params;

  // Check if image exists
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    include: {
      product: {
        select: {
          id: true,
          images: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  // Prevent deleting if it's the only image for the product
  if (image.product.images.length === 1) {
    throw new ApiError(400, "Cannot delete the only image for this product");
  }

  // Delete image from S3
  await deleteFromS3(image.url);

  // Delete image record
  await prisma.productImage.delete({
    where: { id: imageId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product image deleted successfully"));
});

// Create product variant
export const createProductVariant = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { sku, flavorId, weightId, price, salePrice, quantity } = req.body;

  // Validate required fields
  if (!sku || !price || !quantity) {
    throw new ApiError(400, "SKU, price, and quantity are required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if SKU already exists
  const existingSku = await prisma.productVariant.findUnique({
    where: { sku },
  });

  if (existingSku) {
    throw new ApiError(409, "SKU already exists");
  }

  // Check if this flavor+weight combination already exists
  if (flavorId && weightId) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId,
        flavorId,
        weightId,
      },
    });

    if (existingVariant) {
      throw new ApiError(
        409,
        "A variant with this flavor and weight combination already exists"
      );
    }
  }

  // Create variant
  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku,
      flavorId: flavorId || null,
      weightId: weightId || null,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      quantity: parseInt(quantity),
    },
    include: {
      flavor: true,
      weight: true,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { variant },
        "Product variant created successfully"
      )
    );
});

// Update product variant
export const updateProductVariant = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;
  const { sku, flavorId, weightId, price, salePrice, quantity, isActive } =
    req.body;

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Check if SKU already exists (if changing)
  if (sku && sku !== variant.sku) {
    const existingSku = await prisma.productVariant.findFirst({
      where: {
        sku,
        id: { not: variantId },
      },
    });

    if (existingSku) {
      throw new ApiError(409, "SKU already exists");
    }
  }

  // Check if this flavor+weight combination already exists (if changing)
  if (
    flavorId !== undefined &&
    weightId !== undefined &&
    (flavorId !== variant.flavorId || weightId !== variant.weightId)
  ) {
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId: variant.productId,
        flavorId: flavorId || null,
        weightId: weightId || null,
        id: { not: variantId },
      },
    });

    if (existingVariant) {
      throw new ApiError(
        409,
        "A variant with this flavor and weight combination already exists"
      );
    }
  }

  // Prepare update data
  const updateData = {
    ...(sku && { sku }),
    ...(flavorId !== undefined && { flavorId: flavorId || null }),
    ...(weightId !== undefined && { weightId: weightId || null }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(salePrice !== undefined && {
      salePrice: salePrice ? parseFloat(salePrice) : null,
    }),
    ...(quantity !== undefined && { quantity: parseInt(quantity) }),
    ...(isActive !== undefined && {
      isActive: isActive === "true" || isActive === true,
    }),
  };

  // Update variant
  const updatedVariant = await prisma.productVariant.update({
    where: { id: variantId },
    data: updateData,
    include: {
      flavor: true,
      weight: true,
    },
  });

  // If updating quantity, log the inventory change
  if (quantity !== undefined) {
    await prisma.inventoryLog.create({
      data: {
        variantId,
        quantityChange: parseInt(quantity) - variant.quantity,
        reason: "adjustment",
        previousQuantity: variant.quantity,
        newQuantity: parseInt(quantity),
        notes: "Admin adjustment",
        createdBy: req.admin.id,
      },
    });
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: updatedVariant },
        "Product variant updated successfully"
      )
    );
});

// Delete product variant
export const deleteProductVariant = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        select: {
          id: true,
          variants: {
            select: { id: true },
          },
        },
      },
      orderItems: true,
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Prevent deleting if it's the only variant for the product
  if (variant.product.variants.length === 1) {
    throw new ApiError(400, "Cannot delete the only variant for this product");
  }

  // If variant has order items, mark as inactive instead of deleting
  if (variant.orderItems.length > 0) {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "Product variant has associated orders and has been marked as inactive"
        )
      );
    return;
  }

  // Delete variant
  await prisma.productVariant.delete({
    where: { id: variantId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product variant deleted successfully"));
});

// Get all flavors
export const getFlavors = asyncHandler(async (req, res, next) => {
  const flavors = await prisma.flavor.findMany();

  res
    .status(200)
    .json(new ApiResponsive(200, { flavors }, "Flavors fetched successfully"));
});

// Create a new flavor
export const createFlavor = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Flavor name is required");
  }

  // Check if flavor already exists
  const existingFlavor = await prisma.flavor.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existingFlavor) {
    throw new ApiError(409, "Flavor already exists");
  }

  let imageUrl = null;

  // Process image if provided
  if (req.file) {
    imageUrl = await processAndUploadImage(req.file);
  }

  // Create flavor
  const flavor = await prisma.flavor.create({
    data: {
      name,
      description,
      image: imageUrl,
    },
  });

  res
    .status(201)
    .json(new ApiResponsive(201, { flavor }, "Flavor created successfully"));
});

// Update flavor
export const updateFlavor = asyncHandler(async (req, res, next) => {
  const { flavorId } = req.params;
  const { name, description } = req.body;

  // Check if flavor exists
  const flavor = await prisma.flavor.findUnique({
    where: { id: flavorId },
  });

  if (!flavor) {
    throw new ApiError(404, "Flavor not found");
  }

  // Check if name already exists (if changing)
  if (name && name !== flavor.name) {
    const existingFlavor = await prisma.flavor.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: flavorId },
      },
    });

    if (existingFlavor) {
      throw new ApiError(409, "Flavor name already exists");
    }
  }

  let imageUrl = flavor.image;

  // Process new image if provided
  if (req.file) {
    // Delete old image if exists
    if (flavor.image) {
      await deleteFromS3(flavor.image);
    }

    // Upload new image
    imageUrl = await processAndUploadImage(req.file);
  }

  // Update flavor
  const updatedFlavor = await prisma.flavor.update({
    where: { id: flavorId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(req.file && { image: imageUrl }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flavor: updatedFlavor },
        "Flavor updated successfully"
      )
    );
});

// Delete flavor
export const deleteFlavor = asyncHandler(async (req, res, next) => {
  const { flavorId } = req.params;

  // Check if flavor exists
  const flavor = await prisma.flavor.findUnique({
    where: { id: flavorId },
    include: {
      productVariants: true,
    },
  });

  if (!flavor) {
    throw new ApiError(404, "Flavor not found");
  }

  // Check if flavor is in use
  if (flavor.productVariants.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete flavor that is in use by product variants"
    );
  }

  // Delete flavor image if exists
  if (flavor.image) {
    await deleteFromS3(flavor.image);
  }

  // Delete flavor
  await prisma.flavor.delete({
    where: { id: flavorId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Flavor deleted successfully"));
});

// Get all weights
export const getWeights = asyncHandler(async (req, res, next) => {
  const weights = await prisma.weight.findMany({
    orderBy: { value: "asc" },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, { weights }, "Weights fetched successfully"));
});

// Create a new weight
export const createWeight = asyncHandler(async (req, res, next) => {
  const { value, unit } = req.body;

  if (!value || !unit) {
    throw new ApiError(400, "Weight value and unit are required");
  }

  // Check if weight already exists
  const existingWeight = await prisma.weight.findFirst({
    where: {
      value: parseFloat(value),
      unit,
    },
  });

  if (existingWeight) {
    throw new ApiError(409, "Weight already exists");
  }

  // Create weight
  const weight = await prisma.weight.create({
    data: {
      value: parseFloat(value),
      unit,
    },
  });

  res
    .status(201)
    .json(new ApiResponsive(201, { weight }, "Weight created successfully"));
});

// Update weight
export const updateWeight = asyncHandler(async (req, res, next) => {
  const { weightId } = req.params;
  const { value, unit } = req.body;

  // Check if weight exists
  const weight = await prisma.weight.findUnique({
    where: { id: weightId },
  });

  if (!weight) {
    throw new ApiError(404, "Weight not found");
  }

  // Check if updated weight already exists
  if (
    (value !== undefined || unit !== undefined) &&
    (parseFloat(value) !== weight.value || unit !== weight.unit)
  ) {
    const existingWeight = await prisma.weight.findFirst({
      where: {
        value: value !== undefined ? parseFloat(value) : weight.value,
        unit: unit || weight.unit,
        id: { not: weightId },
      },
    });

    if (existingWeight) {
      throw new ApiError(409, "Weight already exists");
    }
  }

  // Update weight
  const updatedWeight = await prisma.weight.update({
    where: { id: weightId },
    data: {
      ...(value !== undefined && { value: parseFloat(value) }),
      ...(unit && { unit }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { weight: updatedWeight },
        "Weight updated successfully"
      )
    );
});

// Delete weight
export const deleteWeight = asyncHandler(async (req, res, next) => {
  const { weightId } = req.params;

  // Check if weight exists
  const weight = await prisma.weight.findUnique({
    where: { id: weightId },
    include: {
      productVariants: true,
    },
  });

  if (!weight) {
    throw new ApiError(404, "Weight not found");
  }

  // Check if weight is in use
  if (weight.productVariants.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete weight that is in use by product variants"
    );
  }

  // Delete weight
  await prisma.weight.delete({
    where: { id: weightId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Weight deleted successfully"));
});
