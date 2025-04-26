import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ArrowLeft, Loader2, Plus, Trash2, Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { products, categories, flavors, weights } from "@/api/adminService";
import Dropzone from "react-dropzone";

interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  sku: string;
  regularPrice: string;
  basePrice: string;
  hasSale: boolean;
  isActive: boolean;
  type: "simple" | "variable" | "supplement";
  images: Array<{
    url: string;
    id?: string;
    isPrimary?: boolean;
    file?: File;
  }>;
  stock: string;
  isVeg: boolean;
  flavors: string[];
  weights: string[];
  variants: Array<{
    id?: string;
    name: string;
    sku: string;
    price: string;
    stock: string;
    salePrice?: string;
  }>;
  supplementInfo: {
    ingredients: string;
    nutritionalInfo: string;
    benefits: string;
    howToUse: string;
  };
}

interface CategoryType {
  id: string;
  name: string;
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [categoriesList, setCategoriesList] = useState<CategoryType[]>([]);
  const [flavorsOptions, setFlavorsOptions] = useState<string[]>([]);
  const [weightsOptions, setWeightsOptions] = useState<string[]>([]);

  // React Hook Form setup with default values
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      sku: "",
      regularPrice: "",
      basePrice: "",
      hasSale: false,
      isActive: true,
      type: "simple",
      images: [],
      stock: "",
      isVeg: true,
      flavors: [],
      weights: [],
      variants: [],
      supplementInfo: {
        ingredients: "",
        nutritionalInfo: "",
        benefits: "",
        howToUse: "",
      },
    },
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const selectedType = watch("type");
  const selectedFlavors = watch("flavors");
  const selectedWeights = watch("weights");

  // Fetch categories, flavors and weights on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await categories.getCategories();
        if (categoriesResponse.data.success) {
          setCategoriesList(categoriesResponse.data.data.categories || []);
        }

        // Fetch flavors
        const flavorsResponse = await flavors.getFlavors();
        if (flavorsResponse.data.success) {
          const flavorsList = flavorsResponse.data.data.flavors || [];
          setFlavorsOptions(flavorsList.map((flavor: any) => flavor.name));
        }

        // Fetch weights
        const weightsResponse = await weights.getWeights();
        if (weightsResponse.data.success) {
          const weightsList = weightsResponse.data.data.weights || [];
          setWeightsOptions(weightsList.map((weight: any) => weight.display));
        }

        // Fetch product data in edit mode
        if (isEditMode && id) {
          try {
            const productResponse = await products.getProductById(id);
            if (productResponse.data.success) {
              const productData = productResponse.data.data.product;

              // Set form values from product data
              setValue("name", productData.name || "");
              setValue("description", productData.description || "");
              setValue("sku", productData.sku || "");
              setValue("regularPrice", String(productData.price || ""));
              setValue("basePrice", String(productData.salePrice || ""));
              setValue("isActive", productData.isActive || true);
              setValue("hasSale", productData.price > productData.salePrice);
              setValue("stock", String(productData.quantity || ""));
              setValue("isVeg", productData.isVeg ?? true);

              // Set category
              if (productData.categories && productData.categories[0]) {
                setValue("categoryId", productData.categories[0].id);
              }

              // Set product type
              if (productData.isSupplement) {
                setValue("type", "supplement");
              } else if (productData.hasVariants) {
                setValue("type", "variable");
              } else {
                setValue("type", "simple");
              }

              // Set supplement info if available
              if (productData.ingredients || productData.nutritionInfo) {
                setValue(
                  "supplementInfo.ingredients",
                  productData.ingredients || ""
                );
                if (productData.nutritionInfo) {
                  const nutritionInfo =
                    typeof productData.nutritionInfo === "string"
                      ? JSON.parse(productData.nutritionInfo)
                      : productData.nutritionInfo;

                  setValue(
                    "supplementInfo.nutritionalInfo",
                    nutritionInfo.details || ""
                  );
                  setValue(
                    "supplementInfo.benefits",
                    nutritionInfo.benefits || ""
                  );
                  setValue(
                    "supplementInfo.howToUse",
                    nutritionInfo.howToUse || ""
                  );
                }
              }

              // Set images
              if (productData.images && productData.images.length > 0) {
                const formattedImages = productData.images.map((img: any) => ({
                  id: img.id,
                  url: img.url,
                  isPrimary: img.isPrimary || false,
                }));
                setValue("images", formattedImages);
              }

              // Set variants
              if (productData.variants && productData.variants.length > 0) {
                // Extract flavors and weights from existing variants
                const variantFlavors = new Set<string>();
                const variantWeights = new Set<string>();

                productData.variants.forEach((variant: any) => {
                  const nameParts = variant.name.split(" - ");
                  if (nameParts.length > 1) {
                    const flavorWeightPart = nameParts[1];
                    const flavorMatch = flavorWeightPart.match(/(.*?)\s*\(/);
                    const weightMatch = flavorWeightPart.match(/\((.*?)\)/);

                    if (flavorMatch && flavorMatch[1])
                      variantFlavors.add(flavorMatch[1].trim());
                    if (weightMatch && weightMatch[1])
                      variantWeights.add(weightMatch[1].trim());
                  }
                });

                // Set extracted flavors and weights
                if (variantFlavors.size > 0)
                  setValue("flavors", Array.from(variantFlavors));
                if (variantWeights.size > 0)
                  setValue("weights", Array.from(variantWeights));

                // Format variants for the form
                const formattedVariants = productData.variants.map(
                  (variant: any) => ({
                    id: variant.id,
                    name: variant.name || "",
                    sku: variant.sku || "",
                    price: String(variant.price || "0"),
                    salePrice: variant.salePrice
                      ? String(variant.salePrice)
                      : "",
                    stock: String(variant.quantity || "0"),
                  })
                );

                // Reset variants array and append formatted variants
                setValue("variants", formattedVariants);
              }
            }
          } catch (error) {
            console.error("Error fetching product data:", error);
            toast.error("Failed to load product data");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode, setValue]);

  const generateVariants = () => {
    if (selectedFlavors.length === 0 || selectedWeights.length === 0) {
      toast.error(
        "Please select both flavors and weights to generate variants"
      );
      return;
    }

    // Clear existing variants
    while (variantFields.length) {
      removeVariant(0);
    }

    // Generate new variants from all combinations
    selectedFlavors.forEach((flavor) => {
      selectedWeights.forEach((weight) => {
        appendVariant({
          name: `${watch("name")} - ${flavor} (${weight})`,
          sku: `${watch("sku") || ""}${flavor.charAt(0)}${weight.replace(/[^\d]/g, "")}`,
          price: watch("regularPrice"),
          salePrice: watch("basePrice"),
          stock: watch("stock") || "0",
        });
      });
    });

    toast(
      `${selectedFlavors.length * selectedWeights.length} variants generated`
    );
  };

  // Function to directly manage variants using the bulk API
  const manageVariants = async (toAdd: any[] = [], toRemove: string[] = []) => {
    if (!isEditMode || !id) {
      toast.error("Please save the product first before managing variants");
      return;
    }

    try {
      setIsLoading(true);

      // Prepare the variant data
      const formattedVariants = toAdd.map((variant) => ({
        id: variant.id,
        name: variant.name || "",
        sku: variant.sku || "",
        price: String(parseFloat(variant.price) || 0),
        salePrice: variant.salePrice
          ? String(parseFloat(variant.salePrice))
          : null,
        stock: String(parseInt(variant.stock, 10) || 0), // Include stock for compatibility
        quantity: String(parseInt(variant.stock, 10) || 0),
      }));

      // Call the bulk variants API
      const response = await products.manageVariants(id, {
        variants: formattedVariants,
        variantsToDelete: toRemove,
      });

      if (response.data.success) {
        // Update the form with the returned variants
        setValue(
          "variants",
          response.data.data.variants.map((variant: any) => ({
            id: variant.id,
            name: variant.name || "",
            sku: variant.sku || "",
            price: String(variant.price || "0"),
            salePrice: variant.salePrice ? String(variant.salePrice) : "",
            stock: String(variant.quantity || "0"),
          }))
        );

        toast.success("Variants updated successfully");
      } else {
        toast.error(response.data.message || "Failed to update variants");
      }
    } catch (error: any) {
      console.error("Error managing variants:", error);
      toast.error(
        "Failed to update variants: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to remove a variant with confirmation
  const handleRemoveVariant = (index: number, variantId?: string) => {
    const variant = variantFields[index];

    // For saved variants, use the API to remove
    if (
      isEditMode &&
      id &&
      variant.id &&
      !variant.id.startsWith("new-") &&
      !variant.id.startsWith("field")
    ) {
      if (window.confirm("Are you sure you want to remove this variant?")) {
        manageVariants([], [variant.id]);
      }
    } else {
      // For unsaved variants, just remove from the form
      removeVariant(index);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    try {
      console.log("Form data to be sent:", data);

      // Prepare form data
      const formData = new FormData();

      // Add basic product information
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("isActive", String(data.isActive));

      // Map form categories to API expected format
      if (data.categoryId) {
        formData.append("categoryIds", JSON.stringify([data.categoryId]));
        formData.append("primaryCategoryId", data.categoryId);
      }

      // Set product type
      const hasVariants = data.type === "variable";
      formData.append("hasVariants", String(hasVariants));
      formData.append("isSupplement", String(data.type === "supplement"));

      // Map prices correctly - this is the key fix
      formData.append("price", String(parseFloat(data.regularPrice) || 0));
      formData.append("salePrice", String(parseFloat(data.basePrice) || 0));

      // Add stock/quantity
      formData.append("quantity", String(parseInt(data.stock, 10) || 0));

      // Handle variants if it's a variable product
      if (hasVariants && data.variants && data.variants.length > 0) {
        // Track existing variant IDs to help backend identify which to keep/update/add
        const existingVariantIds = data.variants
          .filter(
            (variant) =>
              variant.id &&
              !variant.id.startsWith("new-") &&
              !variant.id.startsWith("field")
          )
          .map((variant) => variant.id);

        // Include all variants - new ones won't have IDs, existing ones will
        const processedVariants = data.variants.map((variant) => {
          const variantData: any = {
            name: variant.name || "",
            sku: variant.sku || "",
            price: String(parseFloat(variant.price) || 0),
            quantity: String(parseInt(variant.stock, 10) || 0),
            salePrice: variant.salePrice
              ? String(parseFloat(variant.salePrice) || 0)
              : null,
          };

          // Only include ID if it's a real database ID (not a temporary one)
          if (
            variant.id &&
            !variant.id.startsWith("new-") &&
            !variant.id.startsWith("field")
          ) {
            variantData.id = variant.id;
          }

          return variantData;
        });

        // For the backend to know which variants were removed
        if (isEditMode) {
          formData.append(
            "existingVariantIds",
            JSON.stringify(existingVariantIds)
          );
        }

        console.log("Sending variants:", processedVariants);
        formData.append("variants", JSON.stringify(processedVariants));
      }

      // Handle supplement info if it's a supplement product
      if (data.type === "supplement" && data.supplementInfo) {
        formData.append("ingredients", data.supplementInfo.ingredients || "");
        formData.append(
          "nutritionInfo",
          JSON.stringify({
            details: data.supplementInfo.nutritionalInfo,
            benefits: data.supplementInfo.benefits,
            howToUse: data.supplementInfo.howToUse,
          })
        );
      }

      // Handle image uploads
      if (data.images && data.images.length > 0) {
        // For existing images, we need to include their IDs to preserve them
        const existingImages = data.images
          .filter((img) => img.id)
          .map((img) => img.id);

        if (existingImages.length > 0) {
          formData.append("existingImageIds", JSON.stringify(existingImages));
        }

        // Find primary image (first one is primary if none marked)
        const primaryImageIndex = data.images.findIndex(
          (img) => img.isPrimary === true
        );
        formData.append(
          "primaryImageIndex",
          String(primaryImageIndex >= 0 ? primaryImageIndex : 0)
        );

        // Add new image files
        data.images.forEach((img) => {
          if (img.file) {
            formData.append("images", img.file);
          }
        });
      }

      // Log what's being sent for debugging
      console.log("FormData contents for debugging:");
      for (const [key, value] of formData.entries()) {
        console.log(
          `${key}: ${typeof value === "object" ? "File or Object" : value}`
        );
      }

      if (isEditMode && id) {
        // Use the form data API for updates
        const response = await products.updateProduct(id, formData as any);
        console.log("Update response:", response.data);
        toast.success("Product updated successfully");

        // Redirect to products list
        navigate("/products");
      } else {
        // Use form data for creation too
        await products.createProduct(formData as any);
        toast.success("Product created successfully");

        // Redirect to products list
        navigate("/products");
      }
    } catch (error: any) {
      console.error("Error saving product:", error);
      // Show detailed error message if available
      const errorMessage =
        error.response?.data?.message || "Error saving product";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link to="/products">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditMode ? "Edit Product" : "Create New Product"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? "Edit existing product information"
              : "Add a new product to the store"}
          </p>
        </div>

        <div className="flex gap-2 self-end sm:self-auto">
          <Button variant="outline" onClick={() => navigate("/products")}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
              <TabsTrigger value="extras">Additional Information</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Details</CardTitle>
                  <CardDescription>
                    Product name, description and other basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Product Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter product name"
                        {...register("name", { required: "Name is required" })}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category</Label>
                      <Controller
                        control={control}
                        name="categoryId"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriesList.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU Code</Label>
                      <Input
                        id="sku"
                        placeholder="Product stock code"
                        {...register("sku")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Product Type</Label>
                      <Controller
                        control={control}
                        name="type"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">
                                Simple Product
                              </SelectItem>
                              <SelectItem value="variable">
                                Variable Product
                              </SelectItem>
                              <SelectItem value="supplement">
                                Supplement Product
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed information about the product"
                      className="min-h-32"
                      {...register("description")}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="regularPrice">
                        Regular Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="regularPrice"
                          type="number"
                          className="pl-7"
                          placeholder="0.00"
                          {...register("regularPrice", {
                            required: "Regular price is required",
                          })}
                        />
                      </div>
                      {errors.regularPrice && (
                        <p className="text-sm text-red-500">
                          {errors.regularPrice.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="basePrice">
                        Sale Price <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          id="basePrice"
                          type="number"
                          className="pl-7"
                          placeholder="0.00"
                          {...register("basePrice", {
                            required: "Sale price is required",
                          })}
                        />
                      </div>
                      {errors.basePrice && (
                        <p className="text-sm text-red-500">
                          {errors.basePrice.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        placeholder="Available quantity"
                        {...register("stock")}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex items-center space-x-2">
                      <Controller
                        control={control}
                        name="hasSale"
                        render={({ field }) => (
                          <Checkbox
                            id="hasSale"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="hasSale">On Sale</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        control={control}
                        name="isActive"
                        render={({ field }) => (
                          <Checkbox
                            id="isActive"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isActive">Is Active</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        control={control}
                        name="isVeg"
                        render={({ field }) => (
                          <Checkbox
                            id="isVeg"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isVeg">Vegetarian</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Images</CardTitle>
                  <CardDescription>Upload product images</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Dropzone
                    onDrop={(acceptedFiles) => {
                      // Create URL objects and add to images array
                      const newImages = acceptedFiles.map((file) => ({
                        url: URL.createObjectURL(file),
                        file: file, // Store the actual file object
                        isPrimary: false,
                      }));

                      // Set first image as primary if no images exist yet
                      if (
                        watch("images").length === 0 &&
                        newImages.length > 0
                      ) {
                        newImages[0].isPrimary = true;
                      }

                      // Add new images to existing images
                      const currentImages = watch("images") || [];
                      setValue("images", [...currentImages, ...newImages]);

                      console.log("Files added:", acceptedFiles.length);
                    }}
                    accept={{
                      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
                    }}
                    maxFiles={5}
                  >
                    {({ getRootProps, getInputProps }) => (
                      <div
                        {...getRootProps()}
                        className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="rounded-full bg-primary/10 p-2">
                            <Plus className="h-6 w-6 text-primary" />
                          </div>
                          <p className="text-sm font-medium">
                            Drag and drop images or click to browse files
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG or WebP (max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </Dropzone>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {watch("images")?.map((image, index) => (
                      <div
                        key={index}
                        className={`relative group aspect-square rounded-md overflow-hidden border ${
                          image.isPrimary ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={`Product ${index}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!image.isPrimary && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 bg-green-500 hover:bg-green-600"
                              onClick={() => {
                                // Unset all images as primary
                                const newImages = [...watch("images")].map(
                                  (img) => ({
                                    ...img,
                                    isPrimary: false,
                                  })
                                );
                                // Set this image as primary
                                newImages[index].isPrimary = true;
                                setValue("images", newImages);
                              }}
                              title="Set as primary image"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newImages = [...watch("images")];
                              newImages.splice(index, 1);
                              setValue("images", newImages);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants" className="space-y-6">
              {selectedType === "variable" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Product Variants</CardTitle>
                    <CardDescription>
                      Create product variants for different flavors, weights,
                      etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-4">
                        <Label>Select Flavors</Label>
                        <div className="flex flex-wrap gap-2">
                          {flavorsOptions.map((flavor) => (
                            <div
                              key={flavor}
                              className="flex items-center space-x-2"
                            >
                              <Controller
                                control={control}
                                name="flavors"
                                render={({ field }) => {
                                  const isSelected =
                                    field.value.includes(flavor);
                                  return (
                                    <Checkbox
                                      id={`flavor-${flavor}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([
                                            ...field.value,
                                            flavor,
                                          ]);
                                        } else {
                                          field.onChange(
                                            field.value.filter(
                                              (f) => f !== flavor
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  );
                                }}
                              />
                              <Label htmlFor={`flavor-${flavor}`}>
                                {flavor}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Select Weights</Label>
                        <div className="flex flex-wrap gap-2">
                          {weightsOptions.map((weight) => (
                            <div
                              key={weight}
                              className="flex items-center space-x-2"
                            >
                              <Controller
                                control={control}
                                name="weights"
                                render={({ field }) => {
                                  const isSelected =
                                    field.value.includes(weight);
                                  return (
                                    <Checkbox
                                      id={`weight-${weight}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([
                                            ...field.value,
                                            weight,
                                          ]);
                                        } else {
                                          field.onChange(
                                            field.value.filter(
                                              (w) => w !== weight
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  );
                                }}
                              />
                              <Label htmlFor={`weight-${weight}`}>
                                {weight}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" onClick={generateVariants}>
                        Generate Variants
                      </Button>
                    </div>

                    {variantFields.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">
                            Variants ({variantFields.length})
                          </h3>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              appendVariant({
                                name: watch("name")
                                  ? `${watch("name")} - New Variant`
                                  : "New Variant",
                                sku: "",
                                price: watch("regularPrice") || "",
                                salePrice: watch("basePrice") || "",
                                stock: "0",
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variant
                          </Button>
                        </div>
                        <div className="rounded-md border">
                          <div className="grid grid-cols-15 gap-2 border-b bg-muted/50 p-3 text-sm font-medium">
                            <div className="col-span-4">Name</div>
                            <div className="col-span-2">SKU</div>
                            <div className="col-span-2">Regular Price</div>
                            <div className="col-span-2">Sale Price</div>
                            <div className="col-span-2">Stock</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="divide-y">
                            {variantFields.map((field, index) => (
                              <div
                                key={field.id}
                                className="grid grid-cols-15 gap-2 p-3"
                              >
                                <div className="col-span-4">
                                  <Input
                                    {...register(`variants.${index}.name`)}
                                    placeholder="Variant name"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    {...register(`variants.${index}.sku`)}
                                    placeholder="SKU"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                                      ₹
                                    </span>
                                    <Input
                                      type="number"
                                      className="pl-7"
                                      {...register(`variants.${index}.price`)}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                                      ₹
                                    </span>
                                    <Input
                                      type="number"
                                      className="pl-7"
                                      {...register(
                                        `variants.${index}.salePrice`
                                      )}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    {...register(`variants.${index}.stock`)}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="col-span-1 flex items-center justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleRemoveVariant(index, field.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="extras" className="space-y-6">
              {selectedType === "supplement" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Supplement Information</CardTitle>
                    <CardDescription>
                      Include nutritional information, ingredients and usage
                      instructions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ingredients">Ingredients</Label>
                      <Textarea
                        id="ingredients"
                        placeholder="List of all ingredients used in the supplement"
                        className="min-h-24"
                        {...register("supplementInfo.ingredients")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nutritionalInfo">
                        Nutritional Information
                      </Label>
                      <Textarea
                        id="nutritionalInfo"
                        placeholder="Details of nutrients (per serving)"
                        className="min-h-24"
                        {...register("supplementInfo.nutritionalInfo")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="benefits">Benefits</Label>
                      <Textarea
                        id="benefits"
                        placeholder="Details of the supplement's health benefits"
                        className="min-h-24"
                        {...register("supplementInfo.benefits")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="howToUse">How to Use</Label>
                      <Textarea
                        id="howToUse"
                        placeholder="How and when to use the supplement"
                        className="min-h-24"
                        {...register("supplementInfo.howToUse")}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Options</CardTitle>
                  <CardDescription>
                    Additional settings and product options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">SEO Details</Label>
                      <p className="text-sm text-muted-foreground">
                        Meta tags and descriptions for search engine
                        optimization
                      </p>
                    </div>
                    <Button variant="outline" type="button">
                      Edit
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Product Tags</Label>
                      <p className="text-sm text-muted-foreground">
                        Keywords and filters associated with the product
                      </p>
                    </div>
                    <Button variant="outline" type="button">
                      Edit
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Related Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Products bought together or recommended
                      </p>
                    </div>
                    <Button variant="outline" type="button">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      )}
    </div>
  );
}
