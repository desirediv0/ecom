import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";

// Get all products with filtering, pagination and sorting
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    flavor = "",
    weight = "",
    sort = "createdAt",
    order = "desc",
    minPrice,
    maxPrice,
    featured,
  } = req.query;

  // Build filter conditions
  const whereConditions = {
    isActive: true,
    // Search in name or description
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    // Filter by category
    ...(category && {
      OR: [{ categoryId: category }, { category: { slug: category } }],
    }),
    // Filter by featured
    ...(featured === "true" && { featured: true }),
    // Filter by price range via variants
    ...((minPrice || maxPrice) && {
      variants: {
        some: {
          AND: [
            { isActive: true },
            // Min price
            ...(minPrice
              ? [
                  {
                    OR: [
                      { price: { gte: parseFloat(minPrice) } },
                      {
                        AND: [
                          { salePrice: { not: null } },
                          { salePrice: { gte: parseFloat(minPrice) } },
                        ],
                      },
                    ],
                  },
                ]
              : []),
            // Max price
            ...(maxPrice
              ? [
                  {
                    OR: [
                      {
                        AND: [
                          { salePrice: { not: null } },
                          { salePrice: { lte: parseFloat(maxPrice) } },
                        ],
                      },
                      {
                        AND: [
                          { salePrice: null },
                          { price: { lte: parseFloat(maxPrice) } },
                        ],
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      },
    }),
    // Filter by flavor
    ...(flavor && {
      variants: {
        some: {
          flavor: {
            OR: [
              { id: flavor },
              { name: { contains: flavor, mode: "insensitive" } },
            ],
          },
        },
      },
    }),
    // Filter by weight
    ...(weight && {
      variants: {
        some: {
          weight: {
            OR: [
              { id: weight },
              {
                AND: [
                  { value: parseFloat(weight.replace(/[^0-9.]/g, "")) },
                  { unit: weight.replace(/[0-9.]/g, "").trim() },
                ],
              },
            ],
          },
        },
      },
    }),
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: whereConditions,
  });

  // Get products with pagination, sorting
  const products = await prisma.product.findMany({
    where: whereConditions,
    include: {
      category: true,
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        include: {
          flavor: true,
          weight: true,
        },
        orderBy: { price: "asc" },
        take: 1, // Get at least one variant for displaying base price
      },
      _count: {
        select: {
          reviews: true,
          variants: true,
        },
      },
    },
    orderBy: {
      [sort]: order,
    },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  // Format products for response
  const formattedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    featured: product.featured,
    description: product.description,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    image: product.images[0] ? getFileUrl(product.images[0].url) : null,
    basePrice:
      product.variants.length > 0
        ? parseFloat(product.variants[0].salePrice || product.variants[0].price)
        : null,
    hasSale:
      product.variants.length > 0 && product.variants[0].salePrice !== null,
    regularPrice:
      product.variants.length > 0
        ? parseFloat(product.variants[0].price)
        : null,
    flavors: product._count.variants,
    reviewCount: product._count.reviews,
  }));

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

// Get product details by slug
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
      isActive: true,
    },
    include: {
      category: true,
      images: {
        orderBy: { isPrimary: "desc" },
      },
      variants: {
        where: { isActive: true },
        include: {
          flavor: true,
          weight: true,
        },
        orderBy: [{ flavor: { name: "asc" } }, { weight: { value: "asc" } }],
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
        take: 5,
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Format the response
  const formattedProduct = {
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    })),
    // Group variants by flavor
    flavorOptions: Array.from(
      new Set(product.variants.filter((v) => v.flavor).map((v) => v.flavor.id))
    ).map((flavorId) => {
      const flavor = product.variants.find(
        (v) => v.flavor && v.flavor.id === flavorId
      ).flavor;
      return {
        id: flavor.id,
        name: flavor.name,
        image: flavor.image ? getFileUrl(flavor.image) : null,
      };
    }),
    // Group variants by weight
    weightOptions: Array.from(
      new Set(product.variants.filter((v) => v.weight).map((v) => v.weight.id))
    )
      .map((weightId) => {
        const weight = product.variants.find(
          (v) => v.weight && v.weight.id === weightId
        ).weight;
        return {
          id: weight.id,
          value: weight.value,
          unit: weight.unit,
          display: `${weight.value}${weight.unit}`,
        };
      })
      .sort((a, b) => a.value - b.value),
    // Average rating
    avgRating:
      product.reviews.length > 0
        ? (
            product.reviews.reduce((sum, review) => sum + review.rating, 0) /
            product.reviews.length
          ).toFixed(1)
        : null,
    reviewCount: product._count.reviews,
  };

  // Add related products
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      id: { not: product.id },
    },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        take: 1,
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
    take: 4,
  });

  const formattedRelated = relatedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0] ? getFileUrl(p.images[0].url) : null,
    basePrice:
      p.variants.length > 0
        ? parseFloat(p.variants[0].salePrice || p.variants[0].price)
        : null,
    hasSale: p.variants.length > 0 && p.variants[0].salePrice !== null,
    regularPrice:
      p.variants.length > 0 ? parseFloat(p.variants[0].price) : null,
    reviewCount: p._count.reviews,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        product: formattedProduct,
        relatedProducts: formattedRelated,
      },
      "Product fetched successfully"
    )
  );
});

// Get product variant details
export const getProductVariant = asyncHandler(async (req, res) => {
  const { productId, flavorId, weightId } = req.query;

  if (!productId || (!flavorId && !weightId)) {
    throw new ApiError(
      400,
      "Product ID and at least flavor ID or weight ID are required"
    );
  }

  const variantQuery = {
    productId,
    isActive: true,
    ...(flavorId && { flavorId }),
    ...(weightId && { weightId }),
  };

  const variant = await prisma.productVariant.findFirst({
    where: variantQuery,
    include: {
      flavor: true,
      weight: true,
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Format the variant response with proper image URL
  const formattedVariant = {
    ...variant,
    flavor: variant.flavor
      ? {
          ...variant.flavor,
          image: variant.flavor.image ? getFileUrl(variant.flavor.image) : null,
        }
      : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant fetched successfully"
      )
    );
});

// Get all flavors
export const getAllFlavors = asyncHandler(async (req, res) => {
  const flavors = await prisma.flavor.findMany({
    orderBy: { name: "asc" },
  });

  // Format response with image URLs
  const formattedFlavors = flavors.map((flavor) => ({
    ...flavor,
    image: flavor.image ? getFileUrl(flavor.image) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flavors: formattedFlavors },
        "Flavors fetched successfully"
      )
    );
});

// Get all weights
export const getAllWeights = asyncHandler(async (req, res) => {
  const weights = await prisma.weight.findMany({
    orderBy: { value: "asc" },
  });

  // Format weights with display value
  const formattedWeights = weights.map((weight) => ({
    ...weight,
    display: `${weight.value}${weight.unit}`,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { weights: formattedWeights },
        "Weights fetched successfully"
      )
    );
});
