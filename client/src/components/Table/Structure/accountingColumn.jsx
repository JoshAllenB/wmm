import { Checkbox } from "../../UI/ShadCN/checkbox";

/** @type import ('@tanstack/react-table').ColumnDef<any>*/
export const useAccountingColumns = () => {
  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US");
    } catch {
      return dateString; // Return raw string if date parsing fails
    }
  };

  // Format amount function
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return "N/A";
    return `₱${parseFloat(amount).toFixed(2)}`;
  };

  return [
    {
      id: "select",
      toggleable: false,
      header: ({ table }) => (
        <div className="flex">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
            }}
            aria-label="Select all"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex px-4">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "Client",
      Header: "Client",
      accessorKey: "clientName",
      cell: ({ getValue, row }) => (
        <div>
          <div>{getValue()}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.company}
          </div>
        </div>
      ),
      size: 200,
    },
    {
      id: "Amount",
      Header: "Amount",
      accessorKey: "paymtamt",
      cell: ({ getValue }) => formatAmount(getValue()),
      size: 100,
    },
    {
      id: "Masses",
      Header: "Masses",
      accessorKey: "paymtmasses",
      cell: ({ getValue }) => getValue(),
      size: 80,
    },
    {
      id: "Date",
      Header: "Date",
      accessorKey: "adddate",
      cell: ({ getValue }) => formatDate(getValue()),
      size: 120,
    },
    {
      id: "Reference",
      Header: "Reference",
      accessorKey: "paymtref",
      cell: ({ getValue }) =>
        getValue() || <span className="text-gray-400">N/A</span>,
      size: 200,
    },
    {
      id: "Model",
      Header: "Model",
      accessorKey: "model",
      cell: ({ getValue }) => getValue(),
      size: 80,
    },
  ];
};
