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
  categoryId: string;
  featured?: boolean;
  isActive?: boolean;
  [key: string]: any; // For any additional fields
}

interface ProductVariantData {
  sku: string;
  flavorId?: string;
  weightId?: string;
  price: number;
  salePrice?: number;
  stock: number;
  [key: string]: any; // For any additional fields
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
    return api.post("/api/admin/products", data);
  },
  updateProduct: (productId: string, data: ProductData) => {
    return api.patch(`/api/admin/products/${productId}`, data);
  },
  deleteProduct: (productId: string) => {
    return api.delete(`/api/admin/products/${productId}`);
  },
  // Product Variants
  createVariant: (productId: string, data: ProductVariantData) => {
    return api.post(`/api/admin/products/${productId}/variants`, data);
  },
  updateVariant: (variantId: string, data: ProductVariantData) => {
    return api.patch(`/api/admin/variants/${variantId}`, data);
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

// Inventory Management
export const inventory = {
  getInventoryLogs: (
    params: {
      page?: number;
      limit?: number;
      variantId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    } = {}
  ) => {
    return api.get("/api/admin/inventory/logs", { params });
  },
  getInventoryOverview: () => {
    return api.get("/api/admin/inventory/overview");
  },
  getLowStockProducts: (
    params: {
      threshold?: number;
      categoryId?: string;
      limit?: number;
    } = {}
  ) => {
    return api.get("/api/admin/inventory/low-stock", { params });
  },
  addInventory: (data: {
    variantId: string;
    quantity: number;
    notes?: string;
  }) => {
    return api.post("/api/admin/inventory/add", data);
  },
  removeInventory: (data: {
    variantId: string;
    quantity: number;
    reason?: string;
    notes?: string;
  }) => {
    return api.post("/api/admin/inventory/remove", data);
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
