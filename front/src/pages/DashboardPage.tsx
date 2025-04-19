import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { orders } from "@/api/adminService";
import { inventory } from "@/api/adminService";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { admin } = useAuth();
  const [orderStats, setOrderStats] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load order stats
        const orderStatsData = await orders.getOrderStats();
        setOrderStats(orderStatsData.data);

        // Load inventory stats
        const inventoryStatsData = await inventory.getInventoryOverview();
        setInventoryStats(inventoryStatsData.data);
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading dashboard data...
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
      </div>
    );
  }

  // COLORS
  const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {admin?.firstName || "Admin"}
        </h2>
        <p className="text-muted-foreground">
          Here's an overview of your store's performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total Orders
            </p>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{orderStats?.totalOrders || 0}</p>
          </div>
          <div className="mt-2 flex items-center text-xs">
            {orderStats?.orderGrowth > 0 ? (
              <>
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-500">
                  {orderStats?.orderGrowth}% increase
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                <span className="text-destructive">
                  {Math.abs(orderStats?.orderGrowth || 0)}% decrease
                </span>
              </>
            )}
            <span className="ml-1 text-muted-foreground">vs. last month</span>
          </div>
        </Card>

        {/* Total Revenue */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">
              ₹{orderStats?.totalRevenue?.toLocaleString() || 0}
            </p>
          </div>
          <div className="mt-2 flex items-center text-xs">
            {orderStats?.revenueGrowth > 0 ? (
              <>
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                <span className="text-green-500">
                  {orderStats?.revenueGrowth}% increase
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
                <span className="text-destructive">
                  {Math.abs(orderStats?.revenueGrowth || 0)}% decrease
                </span>
              </>
            )}
            <span className="ml-1 text-muted-foreground">vs. last month</span>
          </div>
        </Card>

        {/* Products In Stock */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Products In Stock
            </p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">
              {inventoryStats?.totalVariants || 0}
            </p>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-muted-foreground">
              {inventoryStats?.inStockPercentage || 0}% in stock
            </span>
          </div>
        </Card>

        {/* Low Stock */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">
              {inventoryStats?.lowStockCount || 0}
            </p>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className="text-muted-foreground">
              {inventoryStats?.outOfStockCount || 0} items out of stock
            </span>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Revenue Over Time</h3>
            <p className="text-sm text-muted-foreground">
              Monthly revenue for the past 6 months
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={orderStats?.monthlySales || []}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.substring(0, 3)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value) => [
                    `₹${Number(value).toLocaleString()}`,
                    "Revenue",
                  ]}
                  labelFormatter={(label) => `${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Order Status Chart */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Order Status Breakdown</h3>
            <p className="text-sm text-muted-foreground">
              Distribution of orders by status
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStats?.ordersByStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {(orderStats?.ordersByStatus || []).map(
                    (_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    Number(value).toLocaleString(),
                    "Orders",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Recent Inventory Activity</h3>
          <p className="text-sm text-muted-foreground">
            Latest inventory changes
          </p>
        </div>
        <div className="divide-y">
          {inventoryStats?.recentLogs?.map((log: any) => (
            <div key={log.id} className="py-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">
                    {log.variant.product.name} - {log.variant.flavor?.name}{" "}
                    {log.variant.weight?.value}
                    {log.variant.weight?.unit}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {log.reason} - {log.notes}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      log.quantityChange > 0
                        ? "text-green-500"
                        : "text-destructive"
                    }`}
                  >
                    {log.quantityChange > 0 ? "+" : ""}
                    {log.quantityChange}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {(!inventoryStats?.recentLogs ||
            inventoryStats.recentLogs.length === 0) && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              No recent activity
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
