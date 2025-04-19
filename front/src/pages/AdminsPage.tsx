import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <Button asChild>
          <Link to="/admins/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-lg font-medium">Admin Management</h2>
        <p className="mt-2 text-muted-foreground">
          This page is under development. You will be able to manage admin users
          and permissions here.
        </p>
      </div>
    </div>
  );
}
