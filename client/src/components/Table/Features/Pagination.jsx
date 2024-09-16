import { Button } from "../../UI/ShadCN/button";

export const PaginationComponent = ({
  table,
  page,
  totalPages,
  handlePreviousPage,
  handleNextPage,
}) => {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Button
        disabled={!table.getCanPreviousPage()}
        onClick={handlePreviousPage}
        className="text-white bg-blue-500"
      >
        Previous
      </Button>
      <span className="">
        Page {page} of {totalPages}
      </span>
      <Button
        disabled={!table.getCanNextPage()}
        onClick={handleNextPage}
        className="text-white bg-blue-500"
      >
        Next
      </Button>
    </div>
  );
};
