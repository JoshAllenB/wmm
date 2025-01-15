import { useState, useEffect } from "react";
import axios from "axios";
import Modal from "../../modal";
import { Button } from "../../UI/ShadCN/button";
import InputField from "../input";

const Add = ({ type = "user" }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [],
    name: "", // for role/permission
    description: "", // for permission
    defaultPermissions: [],
  });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setFormData({
      username: "",
      password: "",
      roles: [],
      name: "",
      description: "",
      defaultPermissions: [],
    });
    setSelectedRoles([]);
    setRolePermissions({});
  };

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
      } catch (err) {
        console.error("Error fetching roles and permissions:", err);
      }
    };
    fetchRolesAndPermissions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === "user" && selectedRoles.length === 0) {
      alert("Please select at least one role for the user.");
      return;
    }
    try {
      let endpoint;
      let dataToSend;

      if (type === "user") {
        endpoint = "http://localhost:3001/users/add";
        dataToSend = {
          username: formData.username,
          password: formData.password,
          roles: selectedRoles.map((role) => ({
            role: role._id,
            customPermissions: rolePermissions[role._id] || [],
          })),
        };
        console.log("Sending user data:", dataToSend); // Add this line
      } else if (type === "role") {
        endpoint = "http://localhost:3001/roles/roles/add";
        dataToSend = {
          name: formData.name,
          defaultPermissions: formData.defaultPermissions,
        };
      } else if (type === "permission") {
        endpoint = "http://localhost:3001/roles/permissions/add";
        dataToSend = {
          name: formData.name,
          description: formData.description,
        };
      }

      const response = await axios.post(endpoint, dataToSend, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      console.log("Server response:", response.data); // Add this line
      closeModal();
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
      if (err.response) {
        console.error("Server error response:", err.response.data); // Add this line
      }
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
      defaultPermissions: prevData.defaultPermissions.includes(permissionId)
        ? prevData.defaultPermissions.filter((id) => id !== permissionId)
        : [...prevData.defaultPermissions, permissionId],
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
      <Button
        onClick={openModal}
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-200"
      >
        Add {type.charAt(0).toUpperCase() + type.slice(1)}
      </Button>
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-gray-800 font-bold">
                Add New {type.charAt(0).toUpperCase() + type.slice(1)}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              ></button>
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
                  <InputField
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
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
                </>
              ) : type === "role" ? (
                <>
                  <InputField
                    label="Role Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Default Permissions:
                    </h3>
                    {permissions.map((permission) => (
                      <label
                        key={permission._id}
                        className="flex items-center space-x-2 text-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={formData.defaultPermissions.includes(
                            permission._id
                          )}
                          onChange={() =>
                            handlePermissionChange(permission._id)
                          }
                          className="form-checkbox h-5 w-5 text-blue-600"
                        />
                        <span>{permission.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <InputField
                    label="Permission Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <InputField
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
              >
                Add {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Add;
