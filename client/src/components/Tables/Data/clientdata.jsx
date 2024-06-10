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
      <div>
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
          }}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value);
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 20, // Example size
  },
  { id: "ID", Header: "ID", accessorFn: (row) => row.id, size: 50 },
  {
    id: "Name",
    Header: "Name",
    accessorFn: (row) =>
      `${row.sname} ${row.lname} ${row.fname} ${row.mname} ${row.title}`,
    size: 150,
  },
  {
    id: "Birth Date",
    Header: "Birth Date",
    accessorFn: (row) => row.bdate,
    size: 300,
  },
  {
    id: "Company",
    Header: "Company",
    accessorFn: (row) => row.company,
    size: 100,
  },
  {
    id: "Address",
    Header: "Address",
    accessorFn: (row) => {
      const { street, city, barangay, address } = row;
      const concatAddress = `${street || ""} ${city || ""} ${
        barangay || ""
      }`.trim();
      return concatAddress || address;
    },
    size: 1500,
  },
  {
    id: "Zipcode",
    Header: "Zipcode",
    accessorFn: (row) => row.zipcode,
    size: 50,
  },
  { id: "Area", Header: "Area", accessorFn: (row) => row.area, size: 100 },
  {
    id: "Area Code",
    Header: "Area Code",
    accessorFn: (row) => row.acode,
    size: 100,
  },
  {
    id: "Contact Information",
    Header: "Contact Info",
    accessorFn: (row) => `${row.contactnos} ${row.cellno} ${row.ofcno}`,
    size: 500,
  },
  { id: "Type", Header: "Type", accessorFn: (row) => row.type, size: 100 },
  { id: "Group", Header: "Group", accessorFn: (row) => row.group, size: 100 },
  {
    id: "Remarks",
    Header: "Remarks",
    accessorFn: (row) => row.remarks,
    enableResizing: true,
    size: 300, // Adjust the size as needed
  },
  {
    id: "Subscription",
    Header: "Subscription",
    accessorFn: (row) => {
      const { subscriptionFreq, subscriptionStart, subscriptionEnd, copies } =
        row;
      if (
        !subscriptionFreq &&
        !subscriptionStart &&
        !subscriptionEnd &&
        !copies
      ) {
        return "";
      }
      if (
        !subscriptionFreq ||
        !subscriptionStart ||
        !subscriptionEnd ||
        !copies
      ) {
        return "";
      }
      return `${subscriptionFreq} Months: ${subscriptionStart} ${subscriptionEnd} Copies: ${copies}`;
    },
    size: 250,
  },
];
