import { useState, useEffect, useCallback } from "react";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AllClient/add";
import Mailing from "../../mailing";
import { Input } from "../ShadCN/input";
import { fetchClients } from "../../Table/Data/clientdata";
import { fetchGroups } from "../../Table/Data/utilData";
import { useColumns } from "../../Table/Structure/clientColumn";
import View from "../../CRUD/AllClient/view";
import { useUser } from "../../../utils/Hooks/userProvider";
import useDebounce from "../../../utils/Hooks/useDebounce";
import FilterDropdown from "../../filterDropdown";
import { Button } from "../ShadCN/button";
import AdvancedFilter from "../../CRUD/advanceFilter";

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

  const [tableInstance, setTableInstance] = useState(null);

  const [showAdvancedFilterModal, setShowAdvancedFilterModal] = useState(false);
  const [advancedFilterData, setAdvancedFilterData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    address: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    birthdate: "",
    startDate: "",
    endDate: "",
    wmmStartSubsDate: "",
    wmmEndSubsDate: "",
    wmmStartEndDate: "",
    wmmEndEndDate: "",
    copiesRange: "",
    minCopies: "",
    maxCopies: "",
  });

  const openAdvancedFilterModal = () => setShowAdvancedFilterModal(true);
  const closeAdvancedFilterModal = () => setShowAdvancedFilterModal(false);

  const handleAdvancedFilterChange = (e) => {
    const { name, value } = e.target;
    setAdvancedFilterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdvancedFilterSubmit = () => {
    // Ensure dates are in MM/DD/YY format
    const formattedFilterData = {
      ...advancedFilterData,
      startDate: advancedFilterData.startDate
        ? new Date(advancedFilterData.startDate).toLocaleDateString("en-US")
        : "",
      endDate: advancedFilterData.endDate
        ? new Date(advancedFilterData.endDate).toLocaleDateString("en-US")
        : "",
    };

    // Send formattedFilterData to the backend
    fetchData(
      page,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      formattedFilterData
    );
    closeAdvancedFilterModal();
  };

  const handleClearAllFilters = () => {
    setFiltering("");
    setAdvancedFilterData({
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      address: "",
      contactnos: "",
      cellno: "",
      ofcno: "",
      email: "",
      birthdate: "",
      startDate: "",
      endDate: "",
      wmmStartSubsDate: "",
      wmmEndSubsDate: "",
      wmmStartEndDate: "",
      wmmEndEndDate: "",
      copiesRange: "",
      minCopies: "",
      maxCopies: "",
    });
    fetchData(page, pageSize, "", selectedGroup, {});
  };

  const fetchData = useCallback(
    async (
      currentPage,
      currentPageSize,
      filter = "",
      group = "",
      advancedFilterData = {}
    ) => {
      try {
        // Ensure we're using the current advancedFilterData from state if none provided
        const filtersToUse =
          Object.keys(advancedFilterData).length > 0
            ? advancedFilterData
            : Object.keys(advancedFilterData).length === 0 &&
              Object.keys(advancedFilterData).some(Boolean)
            ? advancedFilterData
            : {};

        const result = await fetchClients(
          currentPage,
          currentPageSize,
          filter,
          group,
          filtersToUse
        );

        setClientData(result.data);
        setTotalPages(result.totalPages || 0);
        setTotalCopies(result.totalCopies);
        setPageSpecificCopies(result.pageSpecificCopies);
        setTotalCalQty(result.totalCalQty);
        setTotalCalAmt(result.totalCalAmt);
        setPageSpecificCalQty(result.pageSpecificCalQty);
        setPageSpecificCalAmt(result.pageSpecificCalAmt);
        return result;
      } catch (error) {
        console.error("❌ Error fetching clients:", error);
      }
    },
    [advancedFilterData]
  );

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsData = await fetchGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };

    loadGroups();

    fetchData(
      page,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      advancedFilterData
    );
  }, [
    page,
    pageSize,
    debouncedFiltering,
    selectedGroup,
    fetchData,
    advancedFilterData,
  ]);

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

  const handleTableInstanceUpdate = useCallback((instance) => {
    setTableInstance(instance);
  }, []);

  const handleApplyFilter = (filterData) => {
    const formatDate = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const formattedFilterData = {
      ...filterData,
      startDate: formatDate(filterData.startDate),
      endDate: formatDate(filterData.endDate),
    };

    setAdvancedFilterData(formattedFilterData);
    setPage(1); // Reset to first page with new filters
    fetchData(
      1,
      pageSize,
      debouncedFiltering,
      selectedGroup,
      formattedFilterData
    );
  };

  return (
    <div className="mr-[10px] ml-[10px]">
      <div className="flex gap-2">
        <Add fetchClients={() => fetchClients(setClientData)} />
        <Mailing table={tableInstance} />
      </div>
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search..."
          value={filtering}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <AdvancedFilter
          onApplyFilter={handleApplyFilter}
          groups={groups}
          selectedGroup={selectedGroup}
        />
        <Button onClick={handleClearAllFilters}>Clear All Filters</Button>
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
        setTableInstance={handleTableInstanceUpdate}
        advancedFilterData={advancedFilterData}
        selectedGroup={selectedGroup}
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
