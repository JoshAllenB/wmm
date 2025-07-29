import { Button } from "../../UI/ShadCN/button";
import { ArrowUpDown } from "lucide-react";
import React from "react";

const RecipientWithToggle = ({ recipient, formatDate }) => {
  const [showAll, setShowAll] = React.useState(false);

  // Sort subscriptions by date (newest first)
  const sortedSubscriptions = [...(recipient.subscriptions || [])].sort(
    (a, b) => new Date(b.subsdate) - new Date(a.subsdate)
  );

  // Determine if we should show the toggle button
  const shouldShowToggle = sortedSubscriptions.length > 3;
  const subscriptionsToShow = showAll
    ? sortedSubscriptions
    : sortedSubscriptions.slice(0, 3);

  return (
    <div className="border-l-2 pl-2">
      <div className="font-sm font-bold">{recipient.name || "N/A"}</div>
      <div className="text-md font-bold">ID: {recipient.id || "N/A"}</div>
      <div className="mt-1 text-base space-y-1">
        {subscriptionsToShow.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 p-1 rounded-md">
            <span>•</span>
            <span>
              {formatDate(sub.subsdate)} ({sub.copies || 0} copy
              {sub.copies !== 1 ? "s" : ""})
            </span>
          </div>
        ))}

        {shouldShowToggle && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-blue-500 hover:underline mt-1 focus:outline-none"
          >
            {showAll
              ? "Show less"
              : `Show more (${sortedSubscriptions.length - 3} more)`}
          </button>
        )}
      </div>
    </div>
  );
};

export const useDonorColumns = () => {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US");
    } catch {
      return dateString;
    }
  };

  return [
    {
      id: "DonorName",
      header: "Donor Name",
      // Use accessorFn instead of accessorKey for more control
      accessorFn: (row) => row.donor?.name || "N/A",
      cell: ({ row }) => {
        const donor = row.original.donor || {};
        return (
          <div className="py-2">
            <div className="font-bold text-base">{donor.name || "N/A"}</div>
            <div className="text-sm text-muted-foreground">
              ID: {donor.id || "N/A"}
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      id: "DonorContact",
      header: "Contact Details",
      // Use cell directly instead of accessorKey
      cell: ({ row }) => {
        const donor = row.original.donor || {};
        return (
          <div className="py-2">
            {donor.contact && <div className="text-sm">{donor.contact}</div>}
            {donor.address && (
              <div className="text-sm text-muted-foreground italic">
                {donor.address}
              </div>
            )}
          </div>
        );
      },
      size: 250,
    },
    {
      id: "Recipients",
      header: "Recipients",
      cell: ({ row }) => {
        const recipients = row.original.recipients || [];
        return (
          <div className="py-2 max-h-[200px] overflow-y-auto">
            <div className="space-y-2">
              {recipients.map((recipient) => (
                <RecipientWithToggle
                  key={recipient.id}
                  recipient={recipient}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        );
      },
      size: 300,
    },
    {
      id: "TotalGiftedCopies",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-semibold"
          >
            Total Copies
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      accessorFn: (row) => {
        return (row.recipients || []).reduce((total, recipient) => {
          return (
            total +
            (recipient.subscriptions || []).reduce(
              (sum, sub) => sum + (sub.copies || 0),
              0
            )
          );
        }, 0);
      },
      cell: ({ getValue }) => (
        <div className="text-center font-medium py-2">{getValue()}</div>
      ),
      size: 100,
      enableSorting: true,
    },
    {
      id: "LatestGift",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-semibold"
          >
            Latest Gift
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      accessorFn: (row) => {
        const allDates = (row.recipients || []).flatMap((recipient) =>
          (recipient.subscriptions || []).map((sub) =>
            sub.subsdate ? new Date(sub.subsdate).getTime() : 0
          )
        );
        return allDates.length > 0 ? Math.max(...allDates) : 0;
      },
      cell: ({ getValue }) => {
        const date = getValue();
        return (
          <div className="text-left py-2">
            {date ? formatDate(date) : "No gifts"}
          </div>
        );
      },
      sortingFn: "datetime",
      sortDescFirst: true,
      enableSorting: true,
      size: 150,
    },
    {
      id: "RecipientsCount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 font-semibold"
          >
            Recipients
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      accessorFn: (row) => (row.recipients || []).length,
      cell: ({ getValue }) => (
        <div className="text-center font-medium py-2">{getValue()}</div>
      ),
      size: 100,
      enableSorting: true,
    },
  ];
};
