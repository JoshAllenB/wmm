const SubscriptionTypeSelector = ({
  subscriptionType,
  setSubscriptionType,
}) => {
  const options = [
    { label: "None", value: "None", color: "gray" },
    { label: "WMM", value: "WMM", color: "blue" },
    { label: "Promo", value: "Promo", color: "emerald" },
    { label: "Complimentary", value: "Complimentary", color: "purple" },
  ];

  return (
    <div>
      <div className="flex justify-center w-full gap-2 bg-gray-100 rounded-lg p-1">
        {options.map(({ label, value, color }) => {
          const isActive = subscriptionType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSubscriptionType(value)}
              className={`flex-1 text-base font-bold rounded-md py-1 transition-all duration-200 
                ${
                  isActive
                    ? `bg-${color}-600 text-white shadow-sm`
                    : `text-gray-700 hover:bg-${color}-100`
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionTypeSelector;
