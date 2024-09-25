import { useCallback, useState } from "react";
import { fetchUsers } from "../../Table/Data/usersdata";
import { userColumns } from "../../Table/Structure/userColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import Edit from "../../CRUD/AdminPanel/edit";

export default function AdminPanel() {
  const [, setUsers] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const handleDeleteSuccess = useCallback((deletedUserId) => {
    setUsers((prevUsers) =>
      prevUsers.filter((user) => user._id !== deletedUserId),
    );
    fetchUsers(setUsers);
  }, []);

  return (
    <div className="m-[30px]">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <Add fetchUsers={() => fetchUsers(setUsers)} />
      <DataTable
        fetchFunction={fetchUsers}
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
      />
    </div>
  );
}
