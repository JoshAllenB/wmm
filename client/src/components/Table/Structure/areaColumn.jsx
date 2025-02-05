export const areaColumns = [
  {
    header: "Area Code",
    accessorKey: "areaCode",
  },
  {
    header: "Area List (Name - Zipcode - Description)",
    accessorKey: "locations",
    cell: ({ row }) => {
      const locations = row.original.locations ?? [];
      return (
        <div className="max-h-64 overflow-y-auto">
          {locations.length > 0
            ? locations.map((location, index) => {
                const parts = [
                  location.name,
                  location.zipcode ? ` - ${location.zipcode}` : "",
                  location.description ? ` - ${location.description}` : "",
                ]
                  .filter(Boolean)
                  .join("");

                return (
                  <div
                    key={`${row.original._id}-location-${index}`}
                    className={`mb-2 ${
                      index < locations.length - 1
                        ? "border-b border-gray-300"
                        : ""
                    }`}
                  >
                    {parts}
                  </div>
                );
              })
            : ""}
        </div>
      );
    },
  },
];
