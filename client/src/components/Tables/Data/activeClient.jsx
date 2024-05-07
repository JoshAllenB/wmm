import axios from "axios";

export const fetchRecentClients = async (setClients) => {
  try {
    const response = await axios.get(`http://localhost:3001/clients`);
    const recentlyAddedClients = response.data;
    setClients(recentlyAddedClients);
  } catch (error) {
    console.error("Error fetching recently added clients:", error);
  }
};

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const columns = [
  { id: "id", Header: "ID", accessorFn: (row) => row.id },
  {
    id: "Name",
    Header: "Name",
    accessorFn: (row) =>
      `${row.title} ${row.lname} ${row.fname} ${row.mname} ${row.sname} `,
  },
  { id: "bdate", Header: "Birth Date", accessorFn: (row) => row.bdate },
  { id: "company", Header: "Company", accessorFn: (row) => row.company },
  { id: "address", Header: "Address", accessorFn: (row) => row.address },
  { id: "zipcode", Header: "Zipcode", accessorFn: (row) => row.zipcode },
  { id: "area", Header: "Area", accessorFn: (row) => row.area },
  { id: "acode", Header: "Area Code", accessorFn: (row) => row.acode },
  {
    id: "ContactInfo",
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
