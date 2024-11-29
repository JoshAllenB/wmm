import { Button } from "../../UI/ShadCN/button";

export const PaginationComponent = ({
  totalPages,
  handlePreviousPage,
  handleNextPage,
  pageSize,
  setPageSize,
  page,
  setPage,
}) => {
  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <div className="flex items-center justify-between px-2 mt-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            className="h-8 w-[70px] rounded-md border border-input bg-transparent text-center"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            {[10, 20, 30, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            className="px-2 py-1 border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handlePreviousPage}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            className="px-2 py-1 border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleNextPage}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
