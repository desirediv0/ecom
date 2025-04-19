import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { createSlug } from "../helper/Slug.js";

// ---------------------- PUBLIC ROUTES ---------------------- //

// Get all categories with their subcategories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: {
      parentId: null, // Root categories only
    },
    include: {
      children: {
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format the response with image URLs
  const formattedCategories = categories.map((category) => ({
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
    children: category.children.map((child) => ({
      ...child,
      image: child.image ? getFileUrl(child.image) : null,
    })),
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "Categories fetched successfully"
      )
    );
});

// Get products by category
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  // Find the category by slug
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      children: true,
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Get all subcategory IDs
  const categoryIds = [
    category.id,
    ...category.children.map((child) => child.id),
  ];

  // Count total products in this category and its subcategories
  const totalProducts = await prisma.product.count({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
    },
  });

  // Get paginated products
  const products = await prisma.product.findMany({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
    },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      category: true,
      variants: {
        where: { isActive: true },
        include: {
          flavor: true,
          weight: true,
        },
        take: 1, // Get at least one variant for display
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
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  // Format the response
  const formattedProducts = products.map((product) => ({
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    })),
    basePrice:
      product.variants.length > 0
        ? Math.min(
            ...product.variants.map((v) => parseFloat(v.salePrice || v.price))
          )
        : null,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        category,
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

// ---------------------- ADMIN ROUTES ---------------------- //

// Get all categories for admin (including inactive ones)
export const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    include: {
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format the response with image URLs
  const formattedCategories = categories.map((category) => ({
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "Categories fetched successfully"
      )
    );
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Format the response with image URL
  const formattedCategory = {
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
    children: category.children.map((child) => ({
      ...child,
      image: child.image ? getFileUrl(child.image) : null,
    })),
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { category: formattedCategory },
        "Category fetched successfully"
      )
    );
});

// Create a new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentId } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  // Generate slug from name
  const slug = createSlug(name);

  // Check if category with this slug already exists
  const existingCategory = await prisma.category.findUnique({
    where: { slug },
  });

  if (existingCategory) {
    throw new ApiError(409, "Category with this name already exists");
  }

  // If parentId provided, verify parent exists
  if (parentId) {
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parentCategory) {
      throw new ApiError(404, "Parent category not found");
    }
  }

  // Process image if uploaded
  let imageUrl = null;
  if (req.file) {
    imageUrl = await processAndUploadImage(req.file);
  }

  // Create category
  const category = await prisma.category.create({
    data: {
      name,
      description,
      parentId: parentId || null,
      slug,
      image: imageUrl,
    },
  });

  res.status(201).json(
    new ApiResponsive(
      201,
      {
        category: {
          ...category,
          image: imageUrl ? getFileUrl(imageUrl) : null,
        },
      },
      "Category created successfully"
    )
  );
});

// Update category
export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description, parentId } = req.body;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Prepare update data
  const updateData = {};

  // Update slug if name is changed
  if (name && name !== category.name) {
    const newSlug = createSlug(name);

    // Check if new slug is already taken
    const existingCategory = await prisma.category.findFirst({
      where: {
        slug: newSlug,
        id: { not: categoryId },
      },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category with this name already exists");
    }

    updateData.name = name;
    updateData.slug = newSlug;
  }

  // Update description if provided
  if (description !== undefined) {
    updateData.description = description;
  }

  // Validate parent ID
  if (parentId !== undefined) {
    // Cannot set self as parent
    if (parentId === categoryId) {
      throw new ApiError(400, "Category cannot be its own parent");
    }

    // Check if parent exists
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId },
      });

      if (!parentCategory) {
        throw new ApiError(404, "Parent category not found");
      }

      // Prevent circular references
      const childCategories = await prisma.category.findMany({
        where: { parentId: categoryId },
      });

      if (childCategories.some((child) => child.id === parentId)) {
        throw new ApiError(400, "Cannot set a child category as parent");
      }
    }

    updateData.parentId = parentId || null;
  }

  // Process new image if uploaded
  if (req.file) {
    // Delete old image if exists
    if (category.image) {
      await deleteFromS3(category.image);
    }

    // Upload new image
    updateData.image = await processAndUploadImage(req.file);
  }

  // Update category
  const updatedCategory = await prisma.category.update({
    where: { id: categoryId },
    data: updateData,
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        category: {
          ...updatedCategory,
          image: updatedCategory.image
            ? getFileUrl(updatedCategory.image)
            : null,
        },
      },
      "Category updated successfully"
    )
  );
});

// Delete category
export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      children: true,
      products: true,
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Check if category has children
  if (category.children.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete category with subcategories. Delete subcategories first or reassign them."
    );
  }

  // Check if category has products
  if (category.products.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete category with products. Delete products first or reassign them."
    );
  }

  // Delete category image if exists
  if (category.image) {
    await deleteFromS3(category.image);
  }

  // Delete the category
  await prisma.category.delete({
    where: { id: categoryId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Category deleted successfully"));
});
