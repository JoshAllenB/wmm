import { useEffect, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import Delete from "./delete";
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";

const Edit = ({ rowData, onDeleteSuccess, onClose, type = "user" }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [],
    name: "", // for role/permission
    permissions: [],
    oldpassword: "",
    newpassword: "",
  });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRolesAndPermissions = async () => {
      try {
        const [rolesRes, permissionsRes] = await Promise.all([
          userService.getRoles(),
          userService.getPermissions(),
        ]);
        setRoles(rolesRes);
        setPermissions(permissionsRes);

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
        toast.error("Failed to load roles and permissions");
      }
    };
    fetchRolesAndPermissions();
    setShowModal(true);
  }, [rowData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let dataToSend;

      if (type === "user") {
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
        dataToSend = {
          name: formData.name,
          defaultPermissions: formData.permissions,
        };
      } else if (type === "permission") {
        dataToSend = { name: formData.name };
      }

      await userService.updateUser(rowData._id, dataToSend);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`
      );
      onClose();
    } catch (err) {
      console.error(`Error updating ${type}:`, err);
      toast.error(`Failed to update ${type}. Please try again.`);
    } finally {
      setIsSubmitting(false);
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

  const handleDelete = async () => {
    try {
      await userService.deleteUser(rowData._id);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`
      );
      onDeleteSuccess(rowData._id);
      onClose();
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      toast.error(`Failed to delete ${type}. Please try again.`);
    }
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={showModal} onClose={onClose}>
          <div className="bg-white rounded-lg w-[400px]">
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
                    required
                  />

                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="changePassword"
                      checked={showPasswordFields}
                      onChange={() =>
                        setShowPasswordFields(!showPasswordFields)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="changePassword"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Change Password
                    </label>
                  </div>

                  {showPasswordFields && (
                    <>
                      <InputField
                        label="Current Password"
                        name="oldpassword"
                        type="password"
                        value={formData.oldpassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <InputField
                        label="New Password"
                        name="newpassword"
                        type="password"
                        value={formData.newpassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </>
                  )}

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
                    required
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
                          checked={formData.permissions.includes(
                            permission._id
                          )}
                          onChange={() =>
                            handlePermissionChange(permission._id)
                          }
                          className="form-checkbox h-4 w-4 text-blue-500"
                        />
                        <span className="text-sm">{permission.name}</span>
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
                    required
                  />
                </>
              )}

              <div className="flex justify-between items-center mt-6">
                <Delete onDelete={handleDelete} />
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Edit;
