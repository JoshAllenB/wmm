import { useMemo } from "react";

const UserFilter = ({
  filterData,
  handleChange,
  users,
  addUsers,
  currentUser,
  hasOnlyNonWMMRoles,
  hasRole,
  subscriptionType,
}) => {
  // Memoize the user options to prevent unnecessary re-renders
  const userOptions = useMemo(() => {
    const options = [];

    // Add current user option if they exist
    if (currentUser) {
      options.push(
        <option key={currentUser._id} value={currentUser.username}>
          👤 Me ({currentUser.username})
        </option>
      );
    }

    // Get active usernames for comparison
    const activeUsernames = new Set(users.map((user) => user.username));

    // Separate addUsers into current and historical
    const currentAddUsers = [];
    const historicalAddUsers = [];

    addUsers
      .filter((addUser) => addUser && addUser.trim() !== "") // Filter out empty values
      .sort() // Sort alphabetically for better UX
      .forEach((addUser) => {
        // Skip if it's the current user (already added above)
        if (currentUser && addUser === currentUser.username) {
          return;
        }

        // Check if this addUser is still an active user
        if (activeUsernames.has(addUser)) {
          currentAddUsers.push(addUser);
        } else {
          historicalAddUsers.push(addUser);
        }
      });

    // Add current active users (excluding current user)
    if (currentAddUsers.length > 0) {
      options.push(
        <option
          key="current-users-header"
          disabled
          style={{ fontWeight: "bold", backgroundColor: "#f0f9ff" }}
        >
          ─── Current Active Users ───
        </option>
      );
      currentAddUsers.forEach((addUser) => {
        options.push(
          <option
            key={`current-${addUser}`}
            value={addUser}
            style={{ color: "#059669" }}
          >
            ✅ {addUser}
          </option>
        );
      });
    }

    // Add historical users
    if (historicalAddUsers.length > 0) {
      options.push(
        <option
          key="historical-users-header"
          disabled
          style={{ fontWeight: "bold" }}
        >
          ─── Other Users ───
        </option>
      );
      historicalAddUsers.forEach((addUser) => {
        options.push(
          <option key={`historical-${addUser}`} value={addUser}>
            {addUser}
          </option>
        );
      });
    }

    return options;
  }, [addUsers, currentUser, users]);

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
          Show entries created or modified by a specific user. Current users are
          active system users, while historical users are from old records.
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
