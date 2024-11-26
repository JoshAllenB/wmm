import { Checkbox } from "../../UI/ShadCN/checkbox";
import { useUser } from "../../../utils/Hooks/userProvider";

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const useColumns = () => {
  const { hasRole } = useUser();

  const baseColumns = [
    { id: "ID", Header: "ID", accessorFn: (row) => row.id, size: 50 },
    {
      id: "Client Name",
      Header: "Client Name",
      accessorFn: (row) => `${row.title || ""} ${row.sname || ""} ${row.lname || ""} ${row.fname || ""} ${row.mname || ""}`.trim(),
      size: 200,
    },
    {
      id: "Address",
      Header: "Address",
      accessorFn: (row) => `${row.address || ""}, ${row.street || ""}, ${row.city || ""}, ${row.barangay || ""}`.replace(/^[,\s]+|[,\s]+$/g, ""),
      size: 300,
    },
    {
      id: "Contact Info",
      Header: "Contact Info",
      accessorFn: (row) => [
        row.contactnos && `Phone: ${row.contactnos}`,
        row.cellno && `Cell: ${row.cellno}`,
        row.ofcno && `Office: ${row.ofcno}`,
        row.email && `Email: ${row.email}`,
      ].filter(Boolean).join(", "),
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
      size: 200,
    },
  ];

  const roleSpecificColumns = [
    ...(hasRole("WMM")
      ? [
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
                  subsdate = `Start Date: ${new Date(
                    subsdate
                  ).toLocaleDateString("en-US")}`;
                } else {
                  subsdate = "N/A";
                }

                if (enddate) {
                  enddate = `End Date: ${new Date(enddate).toLocaleDateString(
                    "en-US"
                  )}`;
                } else {
                  enddate = "N/A";
                }

                return {
                  subsdate,
                  enddate,
                  copies: `Copies: ${copies || "N/A"}`,
                }; // Return as an object
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

                paymtamt = paymtamt ? `Payment Amount: ${paymtamt}` : "";

                unsubscribe = unsubscribe ? "Subscribed" : "Active";

                return {
                  recvdate,
                  renewdate,
                  campaigndate,
                  paymtref: `Payment Referrence: ${paymtref || ""}`,
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

                paymtamt = paymtamt ? `Payment Amount: ${paymtamt}` : "N/A";

                unsubscribe = unsubscribe ? "Subscription" : "Active";

                adddate = adddate
                  ? `${new Date(adddate).toLocaleDateString("en-US")}`
                  : "N/A";

                return {
                  recvdate,
                  remarks: ` ${remarks || "N/A"}`,
                  paymtamt,
                  unsubscribe,
                  adddate,
                  adduser: `${adduser || "N/A"}`,
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
                  caltype: `${caltype || "N/A"}`,
                  calqty: `${calqty || "N/A"}`,
                  calamt: `${calamt || "N/A"}`,
                  paymtref: `${paymtref || "N/A"}`,
                  paymtamt: `${paymtamt || "N/A"}`,
                  paymtform: `${paymtform || "N/A"}`,
                  paymtdate,
                  adddate,
                  adduser: `Added by: ${adduser || "N/A"}`,
                };
              });
            },
            size: 250,
          },
        ]
      : []),
  ];

  return [...baseColumns, ...roleSpecificColumns.flat()];
};
