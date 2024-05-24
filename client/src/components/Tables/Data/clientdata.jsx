import axios from "axios";
import { Checkbox } from "../../UI/ShadCN/checkbox";

export const clientData = []; // Initialize as empty array

export const fetchClients = async (setClientData, page = 1) => {
  try {
    let allClients = [];

    const response = await axios.get(
      `http://localhost:3001/clients?page=${page}`
    );
    allClients = [...allClients, ...response.data];
    page++;

    setClientData(allClients);
  } catch (e) {
    console.error("Error fetching client data:", e);
  }
};

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
  {
    id: "Subscription",
    Header: "Subscription",
    accessorFn: (row) =>
      `${row.subscriptionFreq} Months: ${row.subscriptionStart} ${row.subscriptionEnd} Copies: ${row.copies}`,
  },
];
