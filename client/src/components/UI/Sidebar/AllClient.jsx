import { useState, useEffect, useCallback } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import { Input } from "../ShadCN/input";
import { fetchClients } from "../../Table/Data/clientdata";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";
import useDebounce from "../../../utils/Hooks/useDebounce";
import FilterDropdown from "../../filterDropdown";
import axios from "axios";

const AllClient = () => {
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

  // State for selected row and modal visibility
  const [selectedRow, setSelectedRow] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3001/clients/groups",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setGroups(response.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, []);

  const fetchData = useCallback(
    async (currentPage, currentPageSize, filter = "", group = "") => {
      try {
        const result = await fetchClients(
          currentPage,
          currentPageSize,
          filter,
          group
        );
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
    fetchData(page, pageSize, debouncedFiltering, selectedGroup);
  }, [debouncedFiltering, page, pageSize, fetchData, selectedGroup]);

  const handleDeleteSuccess = useCallback(
    (deletedId) => {
      setClientData((prevData) =>
        prevData.filter((client) => client.id !== deletedId)
      );
      fetchClients((data) => setClientData(data), page, pageSize);
    },
    [page, pageSize]
  );

  const handleRowClick = (event, row) => {
    setSelectedRow(row.original); // Set the selected row data
    setShowViewModal(true); // Show the View component
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setSelectedRow(null);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFiltering(value);
    setPage(1);
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <Add fetchClients={() => fetchClients(setClientData)} />
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search..."
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <FilterDropdown
          groups={groups}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          setPage={setPage}
        />
      </div>
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
        handleRowClick={handleRowClick}
      />
      {showViewModal && (
        <View
          rowData={selectedRow}
          onClose={handleViewClose}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

AllClient.displayName = "AllClient";

export default AllClient;
