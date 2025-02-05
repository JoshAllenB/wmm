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

  const fetchAndSetAreas = useCallback(async () => {
    const areasData = await fetchAreas();

    // Process data to match Name, Zipcode, and Description
    const formattedAreas = areasData.map((area) => ({
      areaCode: area._id,
      locations: area.locations.map((loc) => ({
        name: loc.name,
        zipcode: loc.zipcode,
        description: loc.description,
      })),
    }));

    console.log("Formatted Areas:", formattedAreas);
    setAreas(formattedAreas);
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
        area.areaCode === updatedData._id ? updatedData : area
      )
    );
    handleEditClose();
  };

  const handleDeleteSuccess = (deletedId) => {
    setAreas((prevData) =>
      prevData.filter((area) => area.areaCode !== deletedId)
    );
    handleEditClose();
  };

  return (
    <div className="m-[30px]">
      <h1 className="text-2xl font-bold mb-4">Area Management</h1>
      <AddArea fetchAreas={fetchAndSetAreas} />
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
      {showEditModal && selectedRow && (
        <EditArea
          areaId={selectedRow.areaCode}
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
