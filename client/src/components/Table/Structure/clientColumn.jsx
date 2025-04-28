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

        // If no name parts are available, use company name as fallback
        const displayName = nameParts.trim() || (row.company ? row.company : "No Name");

        const typePart = row.type ? `<br>Type: ${row.type}` : "";

        return `${displayName}${typePart}`;
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
                  let { subsdate, enddate, copies, subsclass, paymtref, paymtamt } = subscription;

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

                  // Format payment amount if exists
                  const formattedPayment = paymtamt 
                    ? `₱${parseFloat(paymtamt).toFixed(2)}` 
                    : null;

                  // Determine subscription status
                  const status = getSubscriptionStatus(enddate);

                  return {
                    subsclass,
                    subsdate,
                    enddate,
                    copies: `${copies || "N/A"}`,
                    paymtref: paymtref || null,
                    paymtamt: formattedPayment,
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
                <ul className="max-h-[150px] max-w-[300px] overflow-y-auto scrollbar-hide">
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
                      <li key={index} className="">
                        <span className={statusClass}>
                          {statusIndicator}
                          <strong>{sub.subsclass}</strong>: {sub.subsdate} -{" "}
                          {sub.enddate}, Cps: {sub.copies}
                        </span>
                        {(sub.paymtref || sub.paymtamt) && (
                          <div className="text-xs ml-4 text-gray-600">
                            {sub.paymtref && <span>Ref: {sub.paymtref}</span>}
                            {sub.paymtref && sub.paymtamt && <span> • </span>}
                            {sub.paymtamt && <span>Amt: {sub.paymtamt}</span>}
                          </div>
                        )}
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

              // Sort records by recvdate in descending order (most recent first)
              return [...hrgRecords]
                .sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                })
                .map((hrgItem) => {
                  let {
                    recvdate,
                    renewdate,
                    campaigndate,
                    paymtref,
                    paymtamt,
                    unsubscribe,
                    adddate,
                  } = hrgItem;

                  recvdate = recvdate
                    ? new Date(recvdate).toLocaleDateString("en-US")
                    : "N/A";

                  renewdate = renewdate
                    ? new Date(renewdate).toLocaleDateString("en-US")
                    : "N/A";

                  campaigndate = campaigndate
                    ? new Date(campaigndate).toLocaleDateString("en-US")
                    : "N/A";

                  adddate = adddate
                    ? new Date(adddate).toLocaleDateString("en-US")
                    : "N/A";

                  paymtamt = paymtamt
                    ? `₱${parseFloat(paymtamt).toFixed(2)}`
                    : "N/A";

                  return {
                    recvdate,
                    renewdate,
                    campaigndate,
                    paymtref: paymtref || "N/A",
                    paymtamt,
                    unsubscribe: unsubscribe ? "Unsubscribed" : "Active",
                    adddate,
                  };
                });
            },
            cell: ({ getValue }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No HRG data</div>;
              }

              return (
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="mb-2 p-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Received:
                          </span>
                          <span>{record.recvdate}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Renewal:
                          </span>
                          <span>{record.renewdate}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Campaign:
                          </span>
                          <span>{record.campaigndate}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Ref:
                          </span>
                          <span>{record.paymtref}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Amount:
                          </span>
                          <span>{record.paymtamt}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Status:
                          </span>
                          <span
                            className={
                              record.unsubscribe === "Active"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {record.unsubscribe}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            },
            size: 400,
          },
        ]
      : []),
    ...(hasRole("FOM")
      ? [
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

              // Sort records by recvdate in descending order (most recent first)
              return [...fomRecords]
                .sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                })
                .map((fomItem) => {
                  let {
                    recvdate,
                    remarks,
                    paymtamt,
                    paymtform,
                    paymtref,
                    unsubscribe,
                    adddate,
                    adduser,
                  } = fomItem;

                  recvdate = recvdate
                    ? new Date(recvdate).toLocaleDateString("en-US")
                    : "N/A";

                  paymtamt = paymtamt
                    ? `₱${parseFloat(paymtamt).toFixed(2)}`
                    : "N/A";

                  adddate = adddate
                    ? new Date(adddate).toLocaleDateString("en-US")
                    : "N/A";

                  return {
                    recvdate,
                    remarks: remarks || "N/A",
                    paymtform: paymtform || "N/A",
                    paymtref: paymtref || "N/A",
                    paymtamt,
                    unsubscribe: unsubscribe ? "Unsubscribed" : "Active",
                    adddate,
                  };
                });
            },
            cell: ({ getValue }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No FOM data</div>;
              }

              return (
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="mb-2 p-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Received:
                          </span>
                          <span>{record.recvdate}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Ref:
                          </span>
                          <span>{record.paymtref}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Amount:
                          </span>
                          <span>{record.paymtamt}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Form:
                          </span>
                          <span>{record.paymtform}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Status:
                          </span>
                          <span
                            className={
                              record.unsubscribe === "Active"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {record.unsubscribe}
                          </span>
                        </div>
                      </div>
                      {record.remarks !== "N/A" && (
                        <div className="mt-1">
                          <span className="text-gray-600 font-medium">
                            Remarks:{" "}
                          </span>
                          <span className="text-gray-800">
                            {record.remarks}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            },
            size: 400,
          },
        ]
      : []),
    ...(hasRole("CAL")
      ? [
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

              // Sort records by recvdate in descending order (most recent first)
              return [...calRecords]
                .sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                })
                .map((calItem) => {
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
                    ? new Date(recvdate).toLocaleDateString("en-US")
                    : "N/A";

                  paymtdate = paymtdate
                    ? new Date(paymtdate).toLocaleDateString("en-US")
                    : "N/A";

                  adddate = adddate
                    ? new Date(adddate).toLocaleDateString("en-US")
                    : "N/A";

                  calamt = calamt ? `₱${parseFloat(calamt).toFixed(2)}` : "N/A";
                  paymtamt = paymtamt
                    ? `₱${parseFloat(paymtamt).toFixed(2)}`
                    : "N/A";

                  return {
                    recvdate,
                    caltype: caltype || "N/A",
                    calqty: calqty || "N/A",
                    calamt,
                    paymtref: paymtref || "N/A",
                    paymtamt,
                    paymtform: paymtform || "N/A",
                    paymtdate,
                    adddate,
                  };
                });
            },
            cell: ({ getValue }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No CAL data</div>;
              }

              return (
                <div className="max-h-[200px] overflow-y-auto pr-2">
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="mb-2 p-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Received:
                          </span>
                          <span>{record.recvdate}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Cal Type:
                          </span>
                          <span>{record.caltype}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Quantity:
                          </span>
                          <span>{record.calqty}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Cal Amount:
                          </span>
                          <span>{record.calamt}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Ref:
                          </span>
                          <span>{record.paymtref}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Amt:
                          </span>
                          <span>{record.paymtamt}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Form:
                          </span>
                          <span>{record.paymtform}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-600 font-medium w-24">
                            Payment Date:
                          </span>
                          <span>{record.paymtdate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            },
            size: 400,
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
