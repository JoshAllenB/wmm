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

export function ColumnToggle({
  columns,
  columnVisibility,
  setColumnVisibility,
}) {
  const { hasRole } = useUser();

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
