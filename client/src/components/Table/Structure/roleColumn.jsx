import { Button } from "../../UI/ShadCN/button";

export const roleColumns = [
  {
    accessorKey: "name",
    header: "Role Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-gray-600">{row.original.description || "No description provided"}</div>
    ),
  },
  {
    accessorKey: "defaultPermissions",
    header: "Default Permissions",
    cell: ({ row }) => {
      const permissions = row.original.defaultPermissions || [];
      const displayCount = 2; // Number of permissions to display before showing "+X more"
      
      return (
        <div className="text-sm">
          {permissions.length === 0 ? (
            <span className="text-gray-500">No permissions assigned</span>
          ) : (
            <div>
              {permissions.slice(0, displayCount).map((permission, index) => (
                <span key={permission._id} className="inline-block bg-gray-100 rounded px-2 py-1 text-xs mr-1 mb-1">
                  {permission.name}
                </span>
              ))}
              {permissions.length > displayCount && (
                <span className="text-xs text-gray-500">
                  +{permissions.length - displayCount} more
                </span>
              )}
            </div>
          )}
        </div>
      );
    },
  },
]; 