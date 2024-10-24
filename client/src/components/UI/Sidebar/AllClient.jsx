/**
 * This is the main component for displaying all clients.
 * It uses the ClientTable component to display the data,
 * and the Add component to add new clients.
 * It also includes a search input and a dropdown to change the page size.
 * Renders a component that displays all clients.
 *
 * @return {JSX.Element} The rendered component.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import { Input } from "../ShadCN/input";

import { fetchClients } from "../../Table/Data/clientdata";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";

const AllClient = React.memo(() => {
  const [, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const columns = useColumns();

  const fetchData = useCallback(async () => {
    try {
      const { totalPages } = await fetchClients(
        setClientData,
        page,
        pageSize,
        filtering
      );
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, [page, pageSize, filtering]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const memoizedInput = useMemo(
    () => (
      <Input
        type="text"
        value={filtering}
        onChange={(e) => setFiltering(e.target.value)}
        placeholder="Search Client"
        className="w-[300px] mb-3 border-2 border-secondary"
      />
    ),
    [filtering]
  );

  const memoizedDataTable = useMemo(
    () => (
      <DataTable
        fetchFunction={fetchClients}
        columns={columns}
        filtering={filtering}
        setFiltering={setFiltering}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        pageSize={pageSize}
        setPageSize={setPageSize}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        usePagination={true}
        useHoverCard={true}
        enableRowClick={true}
        enableEdit={true}
        ViewComponent={(props) => (
          <View {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
    ),
    [
      columns,
      filtering,
      rowSelection,
      pageSize,
      page,
      totalPages,
      handleDeleteSuccess,
    ]
  );

  return (
    <div className="mr-[10px] ml-[10px]">
      {memoizedAdd}
      <div className="flex items-center content-center">
        <div className="mr-2">{memoizedInput}</div>
      </div>
      {memoizedDataTable}
    </div>
  );
});

AllClient.displayName = "AllClient";

export default AllClient;
