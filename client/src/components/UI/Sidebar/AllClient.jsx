import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import { Input } from "../ShadCN/input";

import { fetchClients } from "../../Table/Data/clientdata";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";
import useDebounce from "../../../utils/Hooks/useDebounce";

const AllClient = React.memo(() => {
  const [clientData, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const debouncedFiltering = useDebounce(filtering, 300);
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCopies, setTotalCopies] = useState(0);
  const [pageSpecificCopies, setPageSpecificCopies] = useState(0);
  const [totalCalQty, setTotalCalQty] = useState(0);
  const [totalCalAmt, setTotalCalAmt] = useState(0);
  const [pageSpecificCalQty, setPageSpecificCalQty] = useState(0);
  const [pageSpecificCalAmt, setPageSpecificCalAmt] = useState(0);
  const columns = useColumns();
  const { hasRole } = useUser();

  const fetchData = useCallback(
    async (currentPage, currentPageSize, filter = "") => {
      try {
        const result = await fetchClients(currentPage, currentPageSize, filter);
        console.log("AllClient - Received result:", result);
        setClientData(result.data);
        setTotalPages(result.totalPages);
        setTotalCopies(result.totalCopies);
        setPageSpecificCopies(result.pageSpecificCopies);
        setTotalCalQty(result.totalCalQty);
        setTotalCalAmt(result.totalCalAmt);
        setPageSpecificCalQty(result.pageSpecificCalQty);
        setPageSpecificCalAmt(result.pageSpecificCalAmt);
        return result;
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(page, pageSize, debouncedFiltering);
  }, [debouncedFiltering, page, pageSize, fetchData]);

  const handleDeleteSuccess = useCallback(
    (deletedId) => {
      setClientData((prevData) =>
        prevData.filter((client) => client.id !== deletedId)
      );
      fetchClients((data) => setClientData(data), page, pageSize);
    },
    [page, pageSize]
  );

  const memoizedAdd = useMemo(
    () => <Add fetchClients={() => fetchClients(setClientData)} />,
    []
  );

  const memoizedDataTable = useMemo(
    () => (
      <DataTable
        columns={columns}
        data={clientData}
        fetchFunction={fetchData}
        initialPageSize={pageSize}
        initialPage={page}
        totalPages={totalPages}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        usePagination={true}
        useHoverCard={false}
        ViewComponent={View}
        totalCopies={totalCopies}
        pageSpecificCopies={pageSpecificCopies}
        totalCalQty={totalCalQty}
        totalCalAmt={totalCalAmt}
        pageSpecificCalQty={pageSpecificCalQty}
        pageSpecificCalAmt={pageSpecificCalAmt}
        userRole={hasRole("WMM") ? "WMM" : "CAL"}
        searchTerm={debouncedFiltering}
      />
    ),
    [
      columns,
      clientData,
      fetchData,
      pageSize,
      page,
      totalPages,
      rowSelection,
      totalCopies,
      pageSpecificCopies,
      totalCalQty,
      totalCalAmt,
      pageSpecificCalQty,
      pageSpecificCalAmt,
      handleDeleteSuccess,
      hasRole,
      filtering,
    ]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFiltering(value);
    setPage(1);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      {memoizedAdd}
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>
      {memoizedDataTable}
    </div>
  );
});

AllClient.displayName = "AllClient";

export default AllClient;
