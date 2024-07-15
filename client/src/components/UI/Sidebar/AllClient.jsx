/**
 * This is the main component for displaying all clients.
 * It uses the ClientTable component to display the data,
 * and the Add component to add new clients.
 * It also includes a search input and a dropdown to change the page size.
 * Renders a component that displays all clients.
 *
 * @return {JSX.Element} The rendered component.
 */

import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import { Input } from "../ShadCN/input";
import { useTheme } from "@mui/material";

import { fetchClients } from "../../Table/Data/clientdata";
import { columns } from "../../Table/Structure/clientColumn";
import { useState, useEffect } from "react";
import Edit from "../../CRUD/AllClient/edit";

export default function AllClient() {
  const theme = useTheme();

  const [, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClients((data) => setClientData(data), page, pageSize);
  }, [page, pageSize]);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
    fetchClients(setClientData, 1, Number(e.target.value));
  };

  const handleDeleteSuccess = (deletedId) => {
    setClientData((prevData) =>
      prevData.filter((client) => client.id !== deletedId)
    );
    fetchClients((data) => setClientData(data), page, pageSize);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <Add fetchClients={() => fetchClients(setClientData)} />
      <div className="flex items-center content-center ">
        <div className="mr-2">
          <Input
            type="text"
            value={filtering}
            onChange={(e) => setFiltering(e.target.value)}
            placeholder="Search Client"
            className="w-[300px] mb-3 border-2 border-secondary"
          />
        </div>
        <div className="flex">
          <label htmlFor="pageSize" className="mr-2">
            Rows:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="text-center border-2 border-secondary bg-inherit w-[60px]"
            style={{
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="150">150</option>
          </select>
        </div>
      </div>
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
        usePagination={true}
        useHoverCard={true}
        enableRowClick={true}
        enableEdit={true}
        EditComponent={(props) => (
          <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
    </div>
  );
}
