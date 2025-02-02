const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) => (
  <div className="flex flex-col mb-4">
    <label
      htmlFor={name}
      className="block text-sm font-medium leading-6 text-gray-600"
    >
      {label}
    </label>

    <input
      type={type}
      id={name}
      name={name}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-2 ring-gray-300 placeholder:text-gray-300 focus:ring-3 p-3"
    />
  </div>
);

export default InputField;
