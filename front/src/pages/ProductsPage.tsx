import { useState, useEffect, useCallback } from "react";
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
  Image as ImageIcon,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from "uuid";
import { Checkbox } from "@/components/ui/checkbox";

function useCategories() {
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await categories.getCategories();

        if (response.data.success) {
          setCategoriesData(response.data.data?.categories || []);
        } else {
          setError(response.data.message || "Failed to fetch categories");
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("An error occurred while fetching categories");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories: categoriesData, isLoading, error };
}

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
    setCurrentPage(1);
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
      <div className="rounded-lg border p-4 bg-card">
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
                    <tr key={product.id} className="border-b hover:bg-muted/20">
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
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {product.categories &&
                          product.categories.length > 0 ? (
                            product.categories.map((category: any) => (
                              <Badge
                                key={category.id}
                                variant={
                                  category.isPrimary ? "default" : "outline"
                                }
                                className="text-xs"
                              >
                                {category.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">
                              Uncategorized
                            </span>
                          )}
                        </div>
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
  const [flavorsList, setFlavorsList] = useState<any[]>([]);
  const [weightsList, setWeightsList] = useState<any[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [product, setProduct] = useState({
    name: "",
    description: "",
    categoryId: "",
    categoryIds: [] as string[],
    primaryCategoryId: "",
    sku: "",
    price: "",
    salePrice: "",
    quantity: 0,
    isSupplement: false,
    featured: false,
    isActive: true,
    ingredients: "",
    nutritionInfo: {
      servingSize: "",
      servingsPerContainer: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    },
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);

  // State for variants
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);

  // Add state to track selected categories
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

  // Get categories data using the useCategories hook
  const { categories, isLoading: categoriesLoading } = useCategories();

  // Define a proper interface for image previews
  interface ImagePreview {
    url: string;
    id?: string;
    isPrimary?: boolean;
  }

  // Handle image drop for upload
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Create local previews for the UI
      const newPreviews = acceptedFiles.map((file) => ({
        url: URL.createObjectURL(file),
        isPrimary: false,
      }));

      // Set first image as primary if there are no other images
      if (imagePreviews.length === 0 && newPreviews.length > 0) {
        newPreviews[0].isPrimary = true;
      }

      setImageFiles((prev) => [...prev, ...acceptedFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    },
    [imagePreviews.length]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Remove image from preview and files
  const removeImage = (index: number) => {
    // If there's an ID, it's an existing image from the server
    const imageToRemove = imagePreviews[index];

    if (imageToRemove.id) {
      // Check if this is the only image
      if (imagePreviews.length === 1) {
        toast.error(
          "Cannot delete the only image. Products must have at least one image."
        );
        return;
      }

      // This is an existing image, delete from server
      products
        .deleteImage(imageToRemove.id)
        .then(() => {
          toast.success("Image deleted successfully");
          setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        })
        .catch((error) => {
          console.error("Error deleting image:", error);
          if (error.response?.data?.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to delete image");
          }
        });
    } else {
      // This is a local preview only
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(imagePreviews[index].url);

      // Remove from both arrays
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Set an image as primary
  const setPrimaryImage = (index: number) => {
    // Update image previews with the new primary image
    setImagePreviews((prev) => {
      const updated = prev.map((preview, i) => ({
        ...preview,
        isPrimary: i === index,
      }));
      return updated;
    });
  };

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

  // Fetch product details if in edit mode
  useEffect(() => {
    if (mode === "edit" && productId) {
      const fetchProductDetails = async () => {
        try {
          setFormLoading(true);
          const response = await products.getProductById(productId);

          if (response.data.success) {
            const productData = response.data.data?.product || {};

            // Get categories from the product
            const productCategories = productData.categories || [];
            const primaryCategory =
              productData.primaryCategory ||
              (productCategories.length > 0 ? productCategories[0] : null);

            // Set product data
            setProduct({
              name: productData.name || "",
              description: productData.description || "",
              categoryId: primaryCategory?.id || "",
              categoryIds: productCategories.map((c: any) => c.id),
              primaryCategoryId: primaryCategory?.id || "",
              sku:
                productData.variants?.length === 1 &&
                !productData.variants[0].flavorId &&
                !productData.variants[0].weightId
                  ? productData.variants[0].sku
                  : "",
              price:
                productData.variants?.length === 1 &&
                !productData.variants[0].flavorId &&
                !productData.variants[0].weightId
                  ? productData.variants[0].price.toString()
                  : "",
              salePrice:
                productData.variants?.length === 1 &&
                !productData.variants[0].flavorId &&
                !productData.variants[0].weightId &&
                productData.variants[0].salePrice
                  ? productData.variants[0].salePrice.toString()
                  : "",
              quantity:
                productData.variants?.length === 1 &&
                !productData.variants[0].flavorId &&
                !productData.variants[0].weightId
                  ? productData.variants[0].quantity
                  : 0,
              isSupplement: productData.isSupplement || false,
              featured: productData.featured || false,
              isActive:
                productData.isActive !== undefined
                  ? productData.isActive
                  : true,
              ingredients: productData.ingredients || "",
              nutritionInfo: productData.nutritionInfo || {
                servingSize: "",
                servingsPerContainer: "",
                calories: "",
                protein: "",
                carbs: "",
                fat: "",
              },
            });

            // Set selected categories
            setSelectedCategories(productCategories);

            // Setup image previews
            if (productData.images && productData.images.length > 0) {
              setImagePreviews(
                productData.images.map((img: any) => ({
                  url: img.url,
                  id: img.id,
                  isPrimary: img.isPrimary || false,
                }))
              );
            }

            if (productData.variants && productData.variants.length > 0) {
              const hasRealVariants =
                productData.variants.length > 1 ||
                (productData.variants.length === 1 &&
                  (productData.variants[0].flavorId ||
                    productData.variants[0].weightId));

              setHasVariants(hasRealVariants);

              if (hasRealVariants) {
                // Map the backend variants to the format expected by the form
                const formattedVariants = productData.variants.map(
                  (variant: any) => ({
                    id: variant.id,
                    flavorId: variant.flavorId,
                    weightId: variant.weightId,
                    flavor: variant.flavor,
                    weight: variant.weight,
                    sku: variant.sku || "",
                    price: variant.price ? variant.price.toString() : "0.00",
                    salePrice: variant.salePrice
                      ? variant.salePrice.toString()
                      : "",
                    quantity: variant.quantity || 0,
                    isActive:
                      variant.isActive !== undefined ? variant.isActive : true,
                  })
                );

                setVariants(formattedVariants);

                // Set selected flavors and weights based on existing variants
                const flavorIds = new Set<string>();
                const weightIds = new Set<string>();

                productData.variants.forEach((variant: any) => {
                  if (variant.flavorId) flavorIds.add(variant.flavorId);
                  if (variant.weightId) weightIds.add(variant.weightId);
                });

                setSelectedFlavors(Array.from(flavorIds));
                setSelectedWeights(Array.from(weightIds));
              }
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
      setProduct((prev) => ({ ...prev, [name]: checked }));
    } else {
      setProduct((prev) => ({ ...prev, [name]: value }));
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
    setSelectedFlavors([flavorId]);
  };

  // Handle weight selection
  const handleWeightToggle = (weightId: string) => {
    setSelectedWeights([weightId]);
  };

  // Generate variants based on selected flavors and weights
  const generateVariants = () => {
    if (selectedFlavors.length === 0 && selectedWeights.length === 0) {
      toast.error(
        "Please select at least one flavor or weight to generate variants"
      );
      return;
    }

    // Get flavor and weight objects for selected IDs
    const selectedFlavorObjects = flavorsList.filter((flavor) =>
      selectedFlavors.includes(flavor.id)
    );
    const selectedWeightObjects = weightsList.filter((weight) =>
      selectedWeights.includes(weight.id)
    );

    // Generate combinations of flavors and weights
    const newVariants: any[] = [];

    // If both flavors and weights are selected, create combinations
    if (selectedFlavorObjects.length > 0 && selectedWeightObjects.length > 0) {
      selectedFlavorObjects.forEach((flavor) => {
        selectedWeightObjects.forEach((weight) => {
          const skuBase = product.sku || "";
          const variantSku = `${skuBase}-${flavor.name
            .substring(0, 3)
            .toUpperCase()}-${weight.value}${weight.unit}`;

          const variantName = `${flavor.name} - ${weight.value}${weight.unit}`;

          newVariants.push({
            id: uuidv4(),
            name: variantName,
            flavorId: flavor.id,
            weightId: weight.id,
            flavor,
            weight,
            sku: variantSku,
            price: product.price || "",
            salePrice: product.salePrice || "",
            quantity: product.quantity || 0,
            isActive: true,
          });
        });
      });
    } else if (selectedFlavorObjects.length > 0) {
      // Only flavors selected
      selectedFlavorObjects.forEach((flavor) => {
        const skuBase = product.sku || "";
        const variantSku = `${skuBase}-${flavor.name
          .substring(0, 3)
          .toUpperCase()}`;

        newVariants.push({
          id: uuidv4(),
          name: flavor.name,
          flavorId: flavor.id,
          weightId: null,
          flavor,
          weight: null,
          sku: variantSku,
          price: product.price || "",
          salePrice: product.salePrice || "",
          quantity: product.quantity || 0,
          isActive: true,
        });
      });
    } else if (selectedWeightObjects.length > 0) {
      // Only weights selected
      selectedWeightObjects.forEach((weight) => {
        const skuBase = product.sku || "";
        const variantSku = `${skuBase}-${weight.value}${weight.unit}`;

        newVariants.push({
          id: uuidv4(),
          name: `${weight.value}${weight.unit}`,
          flavorId: null,
          weightId: weight.id,
          flavor: null,
          weight,
          sku: variantSku,
          price: product.price || "",
          salePrice: product.salePrice || "",
          quantity: product.quantity || 0,
          isActive: true,
        });
      });
    }

    setVariants((prev) => [...prev, ...newVariants]);
  };

  // Update variant field
  const updateVariant = (variantId: string, field: string, value: any) => {
    // Ensure numeric values are properly handled
    if (field === "price" || field === "salePrice" || field === "quantity") {
      // If empty string, use empty string (allows clearing sale price)
      value = value === "" ? "" : value;
    }

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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate product name
    if (!product.name || product.name.trim() === "") {
      toast.error("Please provide a valid product name");
      setIsLoading(false);
      return;
    }

    // Validate category selection
    if (!product.categoryIds || product.categoryIds.length === 0) {
      toast.error("Please select at least one category");
      setIsLoading(false);
      return;
    }

    // Validate variants for variant products
    if (hasVariants && (!variants || variants.length === 0)) {
      toast.error("Please add at least one variant for this product");
      setIsLoading(false);
      return;
    }

    try {
      // Create FormData object for API submission
      const formData = new FormData();

      // Add basic product information
      formData.append("name", product.name);
      formData.append("description", product.description || "");
      formData.append("featured", String(product.featured));
      formData.append("isActive", String(product.isActive));
      formData.append("hasVariants", String(hasVariants));
      formData.append("isSupplement", String(product.isSupplement));

      // Add categories information
      if (product.categoryIds && product.categoryIds.length > 0) {
        formData.append("categoryIds", JSON.stringify(product.categoryIds));
        if (product.primaryCategoryId) {
          formData.append("primaryCategoryId", product.primaryCategoryId);
        }
      }

      // Add ingredients and nutrition info for supplements
      if (product.isSupplement) {
        formData.append("ingredients", product.ingredients || "");
        formData.append(
          "nutritionInfo",
          JSON.stringify(product.nutritionInfo || {})
        );
      } else {
        // Add simple product data
        formData.append("price", String(product.price || 0));
        // Explicitly check for salePrice and handle it correctly
        if (product.salePrice) {
          formData.append("salePrice", String(product.salePrice));
        }
        formData.append("quantity", String(product.quantity || 0));
      }

      // Add variants if product has variants
      if (hasVariants && variants.length > 0) {
        // Ensure all required fields are in each variant
        const processedVariants = variants.map((variant) => {
          return {
            id: variant.id,
            flavorId: variant.flavorId || null,
            weightId: variant.weightId || null,
            sku: variant.sku || "",
            price: String(variant.price || 0),
            salePrice: variant.salePrice ? String(variant.salePrice) : "",
            quantity: String(variant.quantity || 0),
            isActive: variant.isActive !== undefined ? variant.isActive : true,
          };
        });

        formData.append("variants", JSON.stringify(processedVariants));
      }

      // Add images
      if (imageFiles.length > 0) {
        // Add primary image index
        const primaryIndex = imagePreviews.findIndex(
          (img) => img.isPrimary === true
        );
        if (primaryIndex >= 0) {
          formData.append("primaryImageIndex", String(primaryIndex));
        } else {
          // Default to first image as primary if none is marked
          formData.append("primaryImageIndex", "0");
        }

        // Append each image file
        imageFiles.forEach((file) => {
          formData.append(`images`, file);
        });
      }

      let response;
      if (mode === "create") {
        response = await products.createProduct(formData as any);
      } else {
        response = await products.updateProduct(productId!, formData as any);
      }

      if (response.data.success) {
        toast.success(
          mode === "create"
            ? "Product created successfully"
            : "Product updated successfully"
        );
        navigate("/products");
      } else {
        toast.error(response.data.message || "Failed to save product");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to save product";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle hasVariants toggle
  const handleVariantsToggle = (value: boolean) => {
    setHasVariants(value);

    // If toggling to simple product and we have variants, clear them
    if (!value && variants.length > 0) {
      if (
        window.confirm(
          "Switching to simple product will remove all your variant configurations. Continue?"
        )
      ) {
        setVariants([]);
        setSelectedFlavors([]);
        setSelectedWeights([]);
      } else {
        setHasVariants(true);
      }
    }
  };

  // Handle category selection from CategorySelector
  const handleSelectCategory = (categoryId: string) => {
    // Check if the category is already selected
    const isSelected = product.categoryIds.includes(categoryId);

    let newSelectedCategoryIds: string[] = [];
    if (isSelected) {
      // If selected, remove it from the array
      newSelectedCategoryIds = product.categoryIds.filter(
        (id) => id !== categoryId
      );

      // If we're removing the primary category, set a new primary if possible
      if (
        product.primaryCategoryId === categoryId &&
        newSelectedCategoryIds.length > 0
      ) {
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: newSelectedCategoryIds[0],
        }));
      } else if (newSelectedCategoryIds.length === 0) {
        // If no categories left, clear primary category
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: "", // Use empty string instead of null
        }));
      }
    } else {
      // If not selected, add it to the array
      newSelectedCategoryIds = [...product.categoryIds, categoryId];

      // If this is the first category, set it as primary
      if (newSelectedCategoryIds.length === 1 || !product.primaryCategoryId) {
        setProduct((prev) => ({
          ...prev,
          primaryCategoryId: categoryId,
        }));
      }
    }

    setProduct((prev) => ({
      ...prev,
      categoryIds: newSelectedCategoryIds,
    }));
  };

  // Handle setting primary category
  const handleSetPrimaryCategory = (categoryId: string) => {
    // Update product with new primary category
    setProduct((prev) => ({
      ...prev,
      primaryCategoryId: categoryId,
    }));

    // Also update selectedCategories to reflect the primary category change
    setSelectedCategories((prev) =>
      prev.map((category) => ({
        ...category,
        isPrimary: category.id === categoryId,
      }))
    );
  };

  useEffect(() => {
    // Auto-generate SKU when not using variants
    if (
      !hasVariants &&
      product.name &&
      product.price &&
      categories.length > 0 &&
      product.categoryIds.length > 0
    ) {
      const categoryName =
        categories.find((c) => c.id === product.categoryIds[0])?.name || "";
      // Create SKU from first 3 chars of name + price + first 3 chars of category
      const namePart = product.name
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();
      const pricePart = Math.floor(parseFloat(product.price)).toString();
      const categoryPart = categoryName
        .replace(/\s+/g, "")
        .substring(0, 3)
        .toUpperCase();

      const generatedSku = `${namePart}${pricePart}${categoryPart}`;

      setProduct((prev) => ({
        ...prev,
        sku: generatedSku,
      }));
    }
  }, [
    hasVariants,
    product.name,
    product.price,
    product.categoryIds,
    categories,
  ]);

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
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create"
              ? "Add New Product"
              : `Edit Product: ${product.name}`}
          </h1>
        </div>
      </div>

      <Card className="overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Basic Information */}
          <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
            <h2 className="text-xl font-semibold border-b pb-2">
              Basic Information
            </h2>

            <div className="space-y-4 grid gap-4 sm:grid-cols-2">
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
                <Label htmlFor="categories">Categories *</Label>
                <CategorySelector
                  selectedCategoryIds={product.categoryIds}
                  onSelectCategory={handleSelectCategory}
                  primaryCategoryId={product.primaryCategoryId}
                  onSetPrimaryCategory={handleSetPrimaryCategory}
                  categories={categories}
                  isLoading={categoriesLoading}
                />
              </div>

              {/* Primary Category Selection - only show if multiple categories selected */}
              {product.categoryIds.length > 1 && (
                <div className="space-y-2">
                  <Label>Primary Category *</Label>
                  <div className="space-y-2 rounded-md border p-3">
                    {selectedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          id={`primary-${category.id}`}
                          name="primaryCategory"
                          value={category.id}
                          checked={product.primaryCategoryId === category.id}
                          onChange={() => handleSetPrimaryCategory(category.id)}
                          className="h-4 w-4 rounded-full border-gray-300"
                        />
                        <label
                          htmlFor={`primary-${category.id}`}
                          className="text-sm"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The primary category determines where the product appears in
                    main listings
                  </p>
                </div>
              )}

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

              <div className="flex items-center gap-2 p-1">
                <Label className="text-base">Has Variants</Label>
                <Checkbox
                  checked={hasVariants}
                  onCheckedChange={handleVariantsToggle}
                />
              </div>

              {!hasVariants && (
                <>
                  {/* Simple product fields */}
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Stock Quantity *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      min="0"
                      value={product.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </>
              )}

              {/* SKU Field - Auto-generated in both cases */}
              <div className="grid gap-2">
                <Label htmlFor="sku">
                  {!hasVariants
                    ? "SKU (Auto-generated)"
                    : "Base SKU (Auto-generated)"}
                </Label>
                <Input
                  id="sku"
                  name="sku"
                  value={product.sku}
                  onChange={handleChange}
                  placeholder="Auto-generated from name, price and category"
                  readOnly
                  className="bg-muted"
                />
              </div>

              {!hasVariants && (
                <div className="grid gap-2">
                  <Label htmlFor="price">Price *</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      value={product.price}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-8"
                      required
                    />
                  </div>
                </div>
              )}
              {!hasVariants && (
                <div className="grid gap-2">
                  <Label htmlFor="salePrice">Sale Price (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="salePrice"
                      name="salePrice"
                      type="number"
                      min="0"
                      value={product.salePrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-8"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Images - Dropzone */}
          <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
            <h2 className="text-xl font-semibold border-b pb-2">
              Product Images
            </h2>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Upload Images</p>
                <p className="text-xs text-muted-foreground">
                  Drag and drop images here, or click to select files. The first
                  image will be the primary image.
                </p>
              </div>
              <div
                {...getRootProps()}
                className="border-2 border-dashed rounded-md p-8 cursor-pointer hover:bg-muted/50 transition-colors text-center bg-white"
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

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <Label className="mb-3 block">Product Images</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div
                        className={`relative h-32 rounded-md overflow-hidden border-2 ${preview.isPrimary ? "border-primary" : "border-transparent"}`}
                      >
                        <img
                          src={preview.url}
                          alt={`Product preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {preview.isPrimary && (
                          <span className="absolute top-2 left-2 bg-primary text-white text-xs py-1 px-2 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                        {!preview.isPrimary && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 bg-white hover:bg-primary hover:text-white"
                            onClick={() => setPrimaryImage(index)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-white hover:bg-destructive hover:text-white"
                          onClick={() => removeImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Variants Configuration */}
          {hasVariants && (
            <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
              <h2 className="text-xl font-semibold border-b pb-2">
                Variants Configuration
              </h2>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Available Flavors</Label>
                    <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto bg-white">
                      {flavorsList.map((flavor) => (
                        <div
                          key={flavor.id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`flavor-${flavor.id}`}
                            checked={selectedFlavors.includes(flavor.id)}
                            onChange={() => handleFlavorToggle(flavor.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label
                            htmlFor={`flavor-${flavor.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {flavor.name}
                          </Label>
                        </div>
                      ))}
                      {flavorsList.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No flavors available
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Available Weights</Label>
                    <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto bg-white">
                      {weightsList.map((weight) => (
                        <div
                          key={weight.id}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            id={`weight-${weight.id}`}
                            checked={selectedWeights.includes(weight.id)}
                            onChange={() => handleWeightToggle(weight.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label
                            htmlFor={`weight-${weight.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {weight.value}
                            {weight.unit}
                          </Label>
                        </div>
                      ))}
                      {weightsList.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No weights available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={generateVariants}
                  disabled={
                    (selectedFlavors.length === 0 &&
                      selectedWeights.length === 0) ||
                    isLoading
                  }
                  className="w-full"
                >
                  Generate Variants
                </Button>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Variants</Label>
                    <Badge variant="outline" className="ml-2">
                      {variants.length} variants
                    </Badge>
                  </div>

                  {variants.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full divide-y divide-gray-200 border">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Variant
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sale Price
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {variants.map((variant) => (
                            <tr key={variant.id}>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Input
                                  value={variant.sku || "Auto-generated"}
                                  readOnly
                                  className="h-8 bg-muted"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {variant.flavor ? variant.flavor.name : ""}{" "}
                                {variant.weight
                                  ? `${variant.weight.value}${variant.weight.unit}`
                                  : ""}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Input
                                  value={variant.price || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "price",
                                      e.target.value
                                    )
                                  }
                                  type="number"
                                  min="0"
                                  className="h-8"
                                  required
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Input
                                  value={variant.salePrice || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "salePrice",
                                      e.target.value
                                    )
                                  }
                                  type="number"
                                  min="0"
                                  className="h-8"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Input
                                  value={variant.quantity || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  type="number"
                                  min="0"
                                  className="h-8"
                                  required
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(variant.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center p-4 border rounded-md bg-white">
                      <p className="text-sm text-gray-500">
                        No variants yet. Select flavors and/or weights and click
                        "Generate Variants" to create them.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Supplement Information - Only show if isSupplement is checked */}
          {product.isSupplement && (
            <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
              <h2 className="text-xl font-semibold border-b pb-2">
                Supplement Information
              </h2>

              <div className="space-y-2">
                <Label htmlFor="ingredients">Ingredients</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  value={product.ingredients}
                  onChange={handleChange}
                  placeholder="Enter ingredient list"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Nutrition Facts</Label>
                <div className="grid grid-cols-1 gap-4 rounded-md border p-4 md:grid-cols-2 bg-white">
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
                      Servings per Container
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
                    <Label htmlFor="carbs">Carbs (g)</Label>
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
                "Add Product"
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

// CategorySelector component
const CategorySelector = ({
  selectedCategoryIds,
  onSelectCategory,
  primaryCategoryId,
  onSetPrimaryCategory,
  categories,
  isLoading,
}: {
  selectedCategoryIds: string[];
  onSelectCategory: (categoryId: string) => void;
  primaryCategoryId: string | null;
  onSetPrimaryCategory: (categoryId: string) => void;
  categories: any[];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading categories...</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-sm text-gray-500">No categories available</div>;
  }

  // Make sure we have valid array of category IDs
  const validCategoryIds = Array.isArray(selectedCategoryIds)
    ? selectedCategoryIds
    : [];

  // Ensure we have a primary category if we have selected categories
  const ensuredPrimaryId =
    primaryCategoryId ||
    (validCategoryIds.length > 0 ? validCategoryIds[0] : null);

  return (
    <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto bg-white">
      <div className="font-medium text-sm mb-1">
        Select categories (multiple allowed):
      </div>
      {categories.map((category) => {
        const categoryId = category._id || category.id;
        const isSelected = validCategoryIds.includes(categoryId);
        const isPrimary = ensuredPrimaryId === categoryId;

        return (
          <div
            key={categoryId}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`cat-${categoryId}`}
                checked={isSelected}
                onChange={() => onSelectCategory(categoryId)}
                className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor={`cat-${categoryId}`} className="text-sm">
                {category.name}
              </label>
            </div>

            {isSelected && validCategoryIds.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  console.log("Setting primary category to:", categoryId);
                  onSetPrimaryCategory(categoryId);
                }}
                className={`text-xs px-2 py-1 rounded-full ${
                  isPrimary
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isPrimary ? "Primary" : "Set as Primary"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
