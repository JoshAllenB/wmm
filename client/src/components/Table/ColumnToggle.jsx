import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "../UI/ShadCN/dropdown-menu";
import { Checkbox } from "../UI/ShadCN/checkbox";
import { Button } from "../UI/ShadCN/button";

export function ColumnToggle({
  columns,
  columnVisibility,
  setColumnVisibility,
}) {
  const handleToggle = (columnId) => {
    setColumnVisibility((prevVisibility) => ({
      ...prevVisibility,
      [columnId]: !prevVisibility[columnId],
    }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-gray-100 border border-gray-300 mb-2">
          Toggle Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        {columns.map((column) => (
          <div key={column.id} className="flex items-center gap-2 mb-2">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
