import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "../UI/ShadCN/dropdown-menu";
import { Checkbox } from "../UI/ShadCN/checkbox";
import { Button } from "../UI/ShadCN/button";
import { useUser } from "../../utils/Hooks/userProvider";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gray-100 border border-gray-300">
          Toggle Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="">
        <DropdownMenuLabel>Base Columns</DropdownMenuLabel>
        {baseColumns.map((column) => (
          <div key={column.id} className="flex items-center gap-2 px-2 py-1.5">
            <Checkbox
              id={column.id}
              checked={columnVisibility[column.id]}
              onCheckedChange={() => handleToggle(column.id)}
            />
            <label
              htmlFor={column.id}
              className="text-sm font-medium cursor-pointer ml-2"
            >
              {column.Header}
            </label>
          </div>
        ))}

        {roleColumns.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Role Columns</DropdownMenuLabel>
            {roleColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 px-2 py-1.5"
              >
                <Checkbox
                  id={column.id}
                  checked={columnVisibility[column.id]}
                  onCheckedChange={() => handleToggle(column.id)}
                />
                <label
                  htmlFor={column.id}
                  className="text-sm font-medium cursor-pointer ml-2"
                >
                  {column.Header}
                </label>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
