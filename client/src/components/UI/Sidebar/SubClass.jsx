import React, { useCallback, useState, useEffect, useMemo } from "react";
import { fetchSubclasses } from "../../Table/Data/utilData";
import { subClassColumns } from "../../Table/Structure/subClassColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/SubClass/add";
import Edit from "../../CRUD/SubClass/edit";

const SubClass = () => {
  const [users, setUsers] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchAndSetSubclasses = useCallback(async () => {
    const subclasses = await fetchSubclasses();
    setUsers(subclasses);
  }, []);

  useEffect(() => {
    fetchAndSetSubclasses();
  }, [fetchAndSetSubclasses]);

  const handleRowClick = (event, row) => {
    setSelectedRow(row.original);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedRow(null);
  };

  const handleEditSuccess = (updatedData) => {
    setUsers((prevData) =>
      prevData.map((user) => (user.id === updatedData.id ? updatedData : user))
    );
    handleEditClose();
  };

  const handleDeleteSuccess = (deletedId) => {
    setUsers((prevData) => prevData.filter((user) => user.id !== deletedId));
    handleEditClose();
  };

  return (
    <div className="m-[30px]">
      <h1 className="text-2xl font-bold mb-4">Subscription Classification</h1>
      <Add fetchSubclasses={fetchAndSetSubclasses} />
      <DataTable
        data={users}
        columns={subClassColumns}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        usePagination={false}
        enableRowClick={false}
        handleRowClick={handleRowClick}
        fetchFunction={fetchSubclasses}
        EditComponent={(props) => (
          <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
      />
      {showEditModal && (
        <Edit
          rowData={selectedRow}
          onClose={handleEditClose}
          onEditSuccess={handleEditSuccess}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default SubClass;
