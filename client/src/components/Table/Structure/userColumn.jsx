/** @type import('@tanstack/react-table').ColumnDef<any>[] */
export const userColumns = [
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.status,
    cell: ({ getValue }) => {
      const status = getValue();
      let bgColor, textColor, statusText;

      switch (status) {
        case "Active":
          bgColor = "bg-green-100";
          textColor = "text-green-800";
          statusText = "Active";
          break;
        case "Inactive":
          bgColor = "bg-yellow-100";
          textColor = "text-yellow-800";
          statusText = "Inactive";
          break;
        case "Logged Off":
          bgColor = "bg-red-100";
          textColor = "text-red-800";
          statusText = "Logged Off";
          break;
        default:
          bgColor = "bg-gray-100";
          textColor = "text-gray-800";
          statusText = status || "Unknown";
      }

      return (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
        >
          {statusText}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    id: "username",
    header: "Username",
    accessorFn: (row) => row.username,
    cell: ({ row }) => {
      const username = row.getValue("username");
      return (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mr-2">
            {username ? username.charAt(0).toUpperCase() : "?"}
          </div>
          <span className="font-medium">{username}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: "roles",
    header: "Roles",
    accessorFn: (row) => row.roles,
    cell: ({ getValue }) => {
      const roles = getValue();
      if (!roles || !roles.length)
        return <span className="text-gray-400">No roles</span>;

      return (
        <div className="flex flex-wrap gap-1">
          {roles.slice(0, 2).map((roleObj, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-100"
            >
              {roleObj.role?.name || "Unknown"}
            </span>
          ))}
          {roles.length > 2 && (
            <span className="px-2 py-1 text-xs rounded-md bg-gray-50 text-gray-700">
              +{roles.length - 2} more
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "lastLoginAt",
    header: "Last Login",
    accessorFn: (row) => row.lastLoginAt,
    cell: ({ getValue }) => {
      const lastLogin = getValue();
      if (!lastLogin) return <span className="text-gray-400">Never</span>;

      const date = new Date(lastLogin);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let formattedDate;
      if (diffDays === 0) {
        formattedDate =
          "Today at " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays === 1) {
        formattedDate =
          "Yesterday at " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else if (diffDays < 7) {
        formattedDate = diffDays + " days ago";
      } else {
        formattedDate = date.toLocaleDateString();
      }

      return (
        <div className="flex items-center">
          <div className="mr-2 h-2 w-2 rounded-full bg-gray-300"></div>
          <span className="text-sm">{formattedDate}</span>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: "actions",
    header: "",
    cell: () => {
      return (
        <div className="flex justify-end">
          <button
            className="text-blue-600 hover:text-blue-800"
            title="Edit user"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      );
    },
    enableSorting: false,
  },
];
