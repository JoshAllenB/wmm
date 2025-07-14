import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import DataTable from "../../Table/DataTable";
import { useAccountingColumns } from "../../Table/Structure/accountingColumn";
import { Input } from "../ShadCN/input";
import { Button } from "../ShadCN/button";
import useDebounce from "../../../utils/Hooks/useDebounce";
import { fetchAccounting } from "../../Table/Data/accountingData";

const Accounting = () => {
  const [filtering, setFiltering] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [yearError, setYearError] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([{ id: "Date", desc: true }]);
  const debouncedFiltering = useDebounce(filtering, 500);

  const columns = useAccountingColumns();

  // Validate year range
  const validateYearRange = useCallback(() => {
    const start = startYear ? parseInt(startYear) : null;
    const end = endYear ? parseInt(endYear) : null;
    
    // Clear error if both fields are empty
    if (!start && !end) {
      setYearError("");
      return true;
    }

    // Validate year format and range
    const currentYear = new Date().getFullYear();
    const minYear = 1900;

    if (start && (isNaN(start) || start < minYear || start > currentYear + 100)) {
      setYearError(`Start year must be between ${minYear} and ${currentYear + 100}`);
      return false;
    }

    if (end && (isNaN(end) || end < minYear || end > currentYear + 100)) {
      setYearError(`End year must be between ${minYear} and ${currentYear + 100}`);
      return false;
    }

    if (start && end && start > end) {
      setYearError("Start year cannot be greater than end year");
      return false;
    }

    setYearError("");
    return true;
  }, [startYear, endYear]);

  const handleFetch = useCallback(async (
    page,
    pageSize,
    searchTerm,
    selectedGroup,
    advancedFilterData
  ) => {
    if (!validateYearRange()) {
      return { data: [], totalPages: 0, totalRecords: 0 };
    }

    setIsLoading(true);
    try {
      // Only update page/pageSize if they're different from current state
      if (page !== undefined && page !== page) {
        setPage(page);
      }
      if (pageSize !== undefined && pageSize !== pageSize) {
        setPageSize(pageSize);
        // Reset to page 1 when changing page size
        if (page !== 1) {
          setPage(1);
          page = 1;
        }
      }

      const result = await fetchAccounting(page, pageSize, searchTerm, selectedGroup, {
        ...advancedFilterData,
        sortId: sorting[0]?.id,
        sortDesc: sorting[0]?.desc,
        startYear,
        endYear
      });

      setData(result.data || []);
      setTotalPages(result.totalPages || 0);
      return result;
    } catch (error) {
      console.error("Error fetching accounting data:", error);
      setData([]);
      setTotalPages(0);
      return { data: [], totalPages: 0, totalRecords: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [sorting, startYear, endYear, validateYearRange, page, pageSize]);

  // Memoize the search handler to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e) => {
    setFiltering(e.target.value);
    // Reset to page 1 when searching
    setPage(1);
  }, []);

  // Memoize the year change handler
  const handleYearChange = useCallback((e, type) => {
    const value = e.target.value;
    if (value === "" || /^\d{0,4}$/.test(value)) {
      if (type === "start") {
        setStartYear(value);
      } else {
        setEndYear(value);
      }
      // Reset to page 1 when changing year filters
      setPage(1);
    }
  }, []);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    handleFetch(1, pageSize, debouncedFiltering, "", {});
  }, [pageSize, debouncedFiltering, handleFetch]);

  return (
    <div className="mr-[10px] ml-[10px] mt-[10px]">
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by name, OR#/MS/GCASH numbers (e.g., 'OR# 45424', 'MS 001615', or just numbers)"
            value={filtering}
            onChange={handleSearchChange}
            className="pr-8"
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="Start Year"
              value={startYear}
              onChange={(e) => handleYearChange(e, "start")}
              className="w-24"
              maxLength={4}
            />
            <span className="self-center">-</span>
            <Input
              type="text"
              placeholder="End Year"
              value={endYear}
              onChange={(e) => handleYearChange(e, "end")}
              className="w-24"
              maxLength={4}
            />
          </div>
          {yearError && (
            <span className="text-xs text-red-500">{yearError}</span>
          )}
        </div>
        <Button
          onClick={handleRefresh}
          className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
          disabled={isLoading || !!yearError}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        fetchFunction={handleFetch}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        usePagination={true}
        searchTerm={debouncedFiltering}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting={true}
      />
    </div>
  );
};

export default Accounting;
