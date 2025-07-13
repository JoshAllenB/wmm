import { Button } from "../../UI/ShadCN/button";
import { useEffect, useCallback, memo } from "react";

export const PaginationComponent = memo(({
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
  // Ensure totalPages is at least 1 and is a number
  const effectiveTotalPages = Math.max(1, Number(totalPages) || 1);
  // Ensure page is a valid number
  const effectivePage = Math.min(Math.max(1, Number(page) || 1), effectiveTotalPages);

  useEffect(() => {

    // Reset to page 1 if current page is greater than total pages
    if (effectivePage !== page) {
      setPage(effectivePage);
    }
  }, [effectiveTotalPages, page, effectivePage, setPage]);

  const handlePageSizeChange = useCallback((e) => {
    const newSize = Number(e.target.value);
    if (newSize !== pageSize) {
      setPageSize(newSize);
    }
  }, [pageSize, setPageSize]);

  const validateAndJumpToPage = useCallback((newPage) => {
    const validatedPage = Math.min(Math.max(1, newPage), effectiveTotalPages);
    if (validatedPage !== page) {
      handlePageJump(validatedPage);
    }
  }, [effectiveTotalPages, page, handlePageJump]);

  const pageSizeOptions = [
    10, 20, 30, 50, 100, 500,
    { label: "All", value: 100000 }
  ];

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
            {pageSizeOptions.map((size) => (
              <option
                key={typeof size === "object" ? size.value : size}
                value={typeof size === "object" ? size.value : size}
              >
                {typeof size === "object" ? size.label : size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleFirstPage}
            disabled={page <= 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handlePreviousPage}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <input
            type="number"
            className="h-8 w-[50px] rounded-md border border-input text-center"
            value={page}
            onChange={(e) => validateAndJumpToPage(Number(e.target.value))}
            min={1}
            max={effectiveTotalPages}
          />
          <Button
            variant="outline"
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleNextPage}
            disabled={page >= effectiveTotalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            className="border rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleLastPage}
            disabled={page >= effectiveTotalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
});

PaginationComponent.displayName = 'PaginationComponent';
