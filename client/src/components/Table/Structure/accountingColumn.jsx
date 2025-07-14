import { Checkbox } from "../../UI/ShadCN/checkbox";
import { ArrowUpDown } from "lucide-react";
import { Button } from "../../UI/ShadCN/button";

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
      id: "Client",
      header: "Client",
      accessorKey: "clientName",
      cell: ({ getValue, row }) => {
        const clientName = getValue();
        const company = row.original.company;
        
        // If clientName is "undefined, undefined", only show company
        if (clientName === "undefined, undefined") {
          return <div className="py-2 font-bold text-base">{company || "N/A"}</div>;
        }
        
        // If both are available and valid, show both
        if (clientName && company && clientName !== company) {
          return (
            <div className="py-2">
              <div className="font-bold text-base">{clientName}</div>
              <div className="text-sm italic">{company}</div>
            </div>
          );
        }
        
        // Otherwise show either clientName or company with bold styling
        return <div className="py-2 font-bold text-base">{clientName || company || "N/A"}</div>;
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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-semibold"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      accessorKey: "date",
      accessorFn: (row) => row.date ? new Date(row.date).getTime() : 0,
      cell: ({ getValue, row }) => {
        // If it's a WMM record, always show N/A
        if (row.original.modelType === 'WMM') {
          return <div className="py-2">N/A</div>;
        }
        
        // For other models, determine which date field was used
        const dateField = row.original.paymtdate ? 'Payment Date' :
                         row.original.recvdate ? 'Received Date' : '';
        const date = getValue();
        
        return (
          <div className="py-2" title={date ? `${dateField}: ${formatDate(date)}` : 'No date available'}>
            {date ? formatDate(date) : 'N/A'}
          </div>
        );
      },
      sortingFn: "datetime",
      sortDescFirst: true,
      enableSorting: true,
      size: 120,
    },
    {
      id: "Reference",
      header: "Reference & Form",
      accessorKey: "paymtref",
      cell: ({ getValue, row }) => {
        const ref = getValue();
        const form = row.original.paymtform;
        const model = row.original.model;
        
        return (
          <div className="py-2">
            <div className="text-md">
              {ref || <span className="text-muted-foreground italic">N/A</span>}
              {form && ` - ${form}`}
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      id: "Model",
      header: "Services",
      accessorKey: "modelType",
      cell: ({ getValue }) => (
        <div className="text-left font-medium py-2">
          {getValue()}
        </div>
      ),
      size: 80,
    },
  ];
};
