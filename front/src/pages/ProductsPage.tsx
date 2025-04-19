import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { products, categories, flavors, weights } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SafeRender } from "@/components/SafeRender";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";

export default function ProductsPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewProduct = location.pathname.includes("/new");
  const isEditProduct = !!id;

  // Show appropriate content based on route
  if (isNewProduct) {
    return <ProductForm mode="create" />;
  }

  if (isEditProduct) {
    return <ProductForm mode="edit" productId={id} />;
  }

  return <ProductsList />;
}

// Product List Component
function ProductsList() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const params = {
          page: currentPage,
          limit: 10,
          ...(searchQuery && { search: searchQuery }),
          ...(selectedCategory && { category: selectedCategory }),
        };

        const response = await products.getProducts(params);
        console.log("Products response:", response); // Debug logging

        if (response.data.success) {
          setProductsList(response.data.data?.products || []);
          setTotalPages(response.data.data?.pagination?.pages || 1);
        } else {
          setError(response.data.message || "Failed to fetch products");
        }
      } catch (error: any) {
        console.error("Error fetching products:", error);
        setError("Failed to load products. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategory]);

  // Fetch categories for filter
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categories.getCategories();
        console.log("Categories response:", response); // Debug logging

        if (response.data.success) {
          setCategoriesList(response.data.data?.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await products.deleteProduct(productId);

      if (response.data.success) {
        toast.success("Product deleted successfully");
        // Refresh the product list
        setProductsList((prevProducts) =>
          prevProducts.filter((product) => product.id !== productId)
        );
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(
        error.message || "An error occurred while deleting the product"
      );
    }
  };

  // Loading state
  if (isLoading && productsList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && productsList.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Something went wrong</h2>
        <p className="text-center text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setError(null);
            setCurrentPage(1);
            setIsLoading(true);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button asChild>
          <Link to="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-2">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categoriesList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products List */}
      <Card className="overflow-hidden rounded-lg border">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div className="overflow-x-auto">
          <SafeRender>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {productsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  productsList.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.category?.name || "Uncategorized"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.hasSale ? (
                          <div>
                            <span className="font-medium">
                              ₹{product.basePrice}
                            </span>
                            <span className="ml-1 text-xs line-through text-muted-foreground">
                              ₹{product.regularPrice}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium">
                            ₹{product.basePrice}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/products/${product.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SafeRender>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Complete Product Form Component
function ProductForm({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [flavorsList, setFlavorsList] = useState<any[]>([]);
  const [weightsList, setWeightsList] = useState<any[]>([]);
  const [product, setProduct] = useState<any>({
    name: "",
    description: "",
    categoryId: "",
    isSupplement: true,
    ingredients: "",
    nutritionInfo: {},
    featured: false,
    isActive: true,
  });

  // State for multiple images
  const [images, setImages] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);

  // State for variants
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);

  // For single image backward compatibility
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Handle image selection with dropzone
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      setImages((prev) => [...prev, ...acceptedFiles]);
      setImagesPreviews((prev) => [
        ...prev,
        ...newFiles.map((file) => file.preview as string),
      ]);

      // Also set the first image as primary for backward compatibility
      if (!imageFile && acceptedFiles.length > 0) {
        setImageFile(acceptedFiles[0]);
      }
    },
    maxSize: 5242880, // 5MB
  });

  // Remove image from preview
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagesPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Fetch categories for selection
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categories.getCategories();
        if (response.data.success) {
          setCategoriesList(response.data.data?.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      }
    };

    fetchCategories();
  }, []);

  // Fetch flavors for selection
  useEffect(() => {
    const fetchFlavors = async () => {
      try {
        const response = await flavors.getFlavors();
        if (response.data.success) {
          setFlavorsList(response.data.data?.flavors || []);
        }
      } catch (error) {
        console.error("Error fetching flavors:", error);
        toast.error("Failed to load flavors");
      }
    };

    fetchFlavors();
  }, []);

  // Fetch weights for selection
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const response = await weights.getWeights();
        if (response.data.success) {
          setWeightsList(response.data.data?.weights || []);
        }
      } catch (error) {
        console.error("Error fetching weights:", error);
        toast.error("Failed to load weights");
      }
    };

    fetchWeights();
  }, []);

  // Fetch product data if editing
  useEffect(() => {
    if (mode === "edit" && productId) {
      const fetchProductDetails = async () => {
        try {
          setFormLoading(true);
          const response = await products.getProductById(productId);

          if (response.data.success) {
            const productData = response.data.data?.product || {};
            setProduct({
              name: productData.name || "",
              description: productData.description || "",
              categoryId: productData.categoryId || "",
              isSupplement:
                productData.isSupplement !== undefined
                  ? productData.isSupplement
                  : true,
              ingredients: productData.ingredients || "",
              nutritionInfo: productData.nutritionInfo || {},
              featured: productData.featured || false,
              isActive:
                productData.isActive !== undefined
                  ? productData.isActive
                  : true,
            });

            // Set image preview if available
            if (productData.images && productData.images.length > 0) {
              // Set image previews from existing images
              const imagePreviews = productData.images.map(
                (img: any) => img.url
              );
              setImagesPreviews(imagePreviews);
            }
          } else {
            toast.error(
              response.data.message || "Failed to fetch product details"
            );
          }
        } catch (error) {
          console.error("Error fetching product:", error);
          toast.error("An error occurred while fetching product data");
        } finally {
          setFormLoading(false);
        }
      };

      fetchProductDetails();
    }
  }, [mode, productId]);

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setProduct((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setProduct((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  // Handle nutrition info changes
  const handleNutritionChange = (key: string, value: string) => {
    setProduct((prev: any) => ({
      ...prev,
      nutritionInfo: {
        ...prev.nutritionInfo,
        [key]: value,
      },
    }));
  };

  // Handle flavor selection
  const handleFlavorToggle = (flavorId: string) => {
    if (selectedFlavors.includes(flavorId)) {
      setSelectedFlavors((prev) => prev.filter((id) => id !== flavorId));
    } else {
      setSelectedFlavors((prev) => [...prev, flavorId]);
    }
  };

  // Handle weight selection
  const handleWeightToggle = (weightId: string) => {
    if (selectedWeights.includes(weightId)) {
      setSelectedWeights((prev) => prev.filter((id) => id !== weightId));
    } else {
      setSelectedWeights((prev) => [...prev, weightId]);
    }
  };

  // Generate variants based on selected flavors and weights
  const generateVariants = () => {
    if (selectedFlavors.length === 0 && selectedWeights.length === 0) {
      toast.error("Please select at least one flavor or weight");
      return;
    }

    // If no flavors selected but weights are, create variants with only weights
    if (selectedFlavors.length === 0) {
      const newVariants = selectedWeights.map((weightId) => {
        const weight = weightsList.find((w) => w.id === weightId);
        return {
          id: `new-${Date.now()}-${weightId}`,
          flavorId: null,
          weightId,
          flavor: null,
          weight,
          sku: `${product.name.substring(0, 3).toUpperCase()}-${weight?.value}${
            weight?.unit
          }`.replace(/\s+/g, "-"),
          price: "0.00",
          salePrice: "",
          quantity: 0,
          isActive: true,
        };
      });
      setVariants((prev) => [...prev, ...newVariants]);
      return;
    }

    // If no weights selected but flavors are, create variants with only flavors
    if (selectedWeights.length === 0) {
      const newVariants = selectedFlavors.map((flavorId) => {
        const flavor = flavorsList.find((f) => f.id === flavorId);
        return {
          id: `new-${Date.now()}-${flavorId}`,
          flavorId,
          weightId: null,
          flavor,
          weight: null,
          sku: `${product.name.substring(0, 3).toUpperCase()}-${
            flavor?.name
          }`.replace(/\s+/g, "-"),
          price: "0.00",
          salePrice: "",
          quantity: 0,
          isActive: true,
        };
      });
      setVariants((prev) => [...prev, ...newVariants]);
      return;
    }

    // Create combinations of selected flavors and weights
    // Define explicit type for variant objects
    interface Variant {
      id: string;
      flavorId: string | null;
      weightId: string | null;
      flavor: any;
      weight: any;
      sku: string;
      price: string;
      salePrice: string;
      quantity: number;
      isActive: boolean;
    }

    const newVariants: Variant[] = [];
    for (const flavorId of selectedFlavors) {
      for (const weightId of selectedWeights) {
        const flavor = flavorsList.find((f) => f.id === flavorId);
        const weight = weightsList.find((w) => w.id === weightId);

        // Check if variant already exists
        const exists = variants.some(
          (v) => v.flavorId === flavorId && v.weightId === weightId
        );

        if (!exists) {
          newVariants.push({
            id: `new-${Date.now()}-${flavorId}-${weightId}`,
            flavorId,
            weightId,
            flavor,
            weight,
            sku: `${product.name.substring(0, 3).toUpperCase()}-${
              flavor?.name
            }-${weight?.value}${weight?.unit}`.replace(/\s+/g, "-"),
            price: "0.00",
            salePrice: "",
            quantity: 0,
            isActive: true,
          });
        }
      }
    }
    setVariants((prev) => [...prev, ...newVariants]);
  };

  // Update variant field
  const updateVariant = (variantId: string, field: string, value: any) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId ? { ...variant, [field]: value } : variant
      )
    );
  };

  // Remove variant
  const removeVariant = (variantId: string) => {
    setVariants((prev) => prev.filter((variant) => variant.id !== variantId));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product.name) {
      toast.error("Product name is required");
      return;
    }

    if (!product.categoryId) {
      toast.error("Category selection is required");
      return;
    }

    if (variants.length === 0) {
      toast.error("At least one product variant is required");
      return;
    }

    // Check if all variants have a price
    const invalidVariants = variants.filter(
      (v) => !v.price || parseFloat(v.price) <= 0
    );
    if (invalidVariants.length > 0) {
      toast.error("All variants must have a valid price");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();

      // Add basic product information
      formData.append("name", product.name);
      formData.append("categoryId", product.categoryId);

      if (product.description) {
        formData.append("description", product.description);
      }

      formData.append("isSupplement", String(product.isSupplement));
      formData.append("featured", String(product.featured));
      formData.append("isActive", String(product.isActive));

      if (product.ingredients) {
        formData.append("ingredients", product.ingredients);
      }

      if (Object.keys(product.nutritionInfo).length > 0) {
        formData.append("nutritionInfo", JSON.stringify(product.nutritionInfo));
      }

      // Add variants
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((variant) => ({
            id: variant.id.startsWith("new-") ? undefined : variant.id,
            flavorId: variant.flavorId,
            weightId: variant.weightId,
            sku: variant.sku,
            price: parseFloat(variant.price),
            salePrice: variant.salePrice
              ? parseFloat(variant.salePrice)
              : undefined,
            quantity: parseInt(variant.quantity),
            isActive: variant.isActive,
          }))
        )
      );

      // Add images
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          formData.append(`images`, images[i]);
        }
        formData.append("primaryImageIndex", "0"); // First image is primary
      } else if (imageFile) {
        // For backward compatibility
        formData.append("primaryImage", imageFile);
      }

      // Workaround for TypeScript error - converting FormData to any
      const productData: any = formData;

      let response;

      if (mode === "create") {
        response = await products.createProduct(productData);
      } else {
        response = await products.updateProduct(productId!, productData);
      }

      if (response.data.success) {
        toast.success(
          mode === "create"
            ? "Product created successfully"
            : "Product updated successfully"
        );
        navigate("/products");
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsLoading(false);
    }
  };

  if (formLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            {mode === "edit" ? "Loading product..." : "Preparing form..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/products">
              <ChevronLeft className="h-4 w-4" />
              Back to Products
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create"
              ? "Create Product"
              : `Edit Product: ${product.name}`}
          </h1>
        </div>
      </div>

      <Card className="overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={product.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={product.categoryId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a category</option>
                  {categoriesList.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={product.description}
                onChange={handleChange}
                placeholder="Enter product description"
                rows={4}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isSupplement"
                  name="isSupplement"
                  checked={product.isSupplement}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isSupplement">Is a Supplement</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  checked={product.featured}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="featured">Featured Product</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={product.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive">Active Product</Label>
              </div>
            </div>
          </div>

          {/* Product Images - Dropzone */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Product Images</h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Drag and drop images or click to select files. First image will
                be the primary image.
              </p>
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-md p-8 cursor-pointer hover:bg-muted/50 transition-colors text-center"
              >
                <input {...getInputProps()} />
                <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Drop images here, or click to select files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum size: 5MB per image
                </p>
              </div>
            </div>

            {/* Image Previews */}
            {imagesPreviews.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Images</Label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {imagesPreviews.map((src, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square overflow-hidden rounded-md border">
                        <img
                          src={src}
                          alt={`Preview ${index}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Variant Management */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Product Variants</h2>

            {/* Flavor Selection */}
            <div className="space-y-2">
              <Label>Select Flavors</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {flavorsList.map((flavor) => (
                  <div
                    key={flavor.id}
                    className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${
                      selectedFlavors.includes(flavor.id)
                        ? "border-primary bg-primary/10"
                        : "border-input"
                    }`}
                    onClick={() => handleFlavorToggle(flavor.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFlavors.includes(flavor.id)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <span>{flavor.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weight Selection */}
            <div className="space-y-2">
              <Label>Select Weights</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {weightsList.map((weight) => (
                  <div
                    key={weight.id}
                    className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${
                      selectedWeights.includes(weight.id)
                        ? "border-primary bg-primary/10"
                        : "border-input"
                    }`}
                    onClick={() => handleWeightToggle(weight.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWeights.includes(weight.id)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <span>
                      {weight.value} {weight.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Variants Button */}
            <Button
              type="button"
              onClick={generateVariants}
              className="w-full md:w-auto"
            >
              Generate Variants from Selection
            </Button>

            {/* Variant List */}
            {variants.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Product Variants</Label>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Flavor
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Weight
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Price (₹)
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Sale Price
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Stock
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium">
                          Status
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant) => (
                        <tr key={variant.id} className="border-b">
                          <td className="px-4 py-2">
                            {variant.flavor?.name || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {variant.weight
                              ? `${variant.weight.value} ${variant.weight.unit}`
                              : "-"}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={variant.sku}
                              onChange={(e) =>
                                updateVariant(variant.id, "sku", e.target.value)
                              }
                              className="h-8 py-1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "price",
                                    e.target.value
                                  )
                                }
                                className="h-8 py-1 pl-8"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.salePrice}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "salePrice",
                                    e.target.value
                                  )
                                }
                                className="h-8 py-1 pl-8"
                                placeholder="Optional"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={variant.quantity}
                              onChange={(e) =>
                                updateVariant(
                                  variant.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="h-8 py-1 w-20"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(e) =>
                                updateVariant(
                                  variant.id,
                                  "isActive",
                                  e.target.checked
                                )
                              }
                              className="h-4 w-4 rounded"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(variant.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Supplement Information - Only show if isSupplement is checked */}
          {product.isSupplement && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Supplement Information</h2>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredients</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  value={product.ingredients}
                  onChange={handleChange}
                  placeholder="Enter ingredients list"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Nutrition Facts</Label>
                <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="servingSize">Serving Size</Label>
                    <Input
                      id="servingSize"
                      placeholder="e.g., 1 scoop (30g)"
                      value={product.nutritionInfo.servingSize || ""}
                      onChange={(e) =>
                        handleNutritionChange("servingSize", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servingsPerContainer">
                      Servings Per Container
                    </Label>
                    <Input
                      id="servingsPerContainer"
                      placeholder="e.g., 30"
                      value={product.nutritionInfo.servingsPerContainer || ""}
                      onChange={(e) =>
                        handleNutritionChange(
                          "servingsPerContainer",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      placeholder="e.g., 120"
                      value={product.nutritionInfo.calories || ""}
                      onChange={(e) =>
                        handleNutritionChange("calories", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="protein">Protein (g)</Label>
                    <Input
                      id="protein"
                      placeholder="e.g., 24"
                      value={product.nutritionInfo.protein || ""}
                      onChange={(e) =>
                        handleNutritionChange("protein", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbs">Carbohydrates (g)</Label>
                    <Input
                      id="carbs"
                      placeholder="e.g., 3"
                      value={product.nutritionInfo.carbs || ""}
                      onChange={(e) =>
                        handleNutritionChange("carbs", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fat">Fat (g)</Label>
                    <Input
                      id="fat"
                      placeholder="e.g., 1.5"
                      value={product.nutritionInfo.fat || ""}
                      onChange={(e) =>
                        handleNutritionChange("fat", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/products")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : mode === "create" ? (
                "Create Product"
              ) : (
                "Update Product"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
