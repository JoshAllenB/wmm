import { Checkbox } from "../../UI/ShadCN/checkbox";
import { useUser } from "../../../utils/Hooks/userProvider";

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const useColumns = () => {
  const { hasRole } = useUser();

  const baseColumns = [
    {
      id: "select",
      toggleable: false,
      header: ({ table }) => (
        <div className="flex">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
            }}
            aria-label="Select all"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex px-4">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    { id: "ID", Header: "ID", accessorFn: (row) => row.id, size: 50 },
    {
      id: "Client Name",
      Header: "Client Name",
      accessorFn: (row) =>
        `${row.title || ""} ${row.sname || ""} ${row.lname || ""} ${
          row.fname || ""
        } ${row.mname || ""}`.trim(),
      size: 200,
    },
    {
      id: "Address",
      Header: "Address",
      accessorFn: (row) =>
        `${row.address || ""}, ${row.street || ""}, ${row.city || ""}, ${
          row.barangay || ""
        }`.replace(/^[,\s]+|[,\s]+$/g, ""),
      size: 500,
    },
    {
      id: "Contact Info",
      Header: "Contact Info",
      accessorFn: (row) =>
        [
          row.contactnos && `Phone: ${row.contactnos}`,
          row.cellno && `Cell: ${row.cellno}`,
          row.ofcno && `Office: ${row.ofcno}`,
          row.email && `Email: ${row.email}`,
        ]
          .filter(Boolean)
          .join(", "),
      size: 250,
    },
    {
      id: "Services",
      Header: "Services",
      accessorFn: (row) => {
        const services = row.services || [];
        return services.map((service) => service.toLowerCase());
      },
      cell: ({ getValue }) => {
        const services = getValue();
        return services.join(", ");
      },
      size: 50,
    },
  ];

  const roleSpecificColumns = [
    ...(hasRole("WMM")
      ? [
          {
            id: "Subscription",
            Header: "Subscription",
            accessorFn: (row) => {
              const subscriptionData = row.wmmData || [];

              // Sort subscriptionData by subsdate in descending order (most recent first)
              return [...subscriptionData]
                .sort((a, b) => {
                  const dateA = new Date(a.subsdate || 0);
                  const dateB = new Date(b.subsdate || 0);
                  return dateB - dateA;
                })
                .map((subscription) => {
                  let { subsdate, enddate, copies, subsclass } = subscription;

                  if (subsdate) {
                    subsdate = `${new Date(subsdate).toLocaleDateString("en-US")}`;
                  } else {
                    subsdate = "N/A";
                  }

                  if (enddate) {
                    enddate = `${new Date(enddate).toLocaleDateString("en-US")}`;
                  } else {
                    enddate = "N/A";
                  }

                  return {
                    subsclass,
                    subsdate,
                    enddate,
                    copies: `${copies || "N/A"}`,
                  };
                });
            },
            size: 650,
          },
        ]
      : []),
    ...(hasRole("HRG")
      ? [
          {
            id: "HRG Data",
            Header: "HRG Data",
            accessorFn: (row) => {
              const hrgData = row.hrgData || [];

              // Convert the array of objects to a more readable format
              return hrgData.map((hrgItem) => {
                let {
                  recvdate,
                  renewdate,
                  campaigndate,
                  paymtref,
                  paymtamt,
                  unsubscribe,
                } = hrgItem;

                recvdate = recvdate
                  ? `Received: ${new Date(recvdate).toLocaleDateString(
                      "en-US"
                    )}`
                  : "";

                renewdate = renewdate
                  ? `Renew Date: ${new Date(renewdate).toLocaleDateString(
                      "en-US"
                    )}`
                  : "";

                unsubscribe = unsubscribe ? "Unsubscribed" : "Active";

                return {
                  recvdate,
                  renewdate,
                  campaigndate,
                  paymtref,
                  paymtamt,
                  unsubscribe,
                };
              });
            },
            size: 250,
          },
          {
            id: "FOM Data",
            Header: "FOM Data",
            accessorFn: (row) => {
              const fomData = row.fomData || [];

              return fomData.map((fomItem) => {
                let {
                  recvdate,
                  remarks,
                  paymtamt,
                  unsubscribe,
                  adddate,
                  adduser,
                } = fomItem;

                recvdate = recvdate
                  ? `${new Date(recvdate).toLocaleDateString("en-US")}`
                  : "N/A";

                paymtamt = paymtamt ? `Php ${paymtamt}` : "N/A";

                unsubscribe = unsubscribe ? "Unsubscribed" : "Active";

                adddate = adddate
                  ? `${new Date(adddate).toLocaleDateString("en-US")}`
                  : "N/A";

                return {
                  recvdate,
                  remarks,
                  paymtamt,
                  unsubscribe,
                  adddate,
                };
              });
            },
            size: 250,
          },
          {
            id: "CAL Data",
            Header: "CAL Data",
            accessorFn: (row) => {
              const calData = row.calData || [];

              return calData.map((calItem) => {
                let {
                  recvdate,
                  caltype,
                  calqty,
                  calamt,
                  paymtref,
                  paymtamt,
                  paymtform,
                  paymtdate,
                  adddate,
                  adduser,
                } = calItem;

                recvdate = recvdate
                  ? `${new Date(recvdate).toLocaleDateString("en-US")}`
                  : "N/A";

                paymtdate = paymtdate
                  ? `${new Date(paymtdate).toLocaleDateString("en-US")}`
                  : "N/A";

                adddate = adddate
                  ? `${new Date(adddate).toLocaleDateString("en-US")}`
                  : "N/A";

                return {
                  recvdate,
                  caltype,
                  calqty,
                  calamt,
                  paymtref,
                  paymtamt,
                  paymtform,
                  paymtdate,
                  adddate,
                  adduser,
                };
              });
            },
            size: 250,
          },
        ]
      : []),
    {
      id: "Added Info",
      Header: "Added Info",
      accessorFn: (row) =>
        `By: ${row.adduser || "N/A"}, Date: ${row.adddate || "N/A"}`,
      size: 300,
    },
  ];

  return [...baseColumns, ...roleSpecificColumns.flat()];
};
