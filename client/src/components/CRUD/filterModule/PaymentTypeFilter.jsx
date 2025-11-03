import React from "react";

const PaymentTypeFilter = ({ filterData, handleChange }) => {
  // Custom handler to ensure mutual exclusivity
  const handlePaymentTypeChange = (e) => {
    const { name, checked } = e.target;

    // Create a synthetic event for the other checkbox
    const otherName = name === "massPaid" ? "cashPaid" : "massPaid";
    const otherEvent = {
      target: {
        name: otherName,
        type: "checkbox",
        checked: false, // Always uncheck the other one
      },
    };

    // Handle the clicked checkbox
    handleChange(e);

    // If the clicked checkbox is being checked, uncheck the other one
    if (checked) {
      handleChange(otherEvent);
    }
  };

  return (
    <div className="p-2 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b">
        Payment Type
      </h2>
      <div className="flex gap-5">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="massPaid"
            id="massPaid"
            checked={filterData.massPaid}
            onChange={handlePaymentTypeChange}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="massPaid" className="ml-2 text-lg text-black">
            Mass Paid
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="cashPaid"
            id="cashPaid"
            checked={filterData.cashPaid}
            onChange={handlePaymentTypeChange}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="cashPaid" className="ml-2 text-lg text-black">
            Cash Paid
          </label>
        </div>
      </div>
    </div>
  );
};

export default PaymentTypeFilter;
