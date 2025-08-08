import { Button } from "../../UI/ShadCN/button";
import { useEffect, useCallback, memo, useState } from "react";
import useDebounce from "../../../utils/Hooks/useDebounce";

export const PaginationComponent = memo(
  ({
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
    const effectivePage = Math.min(
      Math.max(1, Number(page) || 1),
      effectiveTotalPages
    );

    // Local state for immediate UI feedback
    const [localPageInput, setLocalPageInput] = useState(page.toString());

    // Debounce the page input with 500ms delay
    const debouncedPageInput = useDebounce(localPageInput, 500);

    useEffect(() => {
      // Reset to page 1 if current page is greater than total pages
      if (effectivePage !== page) {
        setPage(effectivePage);
      }
    }, [effectiveTotalPages, page, effectivePage, setPage]);

    // Update local input when page changes from external source
    useEffect(() => {
      setLocalPageInput(page.toString());
    }, [page]);

    // Handle debounced page change
    useEffect(() => {
      const newPage = parseInt(debouncedPageInput, 10);

      // Only process if it's a valid number and different from current page
      if (!isNaN(newPage) && newPage !== page) {
        validateAndJumpToPage(newPage);
      }
    }, [debouncedPageInput]);

    const handlePageSizeChange = useCallback(
      (e) => {
        const newSize = Number(e.target.value);
        if (newSize !== pageSize) {
          setPageSize(newSize);
        }
      },
      [pageSize, setPageSize]
    );

    const validateAndJumpToPage = useCallback(
      (newPage) => {
        const validatedPage = Math.min(
          Math.max(1, newPage),
          effectiveTotalPages
        );
        if (validatedPage !== page) {
          handlePageJump(validatedPage);
        }
      },
      [effectiveTotalPages, page, handlePageJump]
    );

    const handlePageInputChange = useCallback((e) => {
      const value = e.target.value;

      // Allow empty string for better UX
      if (value === "") {
        setLocalPageInput("");
        return;
      }

      const numValue = parseInt(value, 10);

      // Only allow valid numbers
      if (isNaN(numValue)) {
        return;
      }

      // Update local state for immediate feedback
      setLocalPageInput(value);
    }, []);

    const handlePageInputBlur = useCallback(() => {
      // On blur, validate and correct the input
      const numValue = parseInt(localPageInput, 10);

      if (isNaN(numValue) || numValue < 1) {
        setLocalPageInput("1");
        validateAndJumpToPage(1);
      } else if (numValue > effectiveTotalPages) {
        setLocalPageInput(effectiveTotalPages.toString());
        validateAndJumpToPage(effectiveTotalPages);
      } else {
        setLocalPageInput(numValue.toString());
        validateAndJumpToPage(numValue);
      }
    }, [localPageInput, effectiveTotalPages, validateAndJumpToPage]);

    const handlePageInputKeyPress = useCallback((e) => {
      // Allow only numbers, backspace, delete, arrow keys, and enter
      const allowedKeys = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Enter",
        "Tab",
      ];
      const isNumber = /[0-9]/.test(e.key);

      if (!isNumber && !allowedKeys.includes(e.key)) {
        e.preventDefault();
      }

      // Handle Enter key
      if (e.key === "Enter") {
        e.target.blur(); // This will trigger the blur handler
      }
    }, []);

    const pageSizeOptions = [
      10,
      20,
      30,
      50,
      100,
      500,
      { label: "All", value: 100000 },
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
              type="text"
              className="h-8 rounded-md border border-input text-center"
              style={{
                width: `${Math.max(
                  50,
                  Math.min(120, localPageInput.length * 12 + 20)
                )}px`,
                minWidth: "50px",
                maxWidth: "120px",
              }}
              value={localPageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyPress}
              placeholder={page.toString()}
              title={`Enter a page number between 1 and ${effectiveTotalPages}`}
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
  }
);

PaginationComponent.displayName = "PaginationComponent";
