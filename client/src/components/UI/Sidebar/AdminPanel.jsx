import { useState, useEffect } from "react";
import { fetchUsers } from "../../Table/Data/usersdata";
import { userColumns } from "../../Table/Structure/userColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import io from "socket.io-client";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetchedUsers = await fetchUsers();

        setUsers(fetchedUsers);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();

    const socket = io("http://localhost:3001");

    socket.on("user_status_change", ({ userId, status }) => {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user._id === userId ? { ...user, status: { status } } : user
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchDataWrapper = async (setData) => {
    try {
      const fetchedUsers = await fetchUsers();
      setData(fetchedUsers);
    } catch (err) {
      setError(err.message);
    }
  };
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="m-[30px]">
      <h1 className="text-xl font-bold mb-4">Admin Panel</h1>
      <Add />
      <DataTable
        columns={userColumns}
        initialData={users}
        fetchData={fetchDataWrapper}
        usePagination={false}
        useHoverCard={false}
        enableEdit={false}
        enableRowClick={false}
      />
    </div>
  );
}
