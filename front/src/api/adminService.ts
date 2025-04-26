import api from "./api";

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface AdminUpdateData {
  firstName?: string;
  lastName?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}

interface ProductData {
  name: string;
  description: string;
  categoryId?: string;
  categoryIds?: string[] | string;
  primaryCategoryId?: string;
  featured?: boolean;
  isActive?: boolean;
  hasVariants?: boolean;
  slug?: string;
  regularPrice?: number | string;
  basePrice?: number | string;
  price?: number | string;
  salePrice?: number | string;
  hasSale?: boolean;
  stock?: number | string;
  quantity?: number | string;
  sku?: string;
  variants?: Array<ProductVariantData>;
  [key: string]: any;
}

interface ProductVariantData {
  id?: string;
  name?: string;
  sku: string;
  flavorId?: string;
  weightId?: string;
  price: number | string;
  salePrice?: number | string | null;
  stock: number | string;
  quantity?: number | string;
  [key: string]: any;
}

interface StoreSettings {
  storeName?: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  currency?: string;
  taxRate?: number;
  enableTax?: boolean;
  logo?: File | null;
  favicon?: File | null;
  shippingFee?: number;
  freeShippingThreshold?: number;
  enableFreeShipping?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  colorTheme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

// Admin Authentication
export const adminAuth = {
  login: (credentials: LoginCredentials) => {
    return api.post("/api/admin/login", credentials);
  },
  getProfile: () => {
    return api.get("/api/admin/profile");
  },
  updateProfile: (data: AdminUpdateData) => {
    return api.patch("/api/admin/profile", data);
  },
  changePassword: (data: PasswordChangeData) => {
    return api.post("/api/admin/change-password", data);
  },
};

// Admin User Management
export const adminUsers = {
  getAllAdmins: () => {
    return api.get("/api/admin/admins");
  },
  updateAdminRole: (
    adminId: string,
    data: { role: string; isActive?: boolean }
  ) => {
    return api.patch(`/api/admin/admins/${adminId}`, data);
  },
  deleteAdmin: (adminId: string) => {
    return api.delete(`/api/admin/admins/${adminId}`);
  },
  registerAdmin: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => {
    return api.post("/api/admin/register", data);
  },
};

// Product Management
export const products = {
  getProducts: (params: ProductQueryParams = {}) => {
    return api.get("/api/admin/products", { params });
  },
  getProductById: (productId: string) => {
    return api.get(`/api/admin/products/${productId}`);
  },
  createProduct: (data: ProductData) => {
    // Check if data is already FormData
    if (data instanceof FormData) {
      for (const [key, value] of (data as FormData).entries()) {
        const displayValue =
          value instanceof File
            ? `File: ${value.name} (${value.size} bytes)`
            : value;
        console.log(`${key}: ${displayValue}`);
      }

      return api.post("/api/admin/products", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }

    const formData = new FormData();

    // Convert JSON object to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle arrays and objects by stringifying them
        if (typeof value === "object" && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    for (const [key, value] of formData.entries()) {
      const displayValue =
        value instanceof File
          ? `File: ${value.name} (${value.size} bytes)`
          : value;
      console.log(`${key}: ${displayValue}`);
    }

    return api.post("/api/admin/products", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  updateProduct: (productId: string, data: ProductData) => {
    // Check if data is already FormData
    if (data instanceof FormData) {
      for (const [key, value] of (data as FormData).entries()) {
        const displayValue =
          value instanceof File
            ? `File: ${value.name} (${value.size} bytes)`
            : value;
        console.log(`${key}: ${displayValue}`);
      }

      return api.patch(`/api/admin/products/${productId}`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }

    const formData = new FormData();

    // Convert JSON object to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle arrays and objects by stringifying them
        if (typeof value === "object" && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });

    for (const [key, value] of formData.entries()) {
      const displayValue =
        value instanceof File
          ? `File: ${value.name} (${value.size} bytes)`
          : value;
      console.log(`${key}: ${displayValue}`);
    }

    return api.patch(`/api/admin/products/${productId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  deleteProduct: (productId: string) => {
    return api.delete(`/api/admin/products/${productId}`);
  },
  // Product Images
  uploadImage: (
    productId: string,
    imageFile: File,
    isPrimary: boolean = false
  ) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("isPrimary", isPrimary.toString());

    return api.post(`/api/admin/products/${productId}/images`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  deleteImage: (imageId: string) => {
    return api.delete(`/api/admin/products/images/${imageId}`);
  },
  // Product Variants
  manageVariants: (
    productId: string,
    data: {
      variants: ProductVariantData[];
      variantsToDelete?: string[];
    }
  ) => {
    return api.post(`/api/admin/products/${productId}/bulk-variants`, data);
  },
  createVariant: (productId: string, variantData: ProductVariantData) => {
    return api.post(`/api/admin/products/${productId}/variants`, variantData);
  },
  updateVariant: (variantId: string, variantData: ProductVariantData) => {
    return api.patch(`/api/admin/variants/${variantId}`, variantData);
  },
  deleteVariant: (variantId: string) => {
    return api.delete(`/api/admin/variants/${variantId}`);
  },
  getVariantsByProductId: (productId: string) => {
    return api.get(`/api/admin/products/${productId}/variants`);
  },
};

// Flavors Management
export const flavors = {
  getFlavors: () => {
    return api.get("/api/admin/flavors");
  },
  getFlavorById: (flavorId: string) => {
    return api.get(`/api/admin/flavors/${flavorId}`);
  },
  createFlavor: (data: {
    name: string;
    description?: string;
    image?: File | null;
  }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    if (data.image) formData.append("image", data.image);

    return api.post("/api/admin/flavors", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  updateFlavor: (
    flavorId: string,
    data: {
      name?: string;
      description?: string;
      image?: File | null;
    }
  ) => {
    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    if (data.image) formData.append("image", data.image);

    return api.patch(`/api/admin/flavors/${flavorId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  deleteFlavor: (flavorId: string) => {
    return api.delete(`/api/admin/flavors/${flavorId}`);
  },
};

// Inventory Management
export const inventory = {
  addInventory: (data: {
    variantId: string;
    quantity: number;
    notes?: string;
    purchasePrice?: number;
    supplier?: string;
  }) => {
    return api.post("/api/admin/inventory/add", data);
  },
  removeInventory: (data: {
    variantId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }) => {
    return api.post("/api/admin/inventory/remove", data);
  },
  getInventoryHistory: (
    params: {
      page?: number;
      limit?: number;
      variantId?: string;
      productId?: string;
      type?: string;
    } = {}
  ) => {
    return api.get("/api/admin/inventory/history", { params });
  },
};

// Weights Management
export const weights = {
  getWeights: () => {
    return api.get("/api/admin/weights");
  },
  getWeightById: (weightId: string) => {
    return api.get(`/api/admin/weights/${weightId}`);
  },
  createWeight: (data: { value: number; unit: string }) => {
    return api.post("/api/admin/weights", data);
  },
  updateWeight: (
    weightId: string,
    data: {
      value?: number;
      unit?: string;
    }
  ) => {
    return api.patch(`/api/admin/weights/${weightId}`, data);
  },
  deleteWeight: (weightId: string) => {
    return api.delete(`/api/admin/weights/${weightId}`);
  },
};

// Category Management
export const categories = {
  getCategories: () => {
    return api.get("/api/admin/categories");
  },
  getCategoryById: (categoryId: string) => {
    return api.get(`/api/admin/categories/${categoryId}`);
  },
  createCategory: (data: FormData) => {
    return api.post("/api/admin/categories", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  updateCategory: (categoryId: string, data: FormData) => {
    return api.patch(`/api/admin/categories/${categoryId}`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  deleteCategory: (categoryId: string) => {
    return api.delete(`/api/admin/categories/${categoryId}`);
  },
};

// Order Management
export const orders = {
  getOrders: (
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      sortBy?: string;
      order?: "asc" | "desc";
    } = {}
  ) => {
    return api.get("/api/admin/orders", { params });
  },
  getOrderById: (orderId: string) => {
    return api.get(`/api/admin/orders/${orderId}`);
  },
  updateOrderStatus: (orderId: string, data: { status: string }) => {
    return api.patch(`/api/admin/orders/${orderId}/status`, data);
  },
  getOrderStats: () => {
    return api.get("/api/admin/orders-stats");
  },
};

// Coupons Management
export const coupons = {
  getCoupons: (
    params: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
    } = {}
  ) => {
    return api.get("/api/admin/coupons", { params });
  },
  getCouponById: (couponId: string) => {
    return api.get(`/api/admin/coupons/${couponId}`);
  },
  createCoupon: (data: {
    code: string;
    description?: string;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    minOrderAmount?: number;
    maxUses?: number;
    startDate: string;
    endDate?: string;
    isActive?: boolean;
  }) => {
    return api.post("/api/admin/coupons", data);
  },
  updateCoupon: (
    couponId: string,
    data: {
      code?: string;
      description?: string;
      discountType?: "PERCENTAGE" | "FIXED_AMOUNT";
      discountValue?: number;
      minOrderAmount?: number;
      maxUses?: number;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    }
  ) => {
    return api.patch(`/api/admin/coupons/${couponId}`, data);
  },
  deleteCoupon: (couponId: string) => {
    return api.delete(`/api/admin/coupons/${couponId}`);
  },
};

// Settings Management
export const settings = {
  getSettings: () => {
    return api.get("/api/admin/settings");
  },
  updateSettings: (data: StoreSettings) => {
    const formData = new FormData();

    // Process text and boolean fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === "logo" || key === "favicon") {
        // Skip file fields for separate handling
        return;
      } else if (key === "socialLinks" || key === "colorTheme") {
        // Handle nested objects
        if (value) formData.append(key, JSON.stringify(value));
      } else if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // Process file fields
    if (data.logo) formData.append("logo", data.logo);
    if (data.favicon) formData.append("favicon", data.favicon);

    return api.patch("/api/admin/settings", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  getMockSettings: () => {
    return Promise.resolve({
      data: {
        success: true,
        data: {
          settings: {
            storeName: "Your Store",
            storeEmail: "store@example.com",
            storePhone: "+1 234 567 8900",
            storeAddress: "123 Store St, City, Country",
            currency: "USD",
            taxRate: 10,
            enableTax: true,
            shippingFee: 5,
            freeShippingThreshold: 50,
            enableFreeShipping: true,
            metaTitle: "Your Store - Best Products",
            metaDescription: "Find the best products at Your Store",
            socialLinks: {
              facebook: "https://facebook.com/yourstore",
              twitter: "https://twitter.com/yourstore",
              instagram: "https://instagram.com/yourstore",
              youtube: "",
            },
            colorTheme: {
              primary: "#3b82f6",
              secondary: "#10b981",
              accent: "#8b5cf6",
            },
          },
        },
        message: "Settings fetched successfully",
      },
    });
  },
  // Mock method for simulating updating settings
  updateMockSettings: (data: StoreSettings) => {
    // Return a promise that resolves with success
    return Promise.resolve({
      data: {
        success: true,
        data: {
          settings: data,
        },
        message: "Settings updated successfully",
      },
    });
  },
};
