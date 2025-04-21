import React, { useState, useEffect, useCallback } from "react";
import { userColumns } from "../../Table/Structure/userColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import Edit from "../../CRUD/AdminPanel/edit";
import { Input } from "../ShadCN/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ShadCN/select";
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [, setCurrentUser] = useState(null);
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    loggedOffUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getUsers();
      const fetchedUsers = Array.isArray(response)
        ? response
        : response.data || [];
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);

      // Calculate stats
      const activeUsers = fetchedUsers.filter(
        (user) => user.status === "Active"
      ).length;
      const inactiveUsers = fetchedUsers.filter(
        (user) => user.status === "Inactive"
      ).length;
      const loggedOffUsers = fetchedUsers.filter(
        (user) => user.status === "Logged Off"
      ).length;

      setStats({
        totalUsers: fetchedUsers.length,
        activeUsers,
        inactiveUsers,
        loggedOffUsers,
      });

      return fetchedUsers;
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Please try again later.");
      toast.error("Failed to load users");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  useEffect(() => {
    let result = users;

    // Apply search filter
    if (searchTerm) {
      result = result.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(result);
  }, [searchTerm, statusFilter, users]);

  const handleDeleteSuccess = useCallback(
    (deletedUserId) => {
      setUsers((prevUsers) =>
        prevUsers.filter((user) => user._id !== deletedUserId)
      );
      fetchUsersData();
      toast.success("User deleted successfully");
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
    <div className="m-2">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
        <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Active Users</p>
          <p className="text-2xl font-bold">{stats.activeUsers}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">Inactive Users</p>
          <p className="text-2xl font-bold">{stats.inactiveUsers}</p>
        </div>
        <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Logged-off Users</p>
          <p className="text-2xl font-bold">{stats.loggedOffUsers}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-4">
        <Add fetchUsers={fetchUsersData} />

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-[250px]"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Logged Off">Logged Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      ) : null}

      <DataTable
        data={filteredUsers}
        columns={userColumns}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        usePagination={true}
        initialPageSize={10}
        useHoverCard={false}
        enableEdit={true}
        enableRowClick={true}
        EditComponent={(props) => (
          <Edit {...props} onDeleteSuccess={handleDeleteSuccess} />
        )}
        fetchFunction={() => Promise.resolve(filteredUsers)}
        handleRowClick={handleRowClick}
        isLoading={isLoading}
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
