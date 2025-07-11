const CalendarFilter = ({
  filterData,
  handleChange,
}) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Calendar Status
      </h2>
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="calendarReceived" className="ml-2 text-lg text-black">
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="calendarNotReceived" className="ml-2 text-lg text-black">
              Calendar Not Received
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilter; 