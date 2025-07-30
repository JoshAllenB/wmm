import { useState, useCallback, useEffect } from "react";
import { Button } from "../ShadCN/button";
import { Input } from "../ShadCN/input";
import DataTable from "../../Table/DataTable";
import { useDonorColumns } from "../../Table/Structure/donorColumn";
import { getDonorRecipientData } from "../../Table/Data/donorData";
import useDebounce from "../../../utils/Hooks/useDebounce";

const Donor = () => {
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([{ id: "DonorName", desc: false }]);

  const columns = useDonorColumns();
  
  // Debounce the search term
  const debouncedSearchTerm = useDebounce(filtering, 500);

  const handleFetch = useCallback(
    async (page, pageSize, searchTerm) => {
      setIsLoading(true);
      try {
        // Fetch donor data with pagination and search
        const response = await getDonorRecipientData({
          page,
          pageSize,
          searchTerm: searchTerm || debouncedSearchTerm,
          sorting: sorting[0],
        });

        setData(response.data);
        setTotalPages(response.totalPages);
        setTotalRecords(response.totalRecords);

        return response;
      } catch (error) {
        console.error("Error fetching donor data:", error);
        return { data: [], totalPages: 0, totalRecords: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [sorting, debouncedSearchTerm]
  );

  // Memoize the search handler to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e) => {
    setFiltering(e.target.value);
  }, []);

  // Memoize the refresh handler
  const handleRefresh = useCallback(() => {
    handleFetch(1, pageSize);
  }, [pageSize, handleFetch]);

  // Effect to trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== filtering) {
      setPage(1); // Reset to first page when searching
      handleFetch(1, pageSize, debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, pageSize, handleFetch]);

  return (
    <div className="mr-[10px] ml-[10px] mt-[10px]">
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search by Client ID, donor name, or company"
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
      </div>

      <DataTable
        columns={columns}
        data={data}
        fetchFunction={handleFetch}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        usePagination={true}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting={true}
      />

      {data.length > 0 && (
        <div className="text-sm text-gray-600 self-center whitespace-nowrap">
          Showing {data.length} of {totalRecords} records
        </div>
      )}
    </div>
  );
};

export default Donor;
