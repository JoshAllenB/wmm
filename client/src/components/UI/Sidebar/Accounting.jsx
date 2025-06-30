import { useState, useCallback } from "react";
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
  const debouncedFiltering = useDebounce(filtering, 300); // Add debouncing with 300ms delay

  const columns = useAccountingColumns();

  const fetchAccountingData = useCallback(
    async (currentPage = 1, currentPageSize = 20, filter = "") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: currentPageSize,
          ...(filter ? { search: filter } : {}),
        });
        const baseUrl = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/accounting/payments`;
        
        const response = await axios.get(`${baseUrl}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          }
        });

        const json = response.data;
        console.log(json);
        setTotalPages(Math.ceil((json.totalClients || 0) / currentPageSize));
        return {
          data: json.data || [],
          totalPages: Math.ceil((json.totalClients || 0) / currentPageSize),
        };
      } catch (err) {
        console.error("Error fetching accounting data:", err);
        return { data: [], totalPages: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSearchChange = (e) => {
    setFiltering(e.target.value);
    setPage(1); // Reset to first page when searching
    console.log(filtering);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
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
          onClick={() => fetchAccountingData(page, pageSize, filtering)}
          className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
          disabled={isLoading}
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
        usePagination={true}
        searchTerm={debouncedFiltering}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
};

export default Accounting;
