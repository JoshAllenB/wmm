import React, { useState, useEffect, useCallback } from "react";
import { fetchUsers } from "../../Table/Data/usersdata";
import { userColumns } from "../../Table/Structure/userColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import Edit from "../../CRUD/AdminPanel/edit";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [, setCurrentUser] = useState(null);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchUsersData = useCallback(async () => {
    const [fetchedUsers, fetchedCurrentUser] = await fetchUsers();
    setUsers(fetchedUsers);
    setCurrentUser(fetchedCurrentUser);
    return fetchedUsers;
  }, []);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const handleDeleteSuccess = useCallback(
    (deletedUserId) => {
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user._id !== deletedUserId)
      );
      fetchUsersData();
    },
    [fetchUsersData]
  );

  const handleRowClick = (event, row) => {
    setSelectedRow(row.original); // Set the selected row data
    setShowEditModal(true); // Show the Edit component
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setSelectedRow(null);
  };

  return (
    <div className="m-[30px]">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <Add fetchUsers={fetchUsersData} />
      <DataTable
        data={users}
        columns={userColumns}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        usePagination={false}
        useHoverCard={false}
        enableEdit={true}
        enableRowClick={true}
        EditComponent={(props) => (
          <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
        fetchFunction={fetchUsersData}
        handleRowClick={handleRowClick}
      />
      {showEditModal && (
        <Edit
          rowData={selectedRow}
          onClose={handleEditClose}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default AdminPanel;
