import { Button } from "../../UI/ShadCN/button";
import { tokens } from "../../UI/Theme/theme.utils";
import { useTheme } from "@mui/material";

export const PaginationComponent = ({
  table,
  page,
  totalPages,
  handlePreviousPage,
  handleNextPage,
}) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const bgColor = colors.mirage[500];

  return (
    <div className="mt-4 flex gap-2">
      <Button
        disabled={!table.getCanPreviousPage()}
        onClick={handlePreviousPage}
        style={{ backgroundColor: bgColor }}
        className="text-white"
      >
        Previous
      </Button>
      <Button
        disabled={!table.getCanNextPage()}
        onClick={handleNextPage}
        style={{
          backgroundColor: bgColor,
          ":hover": {
            backgroundColor: colors.mirage[600],
          },
        }}
        className="text-white"
      >
        Next
      </Button>
      <span className="">
        Page {page} of {totalPages}
      </span>
    </div>
  );
};
