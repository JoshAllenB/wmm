import { useEffect, useState } from "react";
import { Button } from "../../UI/ShadCN/button";
import Modal from "../../modal";
import InputField from "../input";
import userService from "../../../services/userService";
import { toast } from "react-hot-toast";

const Edit = ({ rowData, onDeleteSuccess, onClose, type = "user" }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: [],
    name: "",
    permissions: [],
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
    setIsDeleting(true);
    try {
      await userService.deleteUser(rowData._id);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`
      );
      onDeleteSuccess(rowData._id);
      setShowDeleteConfirmation(false);
      onClose();
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      toast.error(`Failed to delete ${type}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {showModal && (
        <Modal isOpen={showModal} onClose={onClose}>
          <div className="bg-white rounded-xl w-[500px] max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100">
              <h2 className="text-2xl text-gray-900 font-semibold">
                Edit {type.charAt(0).toUpperCase() + type.slice(1)}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {type === "user" ? (
                <>
                  <div className="space-y-4">
                    <InputField
                      label="Username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />

                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="changePassword"
                        checked={showPasswordFields}
                        onChange={() => setShowPasswordFields(!showPasswordFields)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors duration-200"
                      />
                      <label
                        htmlFor="changePassword"
                        className="ml-3 text-sm font-medium text-gray-700"
                      >
                        Change User's Password
                      </label>
                    </div>

                    {showPasswordFields && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <InputField
                          label="New Password"
                          name="newpassword"
                          type="password"
                          value={formData.newpassword}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
                      Roles and Permissions
                    </h3>
                    <div className="space-y-3">
                      {roles.map((role) => (
                        <div key={role._id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors duration-200">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedRoles.some((r) => r._id === role._id)}
                              onChange={() => handleRoleChange(role._id)}
                              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-colors duration-200"
                            />
                            <span className="font-medium text-gray-800">{role.name}</span>
                          </label>
                          
                          {selectedRoles.some((r) => r._id === role._id) && (
                            <div className="mt-3 ml-8 space-y-2">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Custom Permissions
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {permissions.map((permission) => (
                                  <label
                                    key={permission._id}
                                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={rolePermissions[role._id]?.includes(permission._id)}
                                      onChange={() => handleRolePermissionChange(role._id, permission._id)}
                                      className="h-4 w-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500 transition-colors duration-200"
                                    />
                                    <span className="text-sm">{permission.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : type === "role" ? (
                <>
                  <InputField
                    label="Role Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
                      Default Permissions
                    </h3>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                      {permissions.map((permission) => (
                        <label
                          key={permission._id}
                          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission._id)}
                            onChange={() => handlePermissionChange(permission._id)}
                            className="h-4 w-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500 transition-colors duration-200"
                          />
                          <span className="text-sm font-medium">{permission.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <InputField
                  label="Permission Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              )}

              <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 flex justify-between items-center">
                <Button 
                  type="button"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200" 
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={isDeleting}
                >
                  Delete
                </Button>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={onClose}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center space-x-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Saving...</span>
                      </span>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {showDeleteConfirmation && (
        <Modal
          isOpen={showDeleteConfirmation}
          onClose={() => !isDeleting && setShowDeleteConfirmation(false)}
        >
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete {type.charAt(0).toUpperCase() + type.slice(1)}
            </h2>
            <p className="text-gray-500 text-center mb-6">
              Are you sure you want to delete this {type}? This action cannot be undone.
            </p>
            
            <div className="flex justify-center space-x-3">
              <Button
                onClick={() => setShowDeleteConfirmation(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Deleting...</span>
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Edit;
