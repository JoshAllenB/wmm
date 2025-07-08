import React, { useState, useEffect, useCallback } from "react";
import { userColumns } from "../../Table/Structure/userColumn";
import { roleColumns } from "../../Table/Structure/roleColumn";
import DataTable from "../../Table/DataTable";
import Add from "../../CRUD/AdminPanel/add";
import AddRole from "../../CRUD/AdminPanel/AddRole";
import EditRole from "../../CRUD/AdminPanel/EditRole";
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
import LogsView from "../Logs/LogsView";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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
  const [activeTab, setActiveTab] = useState("users");
  const [dataInitialized, setDataInitialized] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);

  // Fetch roles data
  const fetchRolesData = useCallback(async () => {
    if (!dataInitialized) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await userService.getRoles();
        console.log("Raw roles response:", response);
        
        // Ensure we have an array of roles
        let rolesArray = [];
        if (Array.isArray(response)) {
          rolesArray = response;
        } else if (response?.roles && Array.isArray(response.roles)) {
          rolesArray = response.roles;
        } else if (response?.data?.roles && Array.isArray(response.data.roles)) {
          rolesArray = response.data.roles;
        } else if (typeof response === 'object' && response !== null) {
          rolesArray = [response];
        }
        
        console.log("Processed roles array:", rolesArray);
        setRoles(rolesArray);
        return rolesArray;
      } catch (err) {
        console.error("Error fetching roles:", err);
        const errorMessage = err.response?.data?.error || err.message || "Failed to load roles";
        setError(errorMessage);
        toast.error(errorMessage);
        return [];
      } finally {
        setIsLoading(false);
        setDataInitialized(true);
      }
    }
    return roles; // Return current roles if already initialized
  }, [dataInitialized, roles]);

  // Fetch users data
  const fetchUsersData = useCallback(async () => {
    if (!dataInitialized) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await userService.getUsers();
        const fetchedUsers = Array.isArray(response) ? response : response.data || [];
        setUsers(fetchedUsers);
        setFilteredUsers(fetchedUsers);

        // Calculate stats
        const activeUsers = fetchedUsers.filter((user) => user.status === "Active").length;
        const inactiveUsers = fetchedUsers.filter((user) => user.status === "Inactive").length;
        const loggedOffUsers = fetchedUsers.filter((user) => user.status === "Logged Off").length;

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
        setDataInitialized(true);
      }
    }
  }, [dataInitialized]);

  useEffect(() => {
    setDataInitialized(false); // Reset initialization flag when tab changes
    if (activeTab === "users") {
      fetchUsersData();
    } else if (activeTab === "roles") {
      fetchRolesData();
    }
  }, [activeTab]);

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

  const handleDeleteSuccess = useCallback((deletedUserId) => {
    setUsers((prevUsers) => prevUsers.filter((user) => user._id !== deletedUserId));
    setDataInitialized(false); // Reset initialization to trigger a refresh
    toast.success("User deleted successfully");
  }, []);

  const handleRowClick = useCallback((event, row) => {
    setSelectedRow(row.original);
    setShowEditModal(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setShowEditModal(false);
    setSelectedRow(null);
  }, []);

  const handleRoleRowClick = useCallback((event, row) => {
    setSelectedRole(row.original);
    setShowEditRoleModal(true);
  }, []);

  const handleEditRoleClose = useCallback(() => {
    setShowEditRoleModal(false);
    setSelectedRole(null);
  }, []);

  const handleRoleDeleteSuccess = useCallback((deletedRoleId) => {
    setRoles((prevRoles) => prevRoles.filter((role) => role._id !== deletedRoleId));
    setDataInitialized(false); // Trigger a refresh
  }, []);

  return (
    <div className="m-2">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-4 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === "users"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("users")}
        >
          Users Management
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "roles"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("roles")}
        >
          Roles Management
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "logs"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("logs")}
        >
          Activity Logs
        </button>
      </div>

      {activeTab === "users" ? (
        <>
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
        </>
      ) : activeTab === "roles" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Roles</h2>
            <AddRole onRoleAdded={() => setDataInitialized(false)} />
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
            data={roles}
            columns={roleColumns}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            usePagination={true}
            initialPageSize={10}
            useHoverCard={false}
            enableEdit={true}
            enableRowClick={true}
            handleRowClick={handleRoleRowClick}
            fetchFunction={fetchRolesData}
            isLoading={isLoading}
          />
          {showEditRoleModal && selectedRole && (
            <EditRole
              rowData={selectedRole}
              onClose={handleEditRoleClose}
              onDeleteSuccess={handleRoleDeleteSuccess}
            />
          )}
        </div>
      ) : (
        <LogsView />
      )}
    </div>
  );
};

export default AdminPanel;
