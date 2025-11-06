import React, { useCallback, useState, useEffect, useMemo } from "react";
import { fetchAreas } from "../../Table/Data/utilData";
import { areaColumns } from "../../Table/Structure/areaColumn";
import DataTable from "../../Table/DataTable";
import AddArea from "../../CRUD/Area/add";
import EditArea from "../../CRUD/Area/edit";

const Area = () => {
  const [areas, setAreas] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAndSetAreas = useCallback(async () => {
    try {
      setIsLoading(true);
      const areasData = await fetchAreas();

      // Process data to match backend structure with _id as areaCode
      const formattedAreas = areasData.map((area) => ({
        _id: area._id, // Use _id to match backend
        areaCode: area._id, // Keep areaCode for display purposes
        locations: area.locations.map((loc) => ({
          name: loc.name || "",
          zipcode: loc.zipcode || "",
          description: loc.description || "",
        })),
      }));

      setAreas(formattedAreas);
    } catch (error) {
      console.error("Error fetching areas:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndSetAreas();
  }, [fetchAndSetAreas]);

  const filteredAreas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((area) => {
      const byCode = (area.areaCode ?? "").toString().toLowerCase().includes(q);
      const byLocation = (area.locations || []).some((loc) =>
        (loc.name || "").toLowerCase().includes(q)
      );
      return byCode || byLocation;
    });
  }, [areas, searchTerm]);

  const handleRowClick = (event, row) => {
    setSelectedRow(row.original);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedRow(null);
  };

  const handleEditSuccess = (updatedData) => {
    setAreas((prevData) =>
      prevData.map((area) =>
        area._id === selectedRow._id // Use the original area ID to find the area
          ? {
              ...area,
              _id: updatedData._id, // Update with new area code
              areaCode: updatedData._id, // Update areaCode for display
              locations: updatedData.locations,
            }
          : area
      )
    );
    handleEditClose();
  };

  const handleDeleteSuccess = (deletedId) => {
    setAreas((prevData) => prevData.filter((area) => area._id !== deletedId));
    handleEditClose();
  };

  return (
    <div className="bg-gray-50 flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col flex-1 min-h-0">
        {/* Header Section */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Area Management
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage all area codes and their corresponding locations below.
            </p>
          </div>
          <AddArea fetchAreas={fetchAndSetAreas} />
        </header>

        {/* Data Section */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Areas Overview
            </h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 space-x-2">
                <span>Total Areas: {filteredAreas.length}</span>
                <span>•</span>
                <span>
                  Locations:{" "}
                  {filteredAreas.reduce(
                    (total, area) => total + (area.locations?.length || 0),
                    0
                  )}
                </span>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Acode or Location"
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="h-[760px] p-2 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <div className="animate-spin h-6 w-6 border-b-2 border-blue-500 rounded-full mr-3"></div>
                Loading areas...
              </div>
            ) : areas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-lg font-medium">No areas found</p>
                <p className="text-sm mt-1">Add a new area to get started.</p>
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p className="text-lg font-medium">No matching results</p>
                <p className="text-sm mt-1">
                  Try a different area code or location name.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredAreas.map((area, idx) => (
                  <div
                    key={area._id || idx}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                    onClick={(e) => handleRowClick(e, { original: area })}
                  >
                    {/* Area Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {/* Zone Tag */}
                        <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-lg p-2 font-semibold text-sm min-w-[70px]">
                          <span className="text-base font-bold leading-none">
                            {area.areaCode || "N/A"}
                          </span>
                        </div>

                        {/* Area Info */}
                        <div>
                          <h3 className="text-gray-800 font-semibold">
                            Area Code: {area.areaCode}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {area.locations.length} Locations
                          </p>
                        </div>
                      </div>

                      <button className="text-gray-400 hover:text-blue-600 transition">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Locations */}
                    <div className="max-h-56 overflow-y-auto p-4 space-y-3">
                      {area.locations.map((loc, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-white hover:shadow-sm transition"
                        >
                          <div>
                            <p className="font-medium text-gray-800">
                              {loc.name || "Unnamed Location"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {loc.zipcode && `📍 ${loc.zipcode}`}{" "}
                              {loc.description && `– ${loc.description}`}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                            #{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedRow && (
        <EditArea
          areaId={selectedRow._id}
          initialData={selectedRow}
          onClose={handleEditClose}
          onEditSuccess={handleEditSuccess}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default Area;
