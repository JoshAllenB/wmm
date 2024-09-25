/** @type import('@tanstack/react-table').ColumnDef<any>[] */
export const userColumns = [
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ getValue }) => {
      const status = getValue();
      let bgColor;
      switch (status) {
        case "Active":
          bgColor = "bg-green-500";
          break;
        case "Inactive":
          bgColor = "bg-yellow-500";
          break;
        case "Logged Off":
          bgColor = "bg-red-500";
          break;
        default:
          bgColor = "bg-gray-500";
      }
      return (
        <span className={`px-2 py-1 rounded-full ${bgColor} text-white`}>
          {status}
        </span>
      );
    },
  },
  {
    id: "username",
    header: "Username",
    accessorFn: (row) => row.username,
  },
  {
    id: "role",
    header: "Role",
    accessorFn: (row) => (row.role ? row.role.name : "No Role Assigned"),
    cell: ({ getValue }) => getValue() || "No Role Assigned",
  },
  {
    id: "lastLoginAt",
    header: "Last Login",
    accessorFn: (row) =>
      row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never",
  },
];
