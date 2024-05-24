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
  { id: "ID", Header: "ID", accessorFn: (row) => row.id },
  {
    id: "Name",
    Header: "Name",
    accessorFn: (row) =>
      `${row.sname} ${row.lname} ${row.fname} ${row.mname} ${row.title}`,
  },
  { id: "Birth Date", Header: "Birth Date", accessorFn: (row) => row.bdate },
  { id: "Company", Header: "Company", accessorFn: (row) => row.company },
  { id: "Address", Header: "Address", accessorFn: (row) => row.address },
  { id: "Zipcode", Header: "Zipcode", accessorFn: (row) => row.zipcode },
  { id: "Area", Header: "Area", accessorFn: (row) => row.area },
  { id: "Area Code", Header: "Area Code", accessorFn: (row) => row.acode },
  {
    id: "Contact Information",
    Header: "Contact Info",
    accessorFn: (row) => `${row.contactnos} ${row.cellno} ${row.ofcno}`,
  },
  { id: "Type", Header: "Type", accessorFn: (row) => row.type },
  { id: "Group", Header: "Group", accessorFn: (row) => row.group },
  { id: "Remarks", Header: "Remarks", accessorFn: (row) => row.remarks },
  {
    id: "Subscription",
    Header: "Subscription",
    accessorFn: (row) => {
      const { subscriptionFreq, subscriptionStart, subscriptionEnd, copies } =
        row;

      // Check if all data is missing
      if (
        !subscriptionFreq &&
        !subscriptionStart &&
        !subscriptionEnd &&
        !copies
      ) {
        return "";
      }

      // Check if any data is missing and return empty string if true
      if (
        !subscriptionFreq ||
        !subscriptionStart ||
        !subscriptionEnd ||
        !copies
      ) {
        return "";
      }

      // Return formatted string if all data is present
      return `${subscriptionFreq} Months: ${subscriptionStart} ${subscriptionEnd} Copies: ${copies}`;
    },
  },
];
