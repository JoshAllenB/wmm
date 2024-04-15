const InputField = ({ label, name, value, onChange, type = "text" }) => (
  <div className="flex flex-col mb-4">
    <label htmlFor={name}>{label}</label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 rounded-md px-3 py-2"
    />
  </div>
);

export default InputField