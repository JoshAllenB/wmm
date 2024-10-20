import { useEffect, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import axios from "axios";
import Delete from "./delete";

const Edit = ({ rowData, onDeleteSuccess, onClose, type = "user" }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [],
    name: "", // for role/permission
    permissions: [],
  });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  useEffect(() => {
    const fetchRolesAndPermissions = async () => {
      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          axios.get("http://localhost:3001/roles/roles", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }),
          axios.get("http://localhost:3001/roles/permissions", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }),
        ]);
        setRoles(rolesRes.data);
        setPermissions(permissionsRes.data);

        if (rowData) {
          setFormData((prevFormData) => ({
            ...prevFormData,
            ...rowData,
          }));
          setSelectedRoles(rowData.roles.map((r) => r.role));

          // Initialize rolePermissions
          const initialRolePermissions = {};
          rowData.roles.forEach((role) => {
            initialRolePermissions[role.role._id] = role.customPermissions.map(
              (p) => p._id
            );
          });
          setRolePermissions(initialRolePermissions);
        }
      } catch (err) {
        console.error("Error fetching roles and permissions:", err);
      }
    };
    fetchRolesAndPermissions();
    setShowModal(true);
  }, [rowData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let endpoint;
      let dataToSend;

      if (type === "user") {
        endpoint = `http://localhost:3001/users/update/${rowData._id}`;
        dataToSend = {
          username: formData.username,
          roles: selectedRoles.map((role) => ({
            role: role._id,
            customPermissions: rolePermissions[role._id] || [],
          })),
        };
        if (showPasswordFields) {
          dataToSend.oldpassword = formData.oldpassword;
          dataToSend.newpassword = formData.newpassword;
        }
      } else if (type === "role") {
        endpoint = `http://localhost:3001/roles/roles/${rowData._id}`;
        dataToSend = {
          name: formData.name,
          defaultPermissions: formData.permissions,
        };
      } else if (type === "permission") {
        endpoint = `http://localhost:3001/roles/permissions/${rowData._id}`;
        dataToSend = { name: formData.name };
      }

      console.log("Sending data:", JSON.stringify(dataToSend, null, 2));

      const response = await axios.put(endpoint, dataToSend, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Server response:", response.data);
      onClose();
    } catch (err) {
      console.error(`Error updating ${type}:`, err);
      if (err.response) {
        console.error("Server error response:", err.response.data);
        console.error("Status code:", err.response.status);
        console.error("Headers:", err.response.headers);

        // Add this block to log the full error object
        console.error("Full error object:", JSON.stringify(err, null, 2));

        if (err.response.data && err.response.data.error) {
          alert(`Failed to update ${type}: ${err.response.data.error}`);
        } else {
          alert(
            `Failed to update ${type}. Please check the console for more details.`
          );
        }
      } else if (err.request) {
        console.error("No response received:", err.request);
        alert(`No response received from the server. Please try again later.`);
      } else {
        console.error("Error setting up request:", err.message);
        alert(
          `An error occurred while setting up the request. Please try again.`
        );
      }
      alert(
        `Failed to update ${type}. Please check the console for more details.`
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleRoleChange = (roleId) => {
    const role = roles.find((r) => r._id === roleId);
    setSelectedRoles((prev) =>
      prev.some((r) => r._id === roleId)
        ? prev.filter((r) => r._id !== roleId)
        : [...prev, role]
    );
    if (!rolePermissions[roleId]) {
      setRolePermissions((prev) => ({ ...prev, [roleId]: [] }));
    }
  };

  const handlePermissionChange = (permissionId) => {
    setFormData((prevData) => ({
      ...prevData,
      permissions: prevData.permissions.includes(permissionId)
        ? prevData.permissions.filter((id) => id !== permissionId)
        : [...prevData.permissions, permissionId],
    }));
  };

  const handleRolePermissionChange = (roleId, permissionId) => {
    setRolePermissions((prev) => ({
      ...prev,
      [roleId]: prev[roleId].includes(permissionId)
        ? prev[roleId].filter((id) => id !== permissionId)
        : [...prev[roleId], permissionId],
    }));
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={showModal} onClose={onClose}>
          <div className="bg-white rounded-lg shadow-xl p-6  w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-gray-800 font-bold">
                Edit {type.charAt(0).toUpperCase() + type.slice(1)}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {type === "user" ? (
                <>
                  <InputField
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Roles and Permissions:
                    </h3>
                    {roles.map((role) => (
                      <div key={role._id} className="bg-gray-50 p-3 rounded-md">
                        <label className="flex items-center space-x-2 text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedRoles.some(
                              (r) => r._id === role._id
                            )}
                            onChange={() => handleRoleChange(role._id)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                          />
                          <span>{role.name}</span>
                        </label>
                        {selectedRoles.some((r) => r._id === role._id) && (
                          <div className="ml-6 mt-2 space-y-1">
                            <h4 className="text-sm font-semibold text-gray-600">
                              Custom Permissions:
                            </h4>
                            {permissions.map((permission) => (
                              <label
                                key={permission._id}
                                className="flex items-center space-x-2 text-gray-600"
                              >
                                <input
                                  type="checkbox"
                                  checked={rolePermissions[role._id]?.includes(
                                    permission._id
                                  )}
                                  onChange={() =>
                                    handleRolePermissionChange(
                                      role._id,
                                      permission._id
                                    )
                                  }
                                  className="form-checkbox h-4 w-4 text-blue-500"
                                />
                                <span className="text-sm">
                                  {permission.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!showPasswordFields ? (
                    <Button
                      type="button"
                      onClick={() => setShowPasswordFields(true)}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
                    >
                      Change Password
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <InputField
                        label="Old Password"
                        name="oldpassword"
                        type="password"
                        value={formData.oldpassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <InputField
                        label="New Password"
                        name="newpassword"
                        type="password"
                        value={formData.newpassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </>
              ) : (
                <InputField
                  label={`${type.charAt(0).toUpperCase() + type.slice(1)} Name`}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              )}
              {type === "role" && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Permissions:</h3>
                  {permissions.map((permission) => (
                    <label
                      key={permission._id}
                      className="flex items-center mb-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(permission._id)}
                        onChange={() => handlePermissionChange(permission._id)}
                        className="mr-2"
                      />
                      {permission.name}
                    </label>
                  ))}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
              >
                Update {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            </form>
            {type === "user" && (
              <div className="mt-6">
                <Delete
                  userId={rowData._id}
                  onClose={onClose}
                  onDeleteSuccess={onDeleteSuccess}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default Edit;
