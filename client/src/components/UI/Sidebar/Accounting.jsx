import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import DataTable from "../../Table/DataTable";
import { useAccountingColumns } from "../../Table/Structure/accountingColumn";
import { Input } from "../ShadCN/input";
import { Button } from "../ShadCN/button";
import useDebounce from "../../../utils/Hooks/useDebounce";

const Accounting = () => {
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const debouncedFiltering = useDebounce(filtering, 500); // Increased from 300ms to 500ms

  const columns = useAccountingColumns();

  // Always use the latest debouncedFiltering value for backend search
  const fetchAccountingData = useCallback(
    async (currentPage = 1, currentPageSize = 20, filter = debouncedFiltering) => {
      if (isTyping) return { data: [], totalPages: 0 }; // Skip fetch if user is still typing
      
      setIsLoading(true);
      try {
        // Only include pagination parameters if there's no search filter
        const params = new URLSearchParams(
          filter
            ? { search: filter } // When searching, skip pagination to get all results
            : {
                page: currentPage,
                limit: currentPageSize,
              }
        );

        const baseUrl = `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/accounting/payments`;

        const response = await axios.get(`${baseUrl}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        const json = response.data;
        
        // If we're searching, show all results without pagination
        if (filter) {
          setTotalPages(1); // Only one page when searching
          return {
            data: json.data || [],
            totalPages: 1,
          };
        }
        
        // Normal pagination when not searching
        const newTotalPages = Math.ceil((json.totalClients || 0) / currentPageSize);
        setTotalPages(newTotalPages);
        return {
          data: json.data || [],
          totalPages: newTotalPages,
        };
      } catch (err) {
        console.error("Error fetching accounting data:", err);
        return { data: [], totalPages: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedFiltering, isTyping]
  );

  useEffect(() => {
    fetchAccountingData(page, pageSize, debouncedFiltering);
  }, [page, pageSize, debouncedFiltering, fetchAccountingData]);

  const handleSearchChange = (e) => {
    setIsTyping(true);
    setFiltering(e.target.value);
    setPage(1); // Reset to first page when searching
    
    // Set a timeout slightly shorter than the debounce to indicate typing has stopped
    setTimeout(() => setIsTyping(false), 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleRefresh = () => {
    fetchAccountingData(page, pageSize, filtering);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by name, OR#/MS/GCASH numbers (e.g., 'OR# 45424', 'MS 001615', or just numbers)"
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button
          onClick={handleRefresh}
          className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
          disabled={isLoading || isTyping}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      <DataTable
        columns={columns}
        fetchFunction={fetchAccountingData}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        usePagination={!filtering} // Disable pagination when searching
        searchTerm={debouncedFiltering}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default Accounting;
