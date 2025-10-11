// DuplicatePanel.jsx
import React from "react";

const DuplicatePanel = ({
  potentialDuplicates,
  isCheckingDuplicates,
  handleViewDuplicate,
}) => {
  // Extract matches and categories from the response
  const matches = potentialDuplicates.matches || potentialDuplicates;
  const categories = potentialDuplicates.categories || {};

  // Check if we have categorized results
  const hasCategories = categories.highMatches !== undefined;

  // State to track if we're showing all matches
  const [showAllMatches, setShowAllMatches] = React.useState(false);

  // Determine which matches to display
  const displayMatches =
    showAllMatches && potentialDuplicates.allMatches
      ? potentialDuplicates.allMatches
      : matches;
  return (
    <div className="border-l-0 lg:border-l border-gray-200 w-full lg:w-[30vw] h-full max-h-[90vh] overflow-hidden bg-white shadow-md flex flex-col mt-0 lg:mt-0">
      <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 py-3 px-4 border-b border-gray-200 z-10">
        <div className="flex items-center justify-between">
          <div>
            {isCheckingDuplicates ? (
              <h3 className="text-gray-800 text-base font-medium flex items-center">
                <span className="animate-pulse mr-2">Checking...</span>
                <svg
                  className="animate-spin h-4 w-4 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </h3>
            ) : (
              <h3 className="text-gray-800 text-base font-medium">
                {displayMatches.length > 0
                  ? `${displayMatches.length} Possible ${
                      displayMatches.length === 1 ? "Match" : "Matches"
                    }`
                  : "Potential Matches"}
              </h3>
            )}
            <p className="text-sm text-gray-500 mt-0.5">
              {isCheckingDuplicates
                ? "Searching for possible duplicates..."
                : matches.length > 0
                ? hasCategories
                  ? `${
                      categories.highMatches > 0
                        ? `${categories.highMatches} strong`
                        : ""
                    }${
                      categories.mediumMatches > 0
                        ? `${categories.highMatches > 0 ? ", " : ""}${
                            categories.mediumMatches
                          } medium`
                        : ""
                    }${
                      categories.lowMatches > 0 && categories.showLowMatches
                        ? `${
                            categories.highMatches > 0 ||
                            categories.mediumMatches > 0
                              ? ", "
                              : ""
                          }${categories.lowMatches} weak`
                        : ""
                    } matches found`
                  : "Similar records found in database"
                : "No matches found yet"}
            </p>
          </div>
          {displayMatches.length > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
              {displayMatches.length}
            </span>
          )}
        </div>
      </div>

      <div
        className="overflow-y-auto p-3 flex-grow custom-scrollbar"
        style={{ maxHeight: "calc(90vh - 70px)", overflowY: "auto" }}
      >
        {isCheckingDuplicates && displayMatches.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-400">
            <p>Searching for matching records...</p>
          </div>
        ) : displayMatches.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-400">
            <p>Enter client details to find matches</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Show match quality summary if we have categorized results */}
            {hasCategories &&
              categories.totalFound > matches.length &&
              !showAllMatches && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">
                        Showing {matches.length} of {categories.totalFound}{" "}
                        matches
                      </span>
                      <div className="text-xs text-blue-600 mt-1">
                        {categories.highMatches > 0 && (
                          <span className="inline-block mr-3">
                            <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-1"></span>
                            {categories.highMatches} strong matches
                          </span>
                        )}
                        {categories.mediumMatches > 0 && (
                          <span className="inline-block mr-3">
                            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                            {categories.mediumMatches} medium matches
                          </span>
                        )}
                        {categories.lowMatches > 0 && (
                          <span className="inline-block">
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                            {categories.lowMatches} weak matches
                          </span>
                        )}
                      </div>
                    </div>
                    {categories.totalFound > matches.length && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        onClick={() => setShowAllMatches(true)}
                      >
                        Show all
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* Show "Show filtered" button when showing all matches */}
            {hasCategories && showAllMatches && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-green-800">
                    <span className="font-medium">
                      Showing all {categories.totalFound} matches
                    </span>
                  </div>
                  <button
                    className="text-xs text-green-600 hover:text-green-800 underline"
                    onClick={() => setShowAllMatches(false)}
                  >
                    Show filtered
                  </button>
                </div>
              </div>
            )}

            {displayMatches.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden hover:border-blue-300 hover:shadow transition-all duration-200"
              >
                <div className="px-3 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800">
                        {client.lname || client.fname || client.mname
                          ? `${client.lname || ""}, ${client.fname || ""} ${
                              client.mname ? client.mname.charAt(0) + "." : ""
                            }`
                          : client.company
                          ? client.company
                          : "No Name"}
                      </div>
                      <div className="text-base text-blue-700 bg-blue-100 px-2 py-1 rounded-md font-bold">
                        ID: {client.id}
                      </div>
                    </div>

                    {/* Match strength indicator */}
                    {client.totalScore !== undefined && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div
                          className={`text-xs font-medium px-2 py-1 rounded-md inline-flex items-center gap-1.5 ${
                            client.totalScore >= 35
                              ? "bg-red-100 text-red-900 border border-red-200"
                              : client.totalScore >= 25
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : client.totalScore >= 15
                              ? "bg-yellow-100 text-yellow-900 border border-yellow-200"
                              : "bg-blue-100 text-blue-900 border border-blue-200"
                          }`}
                          title={
                            client.totalScore >= 35
                              ? "Multiple strong matches in key fields suggest this is very likely the same client."
                              : client.totalScore >= 25
                              ? "Several matching fields indicate this could be the same client."
                              : client.totalScore >= 15
                              ? "Some matching information suggests a possible duplicate."
                              : "A few fields have similar information."
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            {client.totalScore >= 35 ? (
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            ) : client.totalScore >= 25 ? (
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            ) : client.totalScore >= 15 ? (
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            ) : (
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12zm0-9a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                clipRule="evenodd"
                              />
                            )}
                          </svg>
                          <span>
                            {client.totalScore >= 35
                              ? "Very strong match"
                              : client.totalScore >= 25
                              ? "Strong match"
                              : client.totalScore >= 15
                              ? "Likely match"
                              : "Possible match"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-3 py-2 text-xs">
                  {/* Match indicators */}
                  {(client.fnameMatch > 0 ||
                    client.lnameMatch > 0 ||
                    client.addressMatch > 0 ||
                    client.cellnoMatch > 0 ||
                    client.contactnosMatch > 0 ||
                    client.emailMatch > 0 ||
                    client.bdateMatch > 0 ||
                    client.companyMatch > 0 ||
                    client.acodeMatch > 0) && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {client.lnameMatch > 0 && (
                        <span className="bg-red-50 text-red-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-red-100 flex items-center">
                          Last name
                        </span>
                      )}
                      {client.addressMatch > 0 && (
                        <span className="bg-amber-50 text-amber-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-amber-100 flex items-center">
                          Address
                        </span>
                      )}
                      {client.fnameMatch > 0 && (
                        <span className="bg-orange-50 text-orange-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-orange-100 flex items-center">
                          First Name
                        </span>
                      )}
                      {(client.cellnoMatch > 0 ||
                        client.contactnosMatch > 0) && (
                        <span className="bg-green-50 text-green-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-green-100">
                          Phone
                        </span>
                      )}
                      {client.emailMatch > 0 && (
                        <span className="bg-blue-50 text-blue-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-blue-100">
                          Email
                        </span>
                      )}
                      {client.bdateMatch > 0 && (
                        <span className="bg-purple-50 text-purple-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-purple-100">
                          Birthdate
                        </span>
                      )}
                      {client.companyMatch > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-indigo-100">
                          Company
                        </span>
                      )}
                      {client.acodeMatch > 0 && (
                        <span className="bg-gray-50 text-purple-600 text-xs font-medium rounded-sm px-1.5 py-0.5 border border-purple-100">
                          Area Code
                        </span>
                      )}
                    </div>
                  )}

                  {/* Service tags - Display what services this client has */}
                  {client.services && client.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {client.services.map((service) => {
                        let bgColor, textColor, borderColor;
                        switch (service) {
                          case "WMM":
                            bgColor = "bg-blue-50";
                            textColor = "text-blue-600";
                            borderColor = "border-blue-100";
                            break;
                          case "HRG":
                            bgColor = "bg-yellow-50";
                            textColor = "text-yellow-600";
                            borderColor = "border-yellow-100";
                            break;
                          case "FOM":
                            bgColor = "bg-rose-50";
                            textColor = "text-rose-600";
                            borderColor = "border-rose-100";
                            break;
                          case "CAL":
                            bgColor = "bg-cyan-50";
                            textColor = "text-cyan-600";
                            borderColor = "border-cyan-100";
                            break;
                          case "PROMO":
                            bgColor = "bg-emerald-50";
                            textColor = "text-emerald-600";
                            borderColor = "border-emerald-100";
                            break;
                          case "COMP":
                            bgColor = "bg-purple-50";
                            textColor = "text-purple-600";
                            borderColor = "border-purple-100";
                            break;
                          default:
                            bgColor = "bg-gray-50";
                            textColor = "text-gray-600";
                            borderColor = "border-gray-100";
                        }

                        return (
                          <span
                            key={service}
                            className={`${bgColor} ${textColor} text-xs font-medium rounded-sm px-1.5 py-0.5 border ${borderColor} flex items-center`}
                          >
                            <svg
                              className="w-2.5 h-2.5 mr-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              ></path>
                            </svg>
                            {service}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Show no fields info */}
                  {!(
                    client.bdate ||
                    client.cellno ||
                    client.contactnos ||
                    client.email
                  ) && (
                    <div className="text-sm text-gray-400 italic mb-1.5">
                      Only address available
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-1.5">
                    {client.bdate && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Born: {client.bdate}</span>
                      </div>
                    )}

                    {(client.cellno || client.contactnos) && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{client.cellno || client.contactnos}</span>
                      </div>
                    )}

                    {client.email && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}

                    {client.company && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="truncate">{client.company}</span>
                      </div>
                    )}

                    {client.address && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="truncate">
                          {client.address &&
                            client.address.replace(/\r\n/g, ", ")}
                        </span>
                      </div>
                    )}

                    {client.acode && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 mr-1.5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="truncate">
                          Area Code: {client.acode}{" "}
                          {client.area && `(${client.area})`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleViewDuplicate(client.id)}
                      className="px-2.5 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors shadow-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Style for scrollbar */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #ccc #f1f1f1;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #ccc;
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #999;
            }
          `,
        }}
      />
    </div>
  );
};

export default DuplicatePanel;
