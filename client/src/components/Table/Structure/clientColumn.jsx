import { Checkbox } from "../../UI/ShadCN/checkbox";
import { useUser } from "../../../utils/Hooks/userProvider";

/** @type import ('@tanstack/react-table').ColumnDef<any>*/
export const useColumns = () => {
  const { hasRole, user } = useUser();
  const userRole = user?.role;

  // Function to get checkbox color class based on subscription type
  const getCheckboxColorClass = (row) => {
    switch (row?.subscriptionType) {
      case "Promo":
        return "border-[3px] border-emerald-900 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 hover:border-emerald-800";
      case "Complimentary":
        return "border-[3px] border-purple-900 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-900 hover:border-white";
      default:
        return "border-[3px] border-blue-900 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 hover:border-blue-800";
    }
  };

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
      header: ({ table }) => {
        // Get the first row's subscription type for consistent header styling
        const firstRow = table.getRowModel().rows[0]?.original;
        return (
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
              className={getCheckboxColorClass(firstRow)}
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex px-4">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => {
              row.toggleSelected(!!value);
            }}
            aria-label="Select row"
            className={getCheckboxColorClass(row.original)}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    { id: "ID", Header: "ID", accessorFn: (row) => row.id, size: 40 },
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

        const nameDisplay = nameParts.trim();
        const companyDisplay = row.company ? row.company : "";

        // Determine the main display name
        let displayParts = [];

        // Add Spack status first - only if true
        if (row.spack) {
          displayParts.push(`Spack: Spack Client`);
        }

        // Add RTS status - show count and max status
        if (row.rtsCount && row.rtsCount > 0) {
          if (row.rtsMaxReached || row.rtsCount >= 3) {
            displayParts.push(`RTS: MAX RTS (${row.rtsCount})`);
          } else {
            displayParts.push(`RTS: ${row.rtsCount} RTS`);
          }
        }

        // Add donor status third - only if true
        if (row.isDonor) {
          displayParts.push(`Donor: Donor Client`);
        }

        // Add name and/or company
        if (nameDisplay) {
          displayParts.push(`Name: ${nameDisplay}`);
        }
        if (companyDisplay) {
          displayParts.push(`Company: ${companyDisplay}`);
        }
        if (!nameDisplay && !companyDisplay) {
          displayParts.push(`Name: No Name`);
        }

        // Add type and group
        if (row.type) {
          displayParts.push(`Type: ${row.type}`);
        }
        if (row.group) {
          displayParts.push(`Group: ${row.group}`);
        }

        return displayParts.join("<br>");
      },
      size: 200,
    },
    {
      id: "Address",
      Header: "Address",
      accessorFn: (row) => {
        const address = row.address || "";
        const acode = row.acode
          ? `<br><strong>Area Code: ${row.acode}</strong>`
          : "";

        // Create array of address parts and filter out empty ones
        const addressParts = [address].filter(Boolean).join(", ");

        return `${addressParts}${acode}`;
      },
      size: 200,
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
      size: 180,
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
      size: 20,
    },
  ];

  const roleSpecificColumns = [
    ...(hasRole("WMM")
      ? [
          {
            id: "Subscription",
            Header: "Subscription",
            accessorFn: (row) => {
              // Get the appropriate subscription data based on type
              let subscriptionData;
              switch (row.subscriptionType) {
                case "Promo":
                  subscriptionData = row.promoData;
                  break;
                case "Complimentary":
                  subscriptionData = row.compData;
                  break;
                default: // WMM
                  subscriptionData = row.wmmData;
              }

              // Check if subscription data exists and has records
              if (!subscriptionData || !subscriptionData.records) {
                return [];
              }

              // Use the records array from subscription data
              const subscriptionRecords = subscriptionData.records || [];

              // Check if there are filtered records available (from backend filtering)
              // The backend should return filtered records in a separate property
              const filteredRecords =
                subscriptionData.filteredRecords ||
                subscriptionData.matchedRecords ||
                null;

              // Determine which records to display
              let recordsToProcess;

              if (
                filteredRecords &&
                Array.isArray(filteredRecords) &&
                filteredRecords.length > 0
              ) {
                // Use filtered records from backend when available
                recordsToProcess = filteredRecords;
              } else {
                // Fallback to original logic - check if we should show all records or just the most recent one
                // Only show most recent record if there are filters applied AND they are not just service filters
                const hasNonServiceFilters = row.hasNonServiceFilters === true;

                // Sort records by subsdate in descending order (most recent first)
                const sortedRecords = [...subscriptionRecords].sort((a, b) => {
                  const dateA = new Date(a.subsdate || 0);
                  const dateB = new Date(b.subsdate || 0);
                  return dateB - dateA;
                });

                recordsToProcess = hasNonServiceFilters
                  ? [sortedRecords[0]]
                  : sortedRecords;
              }

              return recordsToProcess
                .filter((subscription) => subscription) // Filter out undefined/null subscriptions
                .map((subscription) => {
                  let {
                    subsdate,
                    enddate,
                    copies,
                    subsclass,
                    paymtref,
                    paymtamt,
                    calendar,
                    referralid,
                  } = subscription;

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
                    calendar: calendar || false,
                    type: row.subscriptionType, // Add subscription type to display
                    referralid: referralid || null,
                  };
                });
            },
            cell: ({ getValue, row }) => {
              const subscriptions = getValue();
              if (!subscriptions || subscriptions.length === 0) {
                return <div>No subscription data</div>;
              }

              // Check if we're showing filtered records
              const subscriptionData =
                row.original.wmmData ||
                row.original.promoData ||
                row.original.compData;
              const isShowingFilteredRecords =
                subscriptionData &&
                (subscriptionData.filteredRecords ||
                  subscriptionData.matchedRecords) &&
                Array.isArray(
                  subscriptionData.filteredRecords ||
                    subscriptionData.matchedRecords
                ) &&
                (
                  subscriptionData.filteredRecords ||
                  subscriptionData.matchedRecords
                ).length > 0;

              return (
                <div>
                  {isShowingFilteredRecords && (
                    <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                      🔍 Showing filtered records ({subscriptions.length} of{" "}
                      {(subscriptionData?.records || []).length})
                    </div>
                  )}
                  <ul className="max-h-[200px] max-w-[450px] overflow-y-auto scrollbar-hide">
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

                      // Get subscription type badge color
                      const typeBadgeColor =
                        sub.type === "Promo"
                          ? "bg-emerald-100 text-emerald-800"
                          : sub.type === "Complimentary"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800";

                      return (
                        <li key={index} className="mb-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={statusClass}>
                                {statusIndicator}
                                <strong>{sub.subsclass}</strong>: {sub.subsdate}{" "}
                                - {sub.enddate}, Cps: {sub.copies}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor}`}
                              >
                                {sub.type}
                              </span>
                            </div>
                            {(sub.paymtref || sub.paymtamt) && (
                              <div className="text-xs ml-4 text-gray-600">
                                {sub.paymtref && (
                                  <span>Ref: {sub.paymtref}</span>
                                )}
                                {sub.paymtref && sub.paymtamt && (
                                  <span> • </span>
                                )}
                                {sub.paymtamt && (
                                  <span>Amt: {sub.paymtamt}</span>
                                )}
                              </div>
                            )}
                            {index === 0 && (
                              <div className="text-xs ml-4 mt-1">
                                {sub.calendar ? (
                                  <span className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
                                    Calendar ✓
                                  </span>
                                ) : (
                                  <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    No Calendar
                                  </span>
                                )}
                                {sub.referralid && (
                                  <span>Referral ID: {sub.referralid}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            },
            size: 250,
          },
          // Added Info column - only show for WMM role but not for HRG FOM CAL combined role
          ...(userRole !== "HRG FOM CAL"
            ? [
                {
                  id: "Added Info",
                  Header: "Added Info",
                  accessorFn: (row) => {
                    // Get the appropriate subscription data based on type
                    let subscriptionData;
                    switch (row.subscriptionType) {
                      case "Promo":
                        subscriptionData = row.promoData;
                        break;
                      case "Complimentary":
                        subscriptionData = row.compData;
                        break;
                      default: // WMM
                        subscriptionData = row.wmmData;
                    }

                    // Check if subscription data exists and has records
                    if (
                      !subscriptionData ||
                      !subscriptionData.records ||
                      subscriptionData.records.length === 0
                    ) {
                      // Fallback to client adddate/adduser if no subscription data
                      return `By: ${row.adduser || "N/A"}, Date: ${
                        row.adddate || "N/A"
                      }`;
                    }

                    // Sort records by adddate in descending order (most recent first)
                    const sortedRecords = [...subscriptionData.records].sort(
                      (a, b) => {
                        const dateA = new Date(a.adddate || 0);
                        const dateB = new Date(b.adddate || 0);
                        return dateB - dateA;
                      }
                    );

                    // Get the most recent subscription record
                    const mostRecentRecord = sortedRecords[0];

                    if (
                      mostRecentRecord &&
                      mostRecentRecord.adddate &&
                      mostRecentRecord.adduser
                    ) {
                      return `By: ${mostRecentRecord.adduser}, Date: ${mostRecentRecord.adddate}`;
                    } else {
                      // Fallback to client adddate/adduser if subscription record doesn't have the fields
                      return `By: ${row.adduser || "N/A"}, Date: ${
                        row.adddate || "N/A"
                      }`;
                    }
                  },
                  size: 150,
                },
              ]
            : []),
        ]
      : []),
    // Always include HRG data column if the user has HRG role or Admin role
    ...(hasRole("HRG") || hasRole("Admin")
      ? [
          {
            id: "HRG Data",
            Header: "HRG Data",
            accessorFn: (row) => {
              // More flexible check for HRG data
              if (
                !row.hrgData ||
                ((!row.hrgData.records || row.hrgData.records.length === 0) &&
                  Object.keys(row.hrgData).length <= 1) // Only has clientid or is empty
              ) {
                return [];
              }

              // If hrgData is not empty but has no records property, wrap it in records array
              let hrgRecords = [];
              if (row.hrgData.records && Array.isArray(row.hrgData.records)) {
                hrgRecords = row.hrgData.records;
              } else if (Object.keys(row.hrgData).length > 1) {
                // If hrgData has data but no records property, treat it as a single record
                hrgRecords = [row.hrgData];
              }

              // Check if there are filtered records available (from backend filtering)
              const filteredRecords =
                row.hrgData.filteredRecords ||
                row.hrgData.matchedRecords ||
                null;

              // Determine which records to display
              let recordsToProcess;

              if (
                filteredRecords &&
                Array.isArray(filteredRecords) &&
                filteredRecords.length > 0
              ) {
                // Use filtered records from backend when available
                recordsToProcess = filteredRecords;
              } else {
                // Use all records sorted by date
                recordsToProcess = [...hrgRecords].sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                });
              }

              return recordsToProcess
                .sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                })
                .map((hrgItem) => {
                  const campaigndate = hrgItem.campaigndate
                    ? new Date(hrgItem.campaigndate).toLocaleDateString("en-US")
                    : "N/A";

                  const recvdate = hrgItem.recvdate
                    ? new Date(hrgItem.recvdate).toLocaleDateString("en-US")
                    : "N/A";

                  const paymtamt = hrgItem.paymtamt
                    ? `₱${parseFloat(hrgItem.paymtamt).toFixed(2)}`
                    : "N/A";

                  const paymtref = hrgItem.paymtref ? hrgItem.paymtref : "N/A";

                  // Check if there's a subscription status override from the backend filter
                  let status;
                  if (row.subscriptionStatusOverride) {
                    // Apply the status based on the filter that was applied
                    status =
                      row.subscriptionStatusOverride === "active"
                        ? "Active"
                        : "Unsubscribed";
                  } else {
                    // Use the original status
                    status = hrgItem.unsubscribe ? "Unsubscribed" : "Active";
                  }

                  return {
                    campaigndate,
                    recvdate,
                    paymtamt,
                    paymtref,
                    status: status,
                  };
                });
            },
            cell: ({ getValue, row }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No HRG data</div>;
              }

              // Check if we're showing filtered records
              const isShowingFilteredRecords =
                row.original.hrgData &&
                (row.original.hrgData.filteredRecords ||
                  row.original.hrgData.matchedRecords) &&
                Array.isArray(
                  row.original.hrgData.filteredRecords ||
                    row.original.hrgData.matchedRecords
                ) &&
                (
                  row.original.hrgData.filteredRecords ||
                  row.original.hrgData.matchedRecords
                ).length > 0;

              // Get the latest record's status
              const latestStatus = records[0].status;
              const statusColor =
                latestStatus === "Active" ? "text-green-600" : "text-red-600";
              const statusIcon = latestStatus === "Active" ? "🟢" : "🔴";

              return (
                <div className="w-full max-h-[150px] overflow-y-auto">
                  {isShowingFilteredRecords && (
                    <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                      🔍 Showing filtered records ({records.length} of{" "}
                      {(row.original.hrgData?.records || []).length})
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={statusColor}>{statusIcon}</span>
                    <span className={statusColor}>{latestStatus}</span>
                  </div>
                  {records.map((record, index) => (
                    <div key={index}>
                      <div className="flex flex-wrap items-center">
                        <span className="font-xs mr-1">{record.recvdate}</span>
                        <span className="font-xs mr-1">{record.paymtamt}</span>
                        <span
                          className={
                            record.status === "Active"
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            },
            size: 220,
          },
        ]
      : []),
    // Always include FOM data column if the user has FOM role or Admin role
    ...(hasRole("FOM") || hasRole("Admin")
      ? [
          {
            id: "FOM Data",
            Header: "FOM Data",
            accessorFn: (row) => {
              // Even more flexible check for FOM data
              try {
                // If fomData doesn't exist at all, return empty
                if (!row.fomData) {
                  return [];
                }

                // Handle different data structures
                let fomRecords = [];

                // Case 1: fomData has records array
                if (
                  row.fomData.records &&
                  Array.isArray(row.fomData.records) &&
                  row.fomData.records.length > 0
                ) {
                  fomRecords = row.fomData.records;
                }
                // Case 2: fomData is an array
                else if (Array.isArray(row.fomData) && row.fomData.length > 0) {
                  fomRecords = row.fomData;
                }
                // Case 3: fomData is a plain object with data
                else if (
                  typeof row.fomData === "object" &&
                  Object.keys(row.fomData).length > 1
                ) {
                  // Check if it has any FOM-specific properties
                  const hasFomProps = [
                    "recvdate",
                    "paymtamt",
                    "paymtref",
                    "unsubscribe",
                    "remarks",
                  ].some((prop) => row.fomData.hasOwnProperty(prop));

                  if (hasFomProps) {
                    fomRecords = [row.fomData];
                  }
                }

                // If no valid records found
                if (fomRecords.length === 0) {
                  return [];
                }

                // Check if there are filtered records available (from backend filtering)
                const filteredRecords =
                  row.fomData.filteredRecords ||
                  row.fomData.matchedRecords ||
                  null;

                // Determine which records to display
                let recordsToProcess;

                if (
                  filteredRecords &&
                  Array.isArray(filteredRecords) &&
                  filteredRecords.length > 0
                ) {
                  // Use filtered records from backend when available
                  recordsToProcess = filteredRecords;
                } else {
                  // Use all records sorted by date
                  recordsToProcess = [...fomRecords].sort((a, b) => {
                    const dateA = new Date(a.recvdate || 0);
                    const dateB = new Date(b.recvdate || 0);
                    return dateB - dateA;
                  });
                }

                return recordsToProcess
                  .sort((a, b) => {
                    const dateA = new Date(a.recvdate || 0);
                    const dateB = new Date(b.recvdate || 0);
                    return dateB - dateA;
                  })
                  .map((fomItem) => {
                    const recvdate = fomItem.recvdate
                      ? new Date(fomItem.recvdate).toLocaleDateString("en-US")
                      : "N/A";

                    const paymtamt = fomItem.paymtamt
                      ? `₱${parseFloat(fomItem.paymtamt).toFixed(2)}`
                      : "N/A";

                    const paymtref = fomItem.paymtref || "N/A";
                    const remarks = fomItem.remarks || "";

                    // Check if there's a subscription status override from the backend filter
                    let status;
                    if (row.subscriptionStatusOverride) {
                      // Apply the status based on the filter that was applied
                      status =
                        row.subscriptionStatusOverride === "active"
                          ? "Active"
                          : "Unsubscribed";
                    } else {
                      // Use the original status
                      status = fomItem.unsubscribe ? "Unsubscribed" : "Active";
                    }

                    return {
                      recvdate,
                      paymtamt,
                      paymtref,
                      remarks,
                      status: status,
                    };
                  });
              } catch (error) {
                console.error(
                  `Error processing FOM data for client ID ${row.id}:`,
                  error
                );
                return [];
              }
            },
            cell: ({ getValue, row }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No FOM data</div>;
              }

              // Check if we're showing filtered records
              const isShowingFilteredRecords =
                row.original.fomData &&
                (row.original.fomData.filteredRecords ||
                  row.original.fomData.matchedRecords) &&
                Array.isArray(
                  row.original.fomData.filteredRecords ||
                    row.original.fomData.matchedRecords
                ) &&
                (
                  row.original.fomData.filteredRecords ||
                  row.original.fomData.matchedRecords
                ).length > 0;

              // Get the latest record's status
              const latestStatus = records[0].status;
              const statusColor =
                latestStatus === "Active" ? "text-green-600" : "text-red-600";
              const statusIcon = latestStatus === "Active" ? "🟢" : "🔴";

              return (
                <div className="w-full max-h-[150px] overflow-y-auto">
                  {isShowingFilteredRecords && (
                    <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                      🔍 Showing filtered records ({records.length} of{" "}
                      {(row.original.fomData?.records || []).length})
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={statusColor}>{statusIcon}</span>
                    <span className={statusColor}>{latestStatus}</span>
                  </div>
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="mb-2 pb-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center">
                        <span className="font-medium mr-1">
                          {record.recvdate}
                        </span>
                        <span
                          className={
                            record.status === "Active"
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {record.status}
                        </span>
                        <span className="font-medium ml-1">
                          {record.paymtamt}
                        </span>
                        {record.paymtref !== "N/A" && (
                          <span className="font-medium ml-1">
                            (Ref: {record.paymtref})
                          </span>
                        )}
                      </div>
                      {record.remarks && (
                        <div className="text-sm text-gray-600">
                          {record.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            },
            size: 220,
          },
        ]
      : []),
    // Always include CAL data column if the user has CAL role
    ...(hasRole("CAL")
      ? [
          {
            id: "CAL Data",
            Header: "CAL Data",
            accessorFn: (row) => {
              // More flexible check for CAL data
              if (
                !row.calData ||
                ((!row.calData.records || row.calData.records.length === 0) &&
                  Object.keys(row.calData).length <= 1) // Only has clientid or is empty
              ) {
                return [];
              }

              // If calData is not empty but has no records property, wrap it in records array
              let calRecords = [];
              if (row.calData.records && Array.isArray(row.calData.records)) {
                calRecords = row.calData.records;
              } else if (Object.keys(row.calData).length > 1) {
                // If calData has data but no records property, treat it as a single record
                calRecords = [row.calData];
              }

              // Check if there are filtered records available (from backend filtering)
              const filteredRecords =
                row.calData.filteredRecords ||
                row.calData.matchedRecords ||
                null;

              // Determine which records to display
              let recordsToProcess;

              if (
                filteredRecords &&
                Array.isArray(filteredRecords) &&
                filteredRecords.length > 0
              ) {
                // Use filtered records from backend when available
                recordsToProcess = filteredRecords;
              } else {
                // Use all records sorted by date
                recordsToProcess = [...calRecords].sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                });
              }

              return recordsToProcess
                .sort((a, b) => {
                  const dateA = new Date(a.recvdate || 0);
                  const dateB = new Date(b.recvdate || 0);
                  return dateB - dateA;
                })
                .map((calItem) => {
                  const recvdate = calItem.recvdate
                    ? new Date(calItem.recvdate).toLocaleDateString("en-US")
                    : "N/A";

                  const quantityNum = parseFloat(calItem.calqty ?? 0) || 0;
                  // Use calamt strictly as unit cost
                  const unitRaw = calItem.calamt;
                  const unitCostNum =
                    parseFloat(
                      typeof unitRaw === "string"
                        ? unitRaw.replace(/[^\d.-]/g, "")
                        : unitRaw || 0
                    ) || 0;
                  const totalNum = quantityNum * unitCostNum;

                  const unitFormatted = unitCostNum
                    ? `${unitCostNum.toFixed(2)}`
                    : "N/A";
                  const totalFormatted = totalNum
                    ? `${totalNum.toFixed(2)}`
                    : "N/A";

                  const paymtref = calItem.paymtref ? calItem.paymtref : "N/A";
                  const paymtform = calItem.paymtform
                    ? calItem.paymtform
                    : "N/A";

                  return {
                    recvdate,
                    caltype: calItem.caltype || "N/A",
                    calqty: quantityNum || "N/A",
                    unit: unitFormatted,
                    total: totalFormatted,
                    paymtref,
                    paymtform,
                  };
                });
            },
            cell: ({ getValue, row }) => {
              const records = getValue();
              if (!records || records.length === 0) {
                return <div className="text-gray-500 italic">No CAL data</div>;
              }

              // Check if we're showing filtered records
              const isShowingFilteredRecords =
                row.original.calData &&
                (row.original.calData.filteredRecords ||
                  row.original.calData.matchedRecords) &&
                Array.isArray(
                  row.original.calData.filteredRecords ||
                    row.original.calData.matchedRecords
                ) &&
                (
                  row.original.calData.filteredRecords ||
                  row.original.calData.matchedRecords
                ).length > 0;

              return (
                <div className="w-full max-h-[150px] overflow-y-auto">
                  {isShowingFilteredRecords && (
                    <div className="mb-2 p-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium">
                      🔍 Showing filtered records ({records.length} of{" "}
                      {(row.original.calData?.records || []).length})
                    </div>
                  )}
                  {records.map((record, index) => (
                    <div
                      key={index}
                      className="mb-2 pb-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center">
                        <span className="font-medium mr-1">
                          {record.recvdate}
                        </span>
                        <span className="mx-1">•</span>
                        <span className="font-medium mr-1">
                          {record.caltype}
                        </span>
                        <span className="mx-1">•</span>
                        <span className="font-medium mr-1">
                          Qty: {record.calqty}
                        </span>
                        <span className="mx-1">•</span>
                        <span className="font-medium mr-1">
                          Unit: {record.unit}
                        </span>
                        <span className="mx-1">•</span>
                        <span className="font-medium">
                          Total: {record.total}
                        </span>
                        <span className="mx-1">•</span>
                        <span className="font-medium">
                          Ref: #{record.paymtref} - {record.paymtform}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            },
            size: 300,
          },
        ]
      : []),
    // Always include ADDED BY column for Admin role
    ...(hasRole("Admin")
      ? [
          {
            id: "Added By",
            Header: "Added By",
            accessorFn: (row) => {
              // Get the appropriate subscription data based on type
              let subscriptionData;
              switch (row.subscriptionType) {
                case "Promo":
                  subscriptionData = row.promoData;
                  break;
                case "Complimentary":
                  subscriptionData = row.compData;
                  break;
                default: // WMM
                  subscriptionData = row.wmmData;
              }

              // Check if subscription data exists and has records
              if (
                !subscriptionData ||
                !subscriptionData.records ||
                subscriptionData.records.length === 0
              ) {
                // Fallback to client adddate/adduser if no subscription data
                return `By: ${row.adduser || "N/A"}, Date: ${
                  row.adddate || "N/A"
                }`;
              }

              // Sort records by adddate in descending order (most recent first)
              const sortedRecords = [...subscriptionData.records].sort(
                (a, b) => {
                  const dateA = new Date(a.adddate || 0);
                  const dateB = new Date(b.adddate || 0);
                  return dateB - dateA;
                }
              );

              // Get the most recent subscription record
              const mostRecentRecord = sortedRecords[0];

              if (
                mostRecentRecord &&
                mostRecentRecord.adddate &&
                mostRecentRecord.adduser
              ) {
                return `By: ${mostRecentRecord.adduser}, Date: ${mostRecentRecord.adddate}`;
              } else {
                // Fallback to client adddate/adduser if subscription record doesn't have the fields
                return `By: ${row.adduser || "N/A"}, Date: ${
                  row.adddate || "N/A"
                }`;
              }
            },
            size: 150,
          },
        ]
      : []),
  ];

  return [...baseColumns, ...roleSpecificColumns.flat()];
};
