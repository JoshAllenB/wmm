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

import { fetchClients } from "../../Table/Data/clientdata";
import { useColumns } from "../../Table/Structure/clientColumn";
import { useState, useEffect } from "react";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";

export default function AllClient() {
  const [, setClientData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const columns = useColumns();

  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, [page, pageSize, filtering]);

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
        totalPages={totalPages}
        usePagination={true}
        useHoverCard={true}
        enableRowClick={true}
        enableEdit={true}
        ViewComponent={(props) => (
          <View {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
    </div>
  );
}
