import { useState, useCallback, useEffect, useMemo } from "react";
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
  const [data, setData] = useState([]);
  const [lastQuery, setLastQuery] = useState(null);
  const [sorting, setSorting] = useState([{ id: "Date", desc: true }]);
  const debouncedFiltering = useDebounce(filtering, 500);

  const columns = useAccountingColumns();

  // Memoize the axios instance with auth headers
  const axiosInstance = useMemo(() => {
    return axios.create({
      baseURL: `http://${import.meta.env.VITE_IP_ADDRESS}:3001`,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
  }, []);

  // Function to check if the query parameters have changed
  const hasQueryChanged = useCallback((newParams) => {
    if (!lastQuery) return true;
    
    return (
      newParams.page !== lastQuery.page ||
      newParams.pageSize !== lastQuery.pageSize ||
      newParams.filter !== lastQuery.filter ||
      newParams.sort !== lastQuery.sort ||
      newParams.order !== lastQuery.order
    );
  }, [lastQuery]);

  // Separate data fetching from state updates
  const fetchAccountingData = useCallback(
    async (currentPage = 1, currentPageSize = 20, filter = debouncedFiltering) => {
      // Get current sort settings
      const currentSort = sorting[0] || { id: "Date", desc: true };
      const sortField = currentSort.id === "Date" ? "adddate" : currentSort.id.toLowerCase();
      const sortOrder = currentSort.desc ? "desc" : "asc";

      // Create query parameters object
      const queryParams = { 
        page: currentPage, 
        pageSize: currentPageSize, 
        filter,
        sort: sortField,
        order: sortOrder
      };
      
      // Check if this query is different from the last one
      if (!hasQueryChanged(queryParams)) {
        return {
          data: data,
          totalPages,
          totalClients: data.length,
          totalPayments: data.length
        };
      }

      setIsLoading(true);
      try {
        const params = new URLSearchParams(
          filter
            ? { 
                search: filter,
                sort: sortField,
                order: sortOrder
              }
            : {
                page: currentPage,
                limit: currentPageSize,
                sort: sortField,
                order: sortOrder
              }
        );

        const response = await axiosInstance.get(
          `/accounting/payments?${params.toString()}`
        );

        const json = response.data;
        const newTotalPages = Math.ceil((json.totalClients || 0) / currentPageSize);
        
        // Update last query after successful fetch
        setLastQuery(queryParams);
        setData(json.data || []);
        setTotalPages(newTotalPages);
        
        return {
          data: json.data || [],
          totalPages: newTotalPages,
          totalClients: json.totalClients,
          totalPayments: json.totalPayments
        };
      } catch (err) {
        console.error("Error fetching accounting data:", err);
        setData([]);
        setTotalPages(0);
        return { data: [], totalPages: 0, totalClients: 0, totalPayments: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedFiltering, axiosInstance, hasQueryChanged, data, totalPages, sorting]
  );

  // Use effect for search changes
  useEffect(() => {
    if (debouncedFiltering !== undefined) {
      fetchAccountingData(1, pageSize, debouncedFiltering);
    }
  }, [debouncedFiltering, pageSize, fetchAccountingData]);

  // Separate effect for pagination changes
  useEffect(() => {
    if (!filtering && page !== 1) {
      fetchAccountingData(page, pageSize);
    }
  }, [page, pageSize, filtering, fetchAccountingData]);

  // Effect for sorting changes
  useEffect(() => {
    fetchAccountingData(page, pageSize, filtering);
  }, [sorting]);

  const handleSearchChange = (e) => {
    const newValue = e.target.value;
    setFiltering(newValue);
    if (newValue === "") {
      setPage(1);
      fetchAccountingData(1, pageSize, "");
    }
  };

  const handlePageChange = (newPage) => {
    if (!filtering) {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleRefresh = () => {
    setLastQuery(null); // Force a refresh by clearing the last query
    fetchAccountingData(page, pageSize, filtering);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
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
        <Button
          onClick={handleRefresh}
          className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        fetchFunction={fetchAccountingData}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        usePagination={!filtering}
        searchTerm={debouncedFiltering}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting={true}
      />
    </div>
  );
};

export default Accounting;
