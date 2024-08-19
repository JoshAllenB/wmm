import DataTable from "../../Table/DataTable";
// import { useTheme } from "@emotion/react";
import { columns } from "../../Table/Structure/hrgColumn";
import { useState, useEffect } from "react";
import { fetchHrg } from "../../Table/Data/hrgdata";
import Add from "../../CRUD/HRG/add";
import Edit from "../../CRUD/HRG/edit";
import { Input } from "../ShadCN/input";

export default function Hrg() {
  // const theme = useTheme();

  const [hrgData, setHrgData] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [rowSelection, setRowSelection] = useState({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchHrg(setHrgData, page, pageSize);
  }, [page, pageSize]);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
    setRowSelection({});
    fetchHrg(setHrgData, 1, Number(e.target.value));
  };

  const handleDeleteSuccess = (deletedId) => {
    setHrgData((prevData) => prevData.filter((hrg) => hrg.id !== deletedId));
    fetchHrg(setHrgData, page, pageSize);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <Add fetchHrg={() => fetchHrg(setHrgData)} />
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
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={150}>150</option>
          </select>
        </div>
      </div>
      <div>
        <DataTable
          data={hrgData}
          fetchFunction={fetchHrg}
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
          useHoverCard={false}
          enableRowClick={true}
          enableEdit={true}
          EditComponent={(props) => {
            return <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />;
          }}
        />
      </div>
    </div>
  );
}
