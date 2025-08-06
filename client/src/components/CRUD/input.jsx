import React from "react";

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  uppercase = false,
  className = "",
  autoComplete = "off", // Default to "off"
  required = false, // Add required prop
}) => {
  // Use React refs to handle cursor position
  const inputRef = React.useRef(null);
  const [cursorPosition, setCursorPosition] = React.useState(null);

  // After render, restore cursor position if needed
  React.useEffect(() => {
    if (cursorPosition !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      setCursorPosition(null);
    }
  }, [cursorPosition, value]);

  // Handle input changes, converting to uppercase if needed
  const handleInputChange = (e) => {
    const { type: inputType, selectionStart } = e.target;

    // Save cursor position before the state update
    if (uppercase && inputType !== "checkbox") {
      setCursorPosition(selectionStart);
    }

    // Only apply uppercase transformation to text-based inputs
    if (
      uppercase &&
      typeof e.target.value === "string" &&
      (type === "text" || type === "email" || type === "textarea")
    ) {
      e.target.value = e.target.value.toUpperCase();
    }

    onChange(e);
  };

  return (
    <div className="mb-2">
      <label htmlFor={name} className="block text-black text-xl mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          ref={inputRef}
          id={name}
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full p-2 text-lg border-2 rounded-md border-gray-300 ${className}`}
          autoComplete={autoComplete} // Add autoComplete prop
        />
      ) : (
        <input
          ref={inputRef}
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`
            w-full p-2 text-lg border-2 rounded-md 
            border-gray-300 
            focus:border-blue-500 
            focus:outline-none 
            focus:ring-4 
            focus:ring-blue-200 
            transition-all 
            duration-300 
            ${className}
          `}
          autoComplete={autoComplete} // Add autoComplete prop
        />
      )}
    </div>
  );
};

export default InputField;
