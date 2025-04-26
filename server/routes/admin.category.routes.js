import express from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3client from "../utils/s3client.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
const prisma = new PrismaClient();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Get all categories
router.get("/categories", isAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
      },
      orderBy: { name: "asc" },
    });

    // Add complete image URLs to categories
    const categoriesWithImageUrls = categories.map((category) => ({
      ...category,
      image: category.image ? getFileUrl(category.image) : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: { categories: categoriesWithImageUrls },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
});

// Get a category by ID
router.get("/categories/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Add complete image URL to category
    const categoryWithImageUrl = {
      ...category,
      image: category.image ? getFileUrl(category.image) : null,
    };

    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: { category: categoryWithImageUrl },
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
});

// Create a new category
router.post(
  "/categories",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description, parentId } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      // Generate a slug from the name
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      // Check if category with the same name or slug exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: "insensitive" } },
            { slug: { equals: slug, mode: "insensitive" } },
          ],
        },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "A category with this name already exists",
        });
      }

      // Check if parent category exists if parentId is provided
      if (parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: parentId },
        });

        if (!parentCategory) {
          return res.status(400).json({
            success: false,
            message: "Parent category not found",
          });
        }
      }

      let imageKey = null;

      // Upload image to S3 if provided
      if (req.file) {
        imageKey = `${
          process.env.UPLOAD_FOLDER
        }/categories/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;

        await s3client.send(
          new PutObjectCommand({
            Bucket: process.env.SPACES_BUCKET,
            Key: imageKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );
      }

      // Create category
      const newCategory = await prisma.category.create({
        data: {
          name,
          description,
          slug,
          parentId: parentId || null,
          image: imageKey,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: {
          category: {
            ...newCategory,
            image: imageKey ? getFileUrl(imageKey) : null,
          },
        },
      });
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  }
);

// Update a category
router.patch(
  "/categories/:id",
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, parentId } = req.body;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updateData = {};

      // Update name and slug if provided
      if (name) {
        // Generate a new slug
        const slug = name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        // Check if another category with the same name or slug exists
        const duplicateCategory = await prisma.category.findFirst({
          where: {
            OR: [
              { name: { equals: name, mode: "insensitive" } },
              { slug: { equals: slug, mode: "insensitive" } },
            ],
            id: { not: id },
          },
        });

        if (duplicateCategory) {
          return res.status(400).json({
            success: false,
            message: "A category with this name already exists",
          });
        }

        updateData.name = name;
        updateData.slug = slug;
      }

      // Update description if provided
      if (description !== undefined) {
        updateData.description = description;
      }

      // Update parentId if provided
      if (parentId !== undefined) {
        // If parentId is null, clear the parent
        if (parentId === null || parentId === "null" || parentId === "") {
          updateData.parentId = null;
        } else {
          // Check if parent category exists
          const parentCategory = await prisma.category.findUnique({
            where: { id: parentId },
          });

          if (!parentCategory) {
            return res.status(400).json({
              success: false,
              message: "Parent category not found",
            });
          }

          // Make sure we're not creating a cycle
          if (parentId === id) {
            return res.status(400).json({
              success: false,
              message: "A category cannot be its own parent",
            });
          }

          updateData.parentId = parentId;
        }
      }

      // Handle image update
      let imageKey = existingCategory.image;

      if (req.file) {
        // Delete old image if it exists
        if (existingCategory.image) {
          await deleteFromS3(existingCategory.image);
        }

        // Upload new image
        imageKey = `${
          process.env.UPLOAD_FOLDER
        }/categories/${uuidv4()}-${req.file.originalname.replace(/\s+/g, "-")}`;

        await s3client.send(
          new PutObjectCommand({
            Bucket: process.env.SPACES_BUCKET,
            Key: imageKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: "public-read",
          })
        );

        updateData.image = imageKey;
      }

      // Update category
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
        include: {
          parent: true,
          children: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: {
          category: {
            ...updatedCategory,
            image: updatedCategory.image
              ? getFileUrl(updatedCategory.image)
              : null,
          },
        },
      });
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message,
      });
    }
  }
);

// Delete a category
router.delete("/categories/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has children
    if (category.children.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with subcategories. Please delete subcategories first.",
      });
    }

    // Check if products are associated with this category
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productsCount} products associated with it.`,
      });
    }

    // Delete image from S3 if it exists
    if (category.image) {
      await deleteFromS3(category.image);
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
});

export default router;
