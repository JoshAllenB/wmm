import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Table, TableBody, TableRow, TableCell, TableHead } from "../ui/table";
import { Button } from "../ui/button";
import ArrowDropUpSharpIcon from "@mui/icons-material/ArrowDropUpSharp";
import ArrowDropDownSharpIcon from "@mui/icons-material/ArrowDropDownSharp";
import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Input } from "../ui/input";

export default function ClientTable() {
  const [clientData, setClientData] = useState([]);

  useEffect(() => {
    // Assuming you want to fetch data from the server
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get("http://localhost:3001/clients");
      console.log("response data:", response.data);
      setClientData(response.data);
    } catch (e) {
      console.error("Error fetching client data:", e);
    }
  };

  // Use clientData instead of clients directly
  const data = useMemo(() => clientData, [clientData]);
  /** @type import ('@tanstack/react-table).ColumnDef<any>*/
  const columns = [
    { id: "id", Header: "ID", accessorFn: (row) => row.id },
    {
      id: "name",
      Header: "Name",
      accessorFn: (row) =>
        `${row.sname} ${row.lname} ${row.fname} ${row.mname} ${row.title}`,
    },
    { id: "bdate", Header: "Birth Date", accessorFn: (row) => row.bdate },
    { id: "company", Header: "Company", accessorFn: (row) => row.company },
    { id: "address", Header: "Address", accessorFn: (row) => row.address },
    { id: "zipcode", Header: "Zipcode", accessorFn: (row) => row.zipcode },
    { id: "area", Header: "Area", accessorFn: (row) => row.area },
    { id: "acode", Header: "Area Code", accessorFn: (row) => row.acode },
    {
      id: "contactInfo",
      Header: "Contact Info",
      accessorFn: (row) => `${row.contactnos} ${row.cellno} ${row.ofcno}`,
    },
    { id: "type", Header: "Type", accessorFn: (row) => row.type },
    { id: "group", Header: "Group", accessorFn: (row) => row.group },
    { id: "remarks", Header: "Remarks", accessorFn: (row) => row.remarks },
    { id: "adddate", Header: "Add Date", accessorFn: (row) => row.adddate },
    { id: "adduser", Header: "Add User", accessorFn: (row) => row.adduser },
  ];

  const [sorting, setSorting] = useState([]);
  const [filtering, setFiltering] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting: sorting,
      globalFilter: filtering,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFiltering,
  });

  return (
    <div>
      <Input
        type="text"
        value={filtering}
        onChange={(e) => setFiltering(e.target.value)}
        className="w-[300px] mb-3"
      />
      <ScrollArea className="h-[750px] w-[1800px] rounded-md border p-1 overflow-x-auto cursor-pointer">
        <Table>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <>
                    {flexRender(
                      header.column.columnDef.Header,
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
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow></TableRow>
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" className="red-400" />
      </ScrollArea>
      <div className="mt-4 flex gap-2">
        <Button
          disabled={!table.getCanPreviousPage}
          onClick={() => table.previousPage()}
        >
          Previous
        </Button>
        <Button
          disabled={!table.getCanNextPage}
          onClick={() => table.nextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
