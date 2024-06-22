import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ScrollArea, ScrollBar } from "../UI/ShadCN/scroll-area";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "../UI/ShadCN/table";
import HoverCard from "../UI/HoverCard";
import { fetchClients } from "./Data/clientdata";
import { useTheme } from "@mui/material";
import ArrowDropUpSharpIcon from "@mui/icons-material/ArrowDropUpSharp";
import ArrowDropDownSharpIcon from "@mui/icons-material/ArrowDropDownSharp";
import io from "socket.io-client";
import { useRowHandlers } from "./Features/RowHandler";
import { PaginationComponent } from "./Features/Pagination";
import Edit from "../CRUD/edit";

export default function DataTable({
  columns,
  fetchData,
  pageSize,
  page,
  setPage,
  initialData = [],
  usePagination = false, // New prop to control pagination
  useHoverCard = false,
  enableEdit = false,
}) {
  const [data, setData] = useState(initialData);
  const theme = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");
  const [rowSelection, setRowSelection] = useState([]);
  const [error, setError] = useState(null);

  const {
    hoverRowMetadata,
    selectedRow,
    handleRowHover,
    handleRowClick,
    setHoverRowMetadata,
    setSelectedRow,
  } = useRowHandlers();

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {});

    socket.on("data-update", (data) => {
      handleDataUpdate(data);
    });

    socket.on("user_status_change", ({ userId, status }) => {
      setData((prevData) =>
        prevData.map((user) =>
          user._id === userId ? { ...user, status: { status } } : user
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchDataAsync = async () => {
      setError(null);
      try {
        await fetchData(setData, page, pageSize);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchDataAsync();
  }, [page, pageSize]);

  const handleDataUpdate = (data) => {
    setData((prevData) => {
      switch (data.type) {
        case "add":
          return [...prevData, data.data];
        case "update":
          return prevData.map((client) =>
            client.id === data.data.id ? data.data : client
          );
        case "delete":
          return prevData.filter((client) => client.id !== data.data.id);
        case "init":
          return data.data;
        default:
          return prevData;
      }
    });
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(usePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      globalFilter: filtering,
      ...(usePagination
        ? { pagination: { pageIndex: page - 1, pageSize } }
        : {}),
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
      fetchClients(setData, page - 1, pageSize);
    }
  };

  const handleNextPage = () => {
    setPage(page + 1);
    fetchClients(setData, page + 1, pageSize);
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <>
      <ScrollArea className="rounded-md border h-[730px] w-full ">
        <Table>
          <TableHeader
            className={
              theme.palette.mode === "dark" ? "bg-gray-700" : "bg-gray-400"
            }
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`sticky top-0 ${
                      theme.palette.mode === "dark"
                        ? "bg-gray-700"
                        : "bg-gray-400"
                    }`}
                  >
                    <>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && (
                        <ArrowDropUpSharpIcon />
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <ArrowDropDownSharpIcon />
                      )}
                    </>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    theme.palette.mode === "dark"
                      ? "hover:bg-gray-600 cursor-pointer"
                      : "hover:bg-gray-300 cursor-pointer"
                  }
                  onMouseEnter={() => handleRowHover(row)}
                  onMouseLeave={() => setHoverRowMetadata(null)}
                  onClick={() => handleRowClick(row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.columnDef.size }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {usePagination && (
        <PaginationComponent
          table={table}
          handlePreviousPage={handlePreviousPage}
          handleNextPage={handleNextPage}
        />
      )}

      {enableEdit && selectedRow && (
        <Edit
          rowData={selectedRow}
          onDelete={(id) => setData(data.filter((d) => d.id !== id))}
          onClose={() => {
            setSelectedRow(null);
            setShowModal(false);
          }}
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
    </>
  );
}
