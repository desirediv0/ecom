import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { products } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft,
  Edit,
  Trash2,
  Package,
  Loader2,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await products.getProductById(id);

        if (response.data.success) {
          setProduct(response.data.data.product);
        } else {
          setError(response.data.message || "Failed to fetch product details");
        }
      } catch (error: any) {
        console.error("Error fetching product:", error);
        setError("Failed to load product details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      setDeletingProduct(true);
      const response = await products.deleteProduct(id as string);

      if (response.data.success) {
        toast.success("Product deleted successfully");
        navigate("/products");
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(
        error.message || "An error occurred while deleting the product"
      );
    } finally {
      setDeletingProduct(false);
    }
  };

  // Handle edit navigation
  const handleEditProduct = () => {
    navigate(`/products/edit/${id}`);
  };

  // Add a helper function to determine if it's a simple product (before the component)
  const isSimpleProduct = (variants: any[]) => {
    return (
      variants.length === 1 && !variants[0].flavorId && !variants[0].weightId
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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
            setLoading(true);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // No product found
  if (!product) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center py-10">
        <AlertTriangle className="h-16 w-16 text-amber-500" />
        <h2 className="mt-4 text-xl font-semibold">Product Not Found</h2>
        <p className="text-center text-muted-foreground">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/products">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link to="/products">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.featured && (
            <Badge variant="secondary" className="ml-2">
              Featured
            </Badge>
          )}
          {!product.isActive && (
            <Badge variant="destructive" className="ml-2">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleEditProduct}
            className="flex items-center"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteProduct}
            disabled={deletingProduct}
            className="flex items-center"
          >
            {deletingProduct ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {product.categories && product.categories.length > 0 ? (
                    product.categories.map((category: any) => (
                      <Badge
                        key={category.id}
                        variant={category.isPrimary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {category.name}
                        {category.isPrimary && (
                          <span className="ml-1 text-[10px]">(Primary)</span>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-base font-medium">Uncategorized</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Status
                </h3>
                <p className="text-base font-medium">
                  {product.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Description
                </h3>
                <p className="text-base">
                  {product.description || "No description provided."}
                </p>
              </div>

              {product.nutrition &&
                Object.keys(product.nutrition).length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Nutrition Information
                    </h3>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {Object.entries(product.nutrition).map(
                        ([key, value]: [string, any]) => (
                          <div key={key} className="rounded-md border p-2">
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {key}
                            </h4>
                            <p className="text-sm font-medium">{value}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants" className="space-y-4">
          {product.variants && product.variants.length > 0 ? (
            <>
              {isSimpleProduct(product.variants) ? (
                // Simple product (single variant with no flavor/weight)
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                    <CardDescription>
                      Basic pricing and inventory details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          SKU
                        </h3>
                        <p className="text-base font-medium">
                          {product.variants[0].sku}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Price
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            ₹{product.variants[0].price}
                          </span>
                          {product.variants[0].salePrice && (
                            <span className="text-sm line-through text-muted-foreground">
                              ₹{product.variants[0].price}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Stock
                        </h3>
                        <Badge
                          variant={
                            product.variants[0].quantity > 10
                              ? "default"
                              : product.variants[0].quantity > 0
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {product.variants[0].quantity} in stock
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Status
                        </h3>
                        <Badge
                          variant={
                            product.variants[0].isActive
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {product.variants[0].isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // Variable product with multiple variants
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {product.variants.map((variant: any) => (
                    <Card key={variant.id} className="flex flex-col h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          {variant.flavor?.name || ""}
                          {variant.flavor?.name &&
                            variant.weight?.value &&
                            " - "}
                          {variant.weight?.value
                            ? `${variant.weight.value}${variant.weight.unit}`
                            : ""}
                        </CardTitle>
                        <CardDescription>SKU: {variant.sku}</CardDescription>
                      </CardHeader>

                      {/* Add variant image display if flavor has an image */}
                      {variant.flavor?.image && (
                        <div className="px-6 py-2">
                          <div className="h-20 w-20 rounded-md overflow-hidden bg-muted">
                            <img
                              src={variant.flavor.image}
                              alt={variant.flavor.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      <CardContent className="space-y-2 flex-grow">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Price:
                          </span>
                          <div className="flex items-center">
                            <IndianRupee className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{variant.price}</span>
                          </div>
                        </div>

                        {variant.salePrice && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Sale Price:
                            </span>
                            <div className="flex items-center">
                              <IndianRupee className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-500">
                                {variant.salePrice}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Stock:
                          </span>
                          <Badge
                            variant={
                              variant.quantity > 10
                                ? "default"
                                : variant.quantity > 0
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {variant.quantity} in stock
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Status:
                          </span>
                          <Badge
                            variant={
                              variant.isActive ? "secondary" : "destructive"
                            }
                          >
                            {variant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Package className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-center text-muted-foreground">
                  No variants found for this product.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="space-y-4">
          {product.images && product.images.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {product.images.map((image: any) => (
                <Card key={image.id} className="overflow-hidden">
                  <img
                    src={image.url}
                    alt={`Product: ${product.name}`}
                    className="aspect-square h-full w-full object-cover"
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-center text-muted-foreground">
                  No images found for this product.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
