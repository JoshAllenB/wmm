import { useCallback, useState, useEffect } from "react";
import { fetchUsers } from "../../Table/Data/usersdata";
import { userColumns } from "../../Table/Structure/userColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import Edit from "../../CRUD/AdminPanel/edit";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [, setCurrentUser] = useState(null);
  const [rowSelection, setRowSelection] = useState({});

  const fetchUsersData = useCallback(async () => {
    const [fetchedUsers, fetchedCurrentUser] = await fetchUsers();
    setUsers(fetchedUsers);
    setCurrentUser(fetchedCurrentUser);
    return fetchedUsers;
  }, []);

  // Load users when component mounts
  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const handleDeleteSuccess = useCallback(
    (deletedUserId) => {
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user._id !== deletedUserId)
      );
      fetchUsersData(); // Use fetchUsersData instead of loadUsers
    },
    [fetchUsersData]
  );

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
        enableRowClick={false}
        EditComponent={(props) => (
          <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
        fetchFunction={fetchUsersData}
      />
    </div>
  );
}
