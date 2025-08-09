import React, { useCallback, useState, useEffect } from "react";
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

      console.log("Formatted Areas:", formattedAreas);
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
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
          {/* Header Section */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Area Management
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage geographical areas and their associated locations.
                  Click on any row to edit area details.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {areas.length}
                  </div>
                  <div className="text-sm text-gray-500">Total Areas</div>
                </div>
                <AddArea fetchAreas={fetchAndSetAreas} />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
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
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">
                    Total Areas
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {areas.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">
                    Total Locations
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {areas.reduce(
                      (total, area) => total + (area.locations?.length || 0),
                      0
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">
                    Active Areas
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {areas.filter((area) => area.locations?.length > 0).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table Section - Takes remaining space */}
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Areas Overview
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Click any row to edit</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading areas...</span>
                </div>
              ) : (
                <div className="h-full">
                  <DataTable
                    data={areas}
                    columns={areaColumns}
                    rowSelection={rowSelection}
                    setRowSelection={setRowSelection}
                    usePagination={false}
                    enableRowClick={true}
                    handleRowClick={handleRowClick}
                    fetchFunction={fetchAreas}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
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
