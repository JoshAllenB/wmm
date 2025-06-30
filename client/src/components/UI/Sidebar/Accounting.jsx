import { useState, useCallback } from "react";
import DataTable from "../../Table/DataTable";
import { useAccountingColumns } from "../../Table/Structure/accountingColumn";
import { Input } from "../ShadCN/input";
import { Button } from "../ShadCN/button";

const Accounting = () => {
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const columns = useAccountingColumns();

  // Only provide fetch function, let DataTable manage data state
  const fetchAccountingData = useCallback(
    async (currentPage = 1, currentPageSize = 20, filter = "") => {
      try {
        const params = new URLSearchParams({
          page: currentPage,
          limit: currentPageSize,
          ...(filter ? { search: filter } : {}),
        });
        const res = await fetch(`/accounting/payments?${params.toString()}`);
        const json = await res.json();
        return {
          data: json.data || [],
          totalPages: Math.ceil((json.totalClients || 0) / currentPageSize),
        };
      } catch (err) {
        return { data: [], totalPages: 0 };
      }
    },
    []
  );

  const handleSearchChange = (e) => {
    setFiltering(e.target.value);
    setPage(1);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by client, company, or payment ref"
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button
          onClick={() => fetchAccountingData(page, pageSize, filtering)}
          className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
        >
          Refresh
        </Button>
      </div>
      <DataTable
        columns={columns}
        fetchFunction={fetchAccountingData}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={undefined}
        usePagination={true}
        searchTerm={filtering}
      />
    </div>
  );
};

export default Accounting;
