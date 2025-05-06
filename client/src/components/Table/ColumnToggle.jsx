import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "../UI/ShadCN/dropdown-menu";
import { Checkbox } from "../UI/ShadCN/checkbox";
import { Button } from "../UI/ShadCN/button";
import { useUser } from "../../utils/Hooks/userProvider";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useEffect, useRef } from "react";

export function ColumnToggle({
  columns,
  columnVisibility,
  setColumnVisibility,
  serviceFilters = [],
}) {
  const { hasRole, user } = useUser();
  const userRole = user?.role;
  // Add a ref to track if service filters have been applied already
  const serviceFiltersApplied = useRef(false);

  const handleToggle = (columnId) => {
    setColumnVisibility((prevVisibility) => ({
      ...prevVisibility,
      [columnId]: !prevVisibility[columnId],
    }));
  };

  // Filter columns to separate base and role-specific ones
  const baseColumns = columns.filter(
    (col) =>
      col.id !== "HRG Data" && col.id !== "FOM Data" && col.id !== "CAL Data"
  );

  const roleColumns = columns.filter(
    (col) =>
      col.id === "HRG Data" || col.id === "FOM Data" || col.id === "CAL Data"
  );

  // Apply service-based column visibility
  useEffect(() => {
    // Only apply service filters if they exist and haven't been applied yet or if they change
    if (serviceFilters && serviceFilters.length > 0 && 
        (!serviceFiltersApplied.current || serviceFiltersApplied.current !== JSON.stringify(serviceFilters))) {
      const newVisibility = { ...columnVisibility };
      
      // First, show essential columns regardless of service filter
      newVisibility["ID"] = true;
      newVisibility["Client Name"] = true;
      newVisibility["Contact Info"] = true;
      newVisibility["Address"] = true;
      newVisibility["Services"] = true;
      
      // Keep Added Info visible if it was previously visible
      if (columnVisibility["Added Info"] !== undefined) {
        newVisibility["Added Info"] = columnVisibility["Added Info"];
      }
      
      // Handle service-specific columns
      const hasHRG = serviceFilters.includes("HRG");
      const hasFOM = serviceFilters.includes("FOM");
      const hasCAL = serviceFilters.includes("CAL");
      const hasWMM = serviceFilters.includes("WMM");
      
      // Show/hide role columns based on filters
      newVisibility["HRG Data"] = hasHRG;
      newVisibility["FOM Data"] = hasFOM;
      newVisibility["CAL Data"] = hasCAL;
      
      // Show WMM-specific columns when WMM is in filter
      if (hasWMM) {
        newVisibility["Subscription"] = true;
      }
      
      // If only one service is selected, hide other columns
      if (serviceFilters.length === 1) {
        // Hide all non-essential columns first
        columns.forEach(column => {
          if (column.id !== "ID" && 
              column.id !== "Client Name" && 
              column.id !== "Contact Info" && 
              column.id !== "Address" &&
              column.id !== "Services" &&
              column.id !== "HRG Data" && 
              column.id !== "FOM Data" && 
              column.id !== "CAL Data" &&
              column.id !== "Subscription" &&
              column.id !== "Added Info") {
            newVisibility[column.id] = false;
          }
        });
        
        // Always show Address
        newVisibility["Address"] = true;
      }
      
      setColumnVisibility(newVisibility);
      
      // Mark service filters as applied
      serviceFiltersApplied.current = JSON.stringify(serviceFilters);
    }
  }, [serviceFilters, setColumnVisibility, columns, columnVisibility]);

  // Preset configurations
  const applyPreset = (preset) => {
    const newVisibility = { ...columnVisibility };
    
    // Reset all columns to hidden first for minimal and compact presets
    if (preset !== "all") {
      columns.forEach(column => {
        newVisibility[column.id] = false;
      });
    }
    
    switch(preset) {
      case "minimal":
        // Show only essential columns
        newVisibility["ID"] = true;
        newVisibility["Client Name"] = true;
        newVisibility["Contact Info"] = true;
        // Add Added Info if relevant
        if (hasRole("WMM") && userRole !== "HRG FOM CAL" && userRole !== "Admin") {
          newVisibility["Added Info"] = true;
        }
        // Keep role-specific columns visible if they were visible
        if (hasRole("WMM")) newVisibility["Subscription"] = true;
        if (hasRole("HRG")) newVisibility["HRG Data"] = true;
        if (hasRole("FOM")) newVisibility["FOM Data"] = true; 
        if (hasRole("CAL")) newVisibility["CAL Data"] = true;
        break;
      case "compact":
        // Show moderately used columns
        newVisibility["ID"] = true;
        newVisibility["Client Name"] = true;
        newVisibility["Address"] = true;
        newVisibility["Contact Info"] = true;
        newVisibility["Services"] = true;
        // Add Added Info if relevant
        if (hasRole("WMM") && userRole !== "HRG FOM CAL" && userRole !== "Admin") {
          newVisibility["Added Info"] = true;
        }
        // Keep role-specific columns visible
        if (hasRole("WMM")) newVisibility["Subscription"] = true;
        if (hasRole("HRG")) newVisibility["HRG Data"] = true;
        if (hasRole("FOM")) newVisibility["FOM Data"] = true; 
        if (hasRole("CAL")) newVisibility["CAL Data"] = true;
        break;
      case "all":
        // Show all columns
        columns.forEach(column => {
          newVisibility[column.id] = true;
        });
        break;
      default:
        break;
    }
    
    setColumnVisibility(newVisibility);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1 px-3">
          <ViewColumnIcon fontSize="small" style={{ fontSize: '1rem' }} />
          <span>Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <div className="p-2 border-b">
          <DropdownMenuLabel className="mb-1">Presets</DropdownMenuLabel>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 text-xs flex-1" 
              onClick={() => applyPreset('minimal')}
            >
              Minimal
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 text-xs flex-1" 
              onClick={() => applyPreset('compact')}
            >
              Compact
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 text-xs flex-1" 
              onClick={() => applyPreset('all')}
            >
              All
            </Button>
          </div>
        </div>
        
        <div className="py-2">
          <DropdownMenuLabel>Base Columns</DropdownMenuLabel>
          <div className="max-h-[200px] overflow-y-auto my-1">
            {baseColumns.map((column) => (
              <div key={column.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50">
                <Checkbox
                  id={column.id}
                  checked={columnVisibility[column.id]}
                  onCheckedChange={() => handleToggle(column.id)}
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium cursor-pointer ml-2 flex-1"
                >
                  {column.Header || column.id}
                </label>
              </div>
            ))}
          </div>
        </div>

        {roleColumns.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Role Columns</DropdownMenuLabel>
            {roleColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50"
              >
                <Checkbox
                  id={column.id}
                  checked={columnVisibility[column.id]}
                  onCheckedChange={() => handleToggle(column.id)}
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium cursor-pointer ml-2 flex-1"
                >
                  {column.Header || column.id}
                </label>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
