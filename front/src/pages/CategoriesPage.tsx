import { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { categories } from "@/api/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SafeRender } from "@/components/SafeRender";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  ImageIcon,
  Tags,
} from "lucide-react";

export default function CategoriesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNewCategory = location.pathname.includes("/new");
  const isEditCategory = !!id;

  // Show appropriate content based on route
  if (isNewCategory) {
    return <CategoryForm mode="create" />;
  }

  if (isEditCategory) {
    return <CategoryForm mode="edit" categoryId={id} />;
  }

  return <CategoriesList />;
}

// Categories List Component
function CategoriesList() {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const response = await categories.getCategories();
        console.log("Categories response:", response);

        if (response.data.success) {
          setCategoriesList(response.data.data?.categories || []);
        } else {
          setError(response.data.message || "Failed to fetch categories");
        }
      } catch (error: any) {
        console.error("Error fetching categories:", error);
        setError("Failed to load categories. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle category deletion
  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const response = await categories.deleteCategory(categoryId);

      if (response.data.success) {
        toast.success("Category deleted successfully");
        // Refresh the categories list
        setCategoriesList((prevCategories) =>
          prevCategories.filter((category) => category.id !== categoryId)
        );
      } else {
        toast.error(response.data.message || "Failed to delete category");
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error(
        error.response?.data?.message ||
          "An error occurred while deleting the category. It may be in use by products."
      );
    }
  };

  // Loading state
  if (isLoading && categoriesList.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading categories...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && categoriesList.length === 0) {
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
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button asChild>
          <Link to="/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      {/* Categories List */}
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
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Parent
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Image
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoriesList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categoriesList.map((category) => (
                    <tr key={category.id} className="border-b">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tags className="h-5 w-5 text-muted-foreground" />
                          <span>{category.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {category.parent?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="h-8 w-8 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/categories/${category.id}`}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category.id)}
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
      </Card>
    </div>
  );
}

// Category Form Component
function CategoryForm({
  mode,
  categoryId,
}: {
  mode: "create" | "edit";
  categoryId?: string;
}) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [category, setCategory] = useState<any>({
    name: "",
    description: "",
    parentId: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch all categories for parent selection
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const response = await categories.getCategories();
        if (response.data.success) {
          setAllCategories(response.data.data?.categories || []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchAllCategories();
  }, []);

  // Fetch category data if editing
  useEffect(() => {
    if (mode === "edit" && categoryId) {
      const fetchCategoryDetails = async () => {
        try {
          setFormLoading(true);
          const response = await categories.getCategoryById(categoryId);

          if (response.data.success) {
            const categoryData = response.data.data?.category || {};
            setCategory({
              name: categoryData.name || "",
              description: categoryData.description || "",
              parentId: categoryData.parentId || "",
            });
            if (categoryData.image) {
              setImagePreview(categoryData.image);
            }
          } else {
            toast.error(
              response.data.message || "Failed to fetch category details"
            );
          }
        } catch (error) {
          console.error("Error fetching category:", error);
          toast.error("An error occurred while fetching category data");
        } finally {
          setFormLoading(false);
        }
      };

      fetchCategoryDetails();
    }
  }, [mode, categoryId]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
  };

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCategory((prev: any) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name) {
      toast.error("Category name is required");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", category.name);

      if (category.description) {
        formData.append("description", category.description);
      }

      if (category.parentId) {
        formData.append("parentId", category.parentId);
      } else {
        formData.append("parentId", "");
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      let response;

      if (mode === "create") {
        response = await categories.createCategory(formData);
      } else {
        response = await categories.updateCategory(categoryId!, formData);
      }

      if (response.data.success) {
        toast.success(
          mode === "create"
            ? "Category created successfully"
            : "Category updated successfully"
        );
        navigate("/categories");
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.response?.data?.message || "Failed to save category");
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
            {mode === "edit" ? "Loading category..." : "Preparing form..."}
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
            <Link to="/categories">
              <ChevronLeft className="h-4 w-4" />
              Back to Categories
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "Create Category" : "Edit Category"}
          </h1>
        </div>
      </div>

      <Card className="overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={category.name}
                  onChange={handleChange}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Category</Label>
                <select
                  id="parentId"
                  name="parentId"
                  value={category.parentId}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">None (Top Level)</option>
                  {allCategories
                    .filter((cat) => cat.id !== categoryId) // Prevent selecting self as parent
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
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
                value={category.description}
                onChange={handleChange}
                placeholder="Enter category description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Category Image</Label>
              <div className="flex items-start gap-4">
                <div>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recommended size: 400x400 pixels, Max size: 5MB
                  </p>
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/categories")}
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
                "Create Category"
              ) : (
                "Update Category"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
