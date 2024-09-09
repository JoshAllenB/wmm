import { Checkbox } from "../../UI/ShadCN/checkbox";

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="checkbox-cell">
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
      <div className="checkbox-cell">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 10,
  },
  { id: "ID", Header: "ID", accessorFn: (row) => row.id, size: 50 },
  {
    id: "Name",
    Header: "Name",
    accessorFn: (row) =>
      `${row.title || ""} ${row.sname || ""} ${row.lname || ""} ${row.fname || ""} ${row.mname || ""}`,
    size: 350,
  },
  // {
  //   id: "Birth Date",
  //   Header: "Birth Date",
  //   accessorFn: (row) => row.bdate,
  //   size: 300,
  // },
  // {
  //   id: "Company",
  //   Header: "Company",
  //   accessorFn: (row) => row.company,
  //   size: 100,
  // },
  // {
  //   id: "Address",
  //   Header: "Address",
  //   accessorFn: (row) => {
  //     const { street, city, barangay, address } = row;
  //     const concatAddress = `${street || ""} ${city || ""} ${
  //       barangay || ""
  //     }`.trim();
  //     return concatAddress || address;
  //   },
  //   size: 1500,
  // },
  {
    id: "Zipcode",
    Header: "Zipcode",
    accessorFn: (row) => row.zipcode,
    size: 20,
  },
  {
    id: "Area",
    Header: "Area",
    accessorFn: (row) => `${row.area} (${row.acode})`,
    size: 250,
  },
  // {
  //   id: "Area Code",
  //   Header: "Area Code",
  //   accessorFn: (row) => row.acode,
  //   size: 100,
  // },
  // {
  //   id: "Contact Information",
  //   Header: "Contact Info",
  //   accessorFn: (row) =>
  //     `${row.contactnos || ""} ${row.cellno || ""} ${row.ofcno || ""}`,
  //   size: 500,
  // },
  { id: "Type", Header: "Type", accessorFn: (row) => row.type, size: 100 },
  { id: "Group", Header: "Group", accessorFn: (row) => row.group, size: 100 },
  {
    id: "Remarks",
    Header: "Remarks",
    accessorFn: (row) => row.remarks,
    enableResizing: true,
    size: 200, // Adjust the size as needed
  },
  {
    id: "Subscription",
    Header: "Subscription",
    accessorFn: (row) => {
      const subscriptionData = row.wmmData || [];

      return subscriptionData.map((subscription) => {
        let { subsdate, enddate, copies } = subscription;

        if (subsdate) {
          subsdate = `Start Date: ${new Date(subsdate).toLocaleDateString("en-US")}`;
        } else {
          subsdate = "N/A";
        }

        if (enddate) {
          enddate = `End Date: ${new Date(enddate).toLocaleDateString("en-US")}`;
        } else {
          enddate = "N/A";
        }

        return { subsdate, enddate, copies: `Copies: ${copies || "N/A"}` }; // Return as an object
      });
    },
    size: 650,
  },
];
