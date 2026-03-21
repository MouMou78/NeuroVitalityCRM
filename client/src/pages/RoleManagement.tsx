import { useState } from "react";
import { trpc } from "@/lib/trpc";

import { toast } from "sonner";

export default function RoleManagement() {
  const canManageUsers = true; // Auth bypass enabled
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: users, refetch } = trpc.customAuth.listUsers.useQuery();
  const updateRoleMutation = trpc.customAuth.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetch();
      setSelectedUser(null);
      setSelectedRole("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  const roles = [
    { value: "owner", label: "Owner", description: "Full system access with tenant ownership" },
    { value: "admin", label: "Administrator", description: "Full administrative access" },
    { value: "manager", label: "Manager", description: "Team management and oversight" },
    { value: "sales_manager", label: "Sales Manager", description: "Sales team leadership" },
    { value: "sales_rep", label: "Sales Representative", description: "Individual contributor (SDR/BDR)" },
    { value: "sales_support", label: "Sales Support", description: "Sales support with limited access" },
    { value: "viewer", label: "Viewer", description: "Read-only access" },
  ];

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to manage user roles.</p>
          <p className="text-sm text-muted-foreground mt-2">Only owners can access this page.</p>
        </div>
      </div>
    );
  }

  const handleRoleUpdate = () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Please select a user and role");
      return;
    }

    updateRoleMutation.mutate({
      userId: selectedUser,
      role: selectedRole,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground mt-2">Assign roles and permissions to users in your organization</p>
      </div>

      {/* Role Descriptions */}
      <div className="bg-card rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.value} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-1">{role.label}</h3>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="bg-card rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Users</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{user.name || "No name"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {roles.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedUser(user.id);
                        setSelectedRole(user.role);
                      }}
                      className="text-primary hover:text-primary/80 font-medium"
                    >
                      Change Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change User Role</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select New Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-2">
                {roles.find(r => r.value === selectedRole)?.description}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedRole("");
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={updateRoleMutation.isPending}
                className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
