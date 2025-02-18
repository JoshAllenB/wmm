import { Button } from "../../UI/ShadCN/button";

export const PaginationComponent = ({
  totalPages,
  handlePreviousPage,
  handleNextPage,
  pageSize,
  setPageSize,
  page,
  setPage,
  handleFirstPage,
  handleLastPage,
  handlePageJump,
}) => {
  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  // Ensure totalPages is at least 1
  const effectiveTotalPages = Math.max(1, totalPages || 1);

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 text-sm text-muted-foreground">
        Page {page} of {effectiveTotalPages}
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
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleFirstPage}
            disabled={page === 1}
          >
            First
          </Button>
          <Button
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handlePreviousPage}
            disabled={page === 1}
          >
            Previous
          </Button>
          <input
            type="number"
            className="h-8 rounded-md border border-input text-center"
            value={page}
            onChange={(e) => handlePageJump(Number(e.target.value))}
            min={1}
            max={effectiveTotalPages}
          />
          <Button
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleNextPage}
            disabled={page === effectiveTotalPages}
          >
            Next
          </Button>
          <Button
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleLastPage}
            disabled={page === effectiveTotalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};
