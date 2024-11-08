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
  initialPageSize = 20,
  initialPage = 1,
  totalPages,
  rowSelection,
  setRowSelection,
  usePagination = false,
  useHoverCard = false,
  enableEdit = false,
  ViewComponent = null,
  EditComponent = null,
  onDelete = null,
}) {
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

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


  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  }

  const handleNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }

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
          totalPages={totalPages}
          handlePreviousPage={handlePreviousPage}
          handleNextPage={handleNextPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          page={page}
          setPage={setPage}
        />
      )}

      { editRow && ViewComponent && (
        <ViewComponent
          rowData={editRow}
          onDelete={onDelete}
          onClose={closeModal}
          showModal={showModal}
          setShowModal={setShowModal}
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
