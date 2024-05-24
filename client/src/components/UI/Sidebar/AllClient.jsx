/**
 * This is the main component for displaying all clients.
 * It uses the ClientTable component to display the data,
 * and the Add component to add new clients.
 * It also includes a search input and a dropdown to change the page size.
 *
 */

import ClientTable from "@/components/Tables/clienttable";
import Add from "@/components/add";
import { Input } from "../ShadCN/input";
import { useTheme } from "@mui/material";

import { columns, fetchClients } from "@/components/Tables/Data/clientdata";
import { useState, useEffect } from "react";

export default function AllClient() {
  const theme = useTheme();

  const [clientData, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClients(setClientData, page, pageSize);
  }, [page, pageSize]);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
    fetchClients(setClientData, 1, Number(e.target.value));
  };
  return (
    <div className="m-[30px]">
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
            className="border-2 border-secondary bg-inherit w-[60px]"
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
      <ClientTable
        data={clientData}
        columns={columns}
        filtering={filtering}
        setFiltering={setFiltering}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        pageSize={pageSize}
        setPageSize={setPageSize}
        page={page}
        setPage={setPage}
      />
    </div>
  );
}
