import { Checkbox } from "../../UI/ShadCN/checkbox";
import { useUser } from "../../../utils/Hooks/userProvider";

/** @type import ('@tanstack/react-table').ColumnDef<any>*/
export const useColumns = () => {
  const { hasRole } = useUser();

  // Function to determine subscription status based on enddate
  const getSubscriptionStatus = (enddate) => {
    if (!enddate || enddate === "N/A") return "unknown";

    const today = new Date();
    const endDate = new Date(enddate);

    // Check if date is valid
    if (isNaN(endDate.getTime())) return "unknown";

    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (endDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return "expired";
    } else if (daysUntilExpiration <= 30) {
      return "expiring-soon";
    } else {
      return "active";
    }
  };

  // Function to get status color class
  const getStatusColorClass = (status) => {
    switch (status) {
      case "expired":
        return "text-red-600 font-bold";
      case "expiring-soon":
        return "text-amber-600 font-bold";
      case "active":
        return "text-green-600";
      default:
        return "";
    }
  };

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
      accessorFn: (row) => {
        const nameParts = [
          row.title || "",
          row.sname || "",
          row.lname || "",
          row.fname || "",
          row.mname || "",
        ]
          .filter(Boolean)
          .join(" ");

        const typePart = row.type ? `<br>Type: ${row.type}` : "";

        return `${nameParts}${typePart}`.trim();
      },
      size: 200,
    },
    {
      id: "Address",
      Header: "Address",
      accessorFn: (row) => {
        const address = row.address || "";
        const street = row.street || "";
        const city = row.city || "";
        const barangay = row.barangay || "";
        const acode = row.acode
          ? `<br><strong>Area Code: ${row.acode}</strong>`
          : "";

        // Create array of address parts and filter out empty ones
        const addressParts = [address, street, city, barangay]
          .filter(Boolean)
          .join(", ");

        return `${addressParts}${acode}`;
      },
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
              // Check if wmmData exists and has records
              if (!row.wmmData || !row.wmmData.records) {
                return [];
              }

              // Use the records array from wmmData
              const subscriptionRecords = row.wmmData.records || [];

              // Sort records by subsdate in descending order (most recent first)
              return [...subscriptionRecords]
                .sort((a, b) => {
                  const dateA = new Date(a.subsdate || 0);
                  const dateB = new Date(b.subsdate || 0);
                  return dateB - dateA;
                })
                .map((subscription) => {
                  let { subsdate, enddate, copies, subsclass } = subscription;

                  if (subsdate) {
                    subsdate = `${new Date(subsdate).toLocaleDateString(
                      "en-US"
                    )}`;
                  } else {
                    subsdate = "N/A";
                  }

                  if (enddate) {
                    enddate = `${new Date(enddate).toLocaleDateString(
                      "en-US"
                    )}`;
                  } else {
                    enddate = "N/A";
                  }

                  // Determine subscription status
                  const status = getSubscriptionStatus(enddate);

                  return {
                    subsclass,
                    subsdate,
                    enddate,
                    copies: `${copies || "N/A"}`,
                    status,
                  };
                });
            },
            cell: ({ getValue }) => {
              const subscriptions = getValue();
              if (!subscriptions || subscriptions.length === 0) {
                return <div>No subscription data</div>;
              }

              return (
                <ul className="max-h-[200px] max-w-[350px] overflow-y-auto scrollbar-hide">
                  {subscriptions.map((sub, index) => {
                    const statusClass = getStatusColorClass(sub.status);
                    const statusIndicator =
                      sub.status === "expired"
                        ? "🔴 "
                        : sub.status === "expiring-soon"
                        ? "🟡 "
                        : sub.status === "active"
                        ? "🟢 "
                        : "";

                    return (
                      <li key={index} className="mb-1">
                        <span className={statusClass}>
                          {statusIndicator}
                          <strong>{sub.subsclass}</strong>: {sub.subsdate} -{" "}
                          {sub.enddate}, Cps: {sub.copies}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              );
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
              // Check if hrgData exists and has records
              if (!row.hrgData || !row.hrgData.records) {
                return [];
              }

              // Use the records array from hrgData
              const hrgRecords = row.hrgData.records || [];

              // Convert the array of objects to a more readable format
              return hrgRecords.map((hrgItem) => {
                let {
                  recvdate,
                  renewdate,
                  campaigndate,
                  paymtref,
                  paymtamt,
                  unsubscribe,
                } = hrgItem;

                recvdate = recvdate
                  ? `${new Date(recvdate).toLocaleDateString("en-US")}`
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
              // Check if fomData exists and has records
              if (!row.fomData || !row.fomData.records) {
                return [];
              }

              // Use the records array from fomData
              const fomRecords = row.fomData.records || [];

              return fomRecords.map((fomItem) => {
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

                paymtamt = paymtamt
                  ? `Php ${parseFloat(paymtamt).toFixed(2)}`
                  : "N/A";

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
              // Check if calData exists and has records
              if (!row.calData || !row.calData.records) {
                return [];
              }

              // Use the records array from calData
              const calRecords = row.calData.records || [];

              return calRecords.map((calItem) => {
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
