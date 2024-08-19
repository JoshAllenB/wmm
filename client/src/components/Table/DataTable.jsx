import { useState } from "react";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import HoverCard from "../UI/HoverCard";
import { useTheme } from "@mui/material";
import { useRowHandlers } from "./Features/RowHandler";
import { PaginationComponent } from "./Features/Pagination";
import { useTableLogic } from "./TableLogic";
import { useDataFetching } from "./TableDataFetch";
import { TableComponent } from "./TableComponent";
import Mailing from "../mailing";

export default function DataTable({
  columns,
  data,
  fetchFunction,
  pageSize,
  page,
  setPage,
  rowSelection,
  setRowSelection,
  usePagination = false,
  useHoverCard = false,
  enableEdit = false,
  EditComponent = null,
  onDelete = null,
}) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const {
    data: fetchedData,
    error,
    loading,
  } = useDataFetching(fetchFunction, page, pageSize);
  const tableData = data || fetchedData;

  const table = useTableLogic(
    tableData,
    columns,
    usePagination,
    page,
    pageSize,
    rowSelection,
    setRowSelection,
  );
  const {
    hoverRowMetadata,
    editRow,
    handleRowHover,
    handleRowClick,
    setHoverRowMetadata,
    setEditRow,
  } = useRowHandlers();

  const closeModal = () => {
    setShowModal(false);
    setEditRow(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!tableData || tableData.length === 0) {
    return <div>No data available</div>;
  }

  if (error) {
    console.error("Error fetching data:", error);
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <ScrollArea className="rounded-md border h-[730px] w-full">
        <TableComponent
          table={table}
          theme={theme}
          handleRowHover={handleRowHover}
          handleRowClick={handleRowClick}
          setHoverRowmetadata={setHoverRowMetadata}
        />
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {usePagination && (
        <PaginationComponent
          table={table}
          handlePreviousPage={() => setPage((prev) => Math.max(1, prev - 1))}
          handleNextPage={() => setPage((prev) => prev + 1)}
        />
      )}

      {enableEdit && editRow && EditComponent && (
        <EditComponent
          rowData={editRow}
          onDelete={onDelete}
          onClose={closeModal}
          showModal={showModal}
          setShowModal={setShowModal}
        />
      )}
      {useHoverCard && hoverRowMetadata && (
        <HoverCard
          metadata={hoverRowMetadata.metadata}
          adduser={hoverRowMetadata.adduser}
          adddate={hoverRowMetadata.adddate}
        />
      )}
      {table.getSelectedRowModel().rows.length > 0 && <Mailing table={table} />}
    </>
  );
}
