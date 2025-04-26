import { ReactNode, useState } from "react";
import { Link, useLocation, Navigate, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Resource, Action } from "@/types/admin";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  LogOut,
  Menu,
  X,
  Coffee,
  Scale,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeRender } from "@/components/SafeRender";

interface NavItemProps {
  href: string;
  icon: ReactNode;
  title: string;
  onClick?: () => void;
  hasPermission: boolean;
}

const NavItem = ({
  href,
  icon,
  title,
  onClick,
  hasPermission = true,
}: NavItemProps) => {
  const location = useLocation();
  const isActive =
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  if (!hasPermission) return null;

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
};

// Define custom resources not in the enum
const CUSTOM_RESOURCES = {
  INVENTORY: "inventory",
  FLAVORS: "flavors",
  WEIGHTS: "weights",
  COUPONS: "coupons",
} as const;

type CustomResourceType =
  (typeof CUSTOM_RESOURCES)[keyof typeof CUSTOM_RESOURCES];

// Helper function to check permissions for both enum and custom resources
const hasPermissionFor = (
  admin: any,
  resource: Resource | CustomResourceType,
  action?: Action
): boolean => {
  // Super admin has all permissions
  if (admin?.role === "SUPER_ADMIN") return true;

  if (!admin?.permissions || !Array.isArray(admin.permissions)) return false;

  const resourcePrefix = `${resource}:`;

  if (action) {
    const permissionString = `${resource}:${action}`;
    return admin.permissions.some((perm: string) => perm === permissionString);
  } else {
    return admin.permissions.some((perm: string) =>
      perm.startsWith(resourcePrefix)
    );
  }
};

export default function DashboardLayout() {
  const { admin, isAuthenticated, logout, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show loading state if auth is still initializing
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside className="bg-sidebar hidden w-64 flex-col border-r border-sidebar-border md:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <Package className="h-6 w-6" />
            <span>Admin Dashboard</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <SafeRender>
            <div className="flex flex-col gap-1">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                title="Dashboard"
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />
              <NavItem
                href="/products"
                icon={<Package className="h-5 w-5" />}
                title="Products"
                hasPermission={hasPermissionFor(admin, Resource.PRODUCTS)}
              />
              <NavItem
                href="/flavors"
                icon={<Coffee className="h-5 w-5" />}
                title="Flavors"
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.FLAVORS
                )}
              />
              <NavItem
                href="/weights"
                icon={<Scale className="h-5 w-5" />}
                title="Weights"
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.WEIGHTS
                )}
              />
              <NavItem
                href="/orders"
                icon={<ShoppingCart className="h-5 w-5" />}
                title="Orders"
                hasPermission={hasPermissionFor(admin, Resource.ORDERS)}
              />
              <NavItem
                href="/categories"
                icon={<Tags className="h-5 w-5" />}
                title="Categories"
                hasPermission={hasPermissionFor(admin, Resource.CATEGORIES)}
              />
              <NavItem
                href="/coupons"
                icon={<Ticket className="h-5 w-5" />}
                title="Coupons"
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.COUPONS
                )}
              />
              <NavItem
                href="/admins"
                icon={<Users className="h-5 w-5" />}
                title="Admins"
                hasPermission={admin?.role === "SUPER_ADMIN"}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {admin?.role}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start border-sidebar-border hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <Package className="h-6 w-6" />
            <span>Admin Dashboard</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <SafeRender>
            <div className="flex flex-col gap-1">
              <NavItem
                href="/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                title="Dashboard"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  Resource.DASHBOARD,
                  Action.READ
                )}
              />
              <NavItem
                href="/products"
                icon={<Package className="h-5 w-5" />}
                title="Products"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(admin, Resource.PRODUCTS)}
              />
              <NavItem
                href="/flavors"
                icon={<Coffee className="h-5 w-5" />}
                title="Flavors"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.FLAVORS
                )}
              />
              <NavItem
                href="/weights"
                icon={<Scale className="h-5 w-5" />}
                title="Weights"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.WEIGHTS
                )}
              />
              <NavItem
                href="/orders"
                icon={<ShoppingCart className="h-5 w-5" />}
                title="Orders"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(admin, Resource.ORDERS)}
              />
              <NavItem
                href="/categories"
                icon={<Tags className="h-5 w-5" />}
                title="Categories"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(admin, Resource.CATEGORIES)}
              />
              <NavItem
                href="/coupons"
                icon={<Ticket className="h-5 w-5" />}
                title="Coupons"
                onClick={toggleMobileMenu}
                hasPermission={hasPermissionFor(
                  admin,
                  CUSTOM_RESOURCES.COUPONS
                )}
              />
              <NavItem
                href="/admins"
                icon={<Users className="h-5 w-5" />}
                title="Admins"
                onClick={toggleMobileMenu}
                hasPermission={admin?.role === "SUPER_ADMIN"}
              />
            </div>
          </SafeRender>
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              {admin?.firstName?.charAt(0) || admin?.email?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                {admin?.firstName
                  ? `${admin.firstName} ${admin.lastName}`
                  : admin?.email}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {admin?.role}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start border-sidebar-border"
            onClick={() => {
              toggleMobileMenu();
              logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Package className="h-6 w-6" />
            <span>Admin Dashboard</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
