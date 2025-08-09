export const areaColumns = [
  {
    header: "Area Code",
    accessorKey: "_id", // Use _id as the accessorKey to match the data structure
    cell: ({ row }) => {
      const areaCode = row.original._id || "";

      return (
        <div className="flex items-center justify-center p-2">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs px-1 text-center leading-tight">
              {areaCode}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    header: "Area List (Name - Zipcode - Description)",
    accessorKey: "locations",
    cell: ({ row }) => {
      const locations = row.original.locations ?? [];

      return (
        <div className="max-h-64 overflow-y-auto p-2">
          {locations.length > 0 ? (
            <div className="space-y-3">
              {locations.map((location, index) => {
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
                    className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="font-medium text-gray-900 truncate">
                            {location.name || "Unnamed Location"}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {location.zipcode && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {location.zipcode}
                            </span>
                          )}

                          {location.description && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {location.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 ml-3">
                        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          #{index + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="text-sm font-medium">No locations found</div>
              <div className="text-xs mt-1">Add locations to this area</div>
            </div>
          )}
        </div>
      );
    },
  },
];
