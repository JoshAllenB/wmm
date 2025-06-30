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
      header: "Client",
      accessorKey: "clientName",
      cell: ({ getValue, row }) => {
        const clientName = getValue();
        const company = row.original.company;
        
        // If clientName is "undefined, undefined", only show company
        if (clientName === "undefined, undefined") {
          return <div className="py-2">{company || "N/A"}</div>;
        }
        
        // If both are available and valid, show both
        if (clientName && company && clientName !== company) {
          return (
            <div className="py-2">
              <div className="font-medium">{clientName}</div>
              <div className="text-xs text-muted-foreground">{company}</div>
            </div>
          );
        }
        
        // Otherwise show either clientName or company
        return <div className="py-2">{clientName || company || "N/A"}</div>;
      },
      size: 200,
    },
    {
      id: "Amount",
      header: "Amount",
      accessorKey: "paymtamt",
      cell: ({ getValue }) => (
        <div className="text-left font-medium py-2">
          {formatAmount(getValue())}
        </div>
      ),
      size: 100,
    },
    {
      id: "Masses",
      header: "Masses",
      accessorKey: "paymtmasses",
      cell: ({ getValue }) => (
        <div className="text-left font-medium py-2">
          {getValue()}
        </div>
      ),
      size: 80,
    },
    {
      id: "Date",
      header: "Date",
      accessorKey: "adddate",
      cell: ({ getValue }) => (
        <div className="py-2">
          {formatDate(getValue())}
        </div>
      ),
      size: 120,
    },
    {
      id: "Reference",
      header: "Reference",
      accessorKey: "paymtref",
      cell: ({ getValue }) => (
        <div className="py-2">
          {getValue() || <span className="text-muted-foreground italic">N/A</span>}
        </div>
      ),
      size: 200,
    },
    {
      id: "Model",
      header: "Model",
      accessorKey: "model",
      cell: ({ getValue }) => (
        <div className="text-left font-medium py-2">
          {getValue()}
        </div>
      ),
      size: 80,
    },
  ];
};
