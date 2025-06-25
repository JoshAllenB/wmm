import { useMemo } from 'react';

const UserFilter = ({
  filterData,
  handleChange,
  users,
  currentUser,
  hasOnlyNonWMMRoles,
  user,
}) => {
  if (hasOnlyNonWMMRoles()) {
    return null;
  }

  // Memoize the user options to prevent unnecessary re-renders
  const userOptions = useMemo(() => {
    const options = [];

    // Add current user option
    if (currentUser) {
      options.push(
        <option key={currentUser._id} value={currentUser._id}>
          Me ({currentUser.username})
        </option>
      );
    }

    // Add other users
    users
      .filter(u => !currentUser || u._id !== currentUser._id)
      .forEach(u => {
        options.push(
          <option key={u._id} value={u._id}>
            {u.username}
          </option>
        );
      });

    return options;
  }, [users, currentUser]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        User Filter
      </h2>
      <div className="space-y-2">
        <label className="block text-lg font-medium text-black">
          Filter by User
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Show entries created or modified by a specific user with your role
        </p>

        <select
          name="userId"
          value={filterData.userId}
          onChange={handleChange}
          className={`w-full p-2 text-base border rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
            filterData.userId ? "border-blue-500 bg-blue-50" : ""
          }`}
        >
          <option value="">All Users</option>
          {userOptions}
        </select>
      </div>
    </div>
  );
};

export default UserFilter; 