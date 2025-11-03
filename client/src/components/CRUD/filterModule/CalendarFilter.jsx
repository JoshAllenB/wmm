const CalendarFilter = ({ filterData, handleChange }) => {
  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-2 border-b">
        Calendar Status
      </h2>
      <div className="space-y-2">
        {/* Calendar Received/Not Received Status */}
        <div className="flex gap-5">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="calendarReceived"
              name="calendarReceived"
              checked={filterData.calendarReceived}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: "calendarReceived",
                    value: e.target.checked,
                  },
                })
              }
              className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="calendarReceived"
              className="ml-2 text-lg text-black"
            >
              Calendar Received
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="calendarNotReceived"
              name="calendarNotReceived"
              checked={filterData.calendarNotReceived}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: "calendarNotReceived",
                    value: e.target.checked,
                  },
                })
              }
              className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="calendarNotReceived"
              className="ml-2 text-lg text-black"
            >
              Calendar Not Received
            </label>
          </div>
        </div>

        {/* Calendar Entitlement Filter */}
        <div className="border-t pt-2">
          <h3 className="text-black text-md font-semibold mb-2">
            Calendar Entitlement
          </h3>
          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="calendarEntitledOnly"
                name="calendarEntitledOnly"
                checked={filterData.calendarEntitledOnly || false}
                onChange={handleChange}
                className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="calendarEntitledOnly"
                className="ml-2 text-sm text-black"
              >
                Only clients entitled for Calendar (subscription ends on/beyond
                December)
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilter;
