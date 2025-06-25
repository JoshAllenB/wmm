import { useMemo } from 'react';
import InputField from "../input";

const PersonalInfoFilter = ({ filterData, handleChange }) => {
  // Memoize the input fields to prevent unnecessary re-renders
  const inputFields = useMemo(() => (
    <div className="space-y-2">
      <InputField
        label="First Name"
        id="fname"
        name="fname"
        value={filterData.fname}
        onChange={handleChange}
        className={`w-full text-base ${
          filterData.fname ? "border-blue-500 bg-blue-50" : ""
        }`}
        labelClassName="text-lg font-medium text-black"
        uppercase={true}
      />
      <InputField
        label="Last Name"
        id="lname"
        name="lname"
        value={filterData.lname}
        onChange={handleChange}
        className={`w-full text-base ${
          filterData.lname ? "border-blue-500 bg-blue-50" : ""
        }`}
        labelClassName="text-lg font-medium text-black"
        uppercase={true}
      />
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="Middle Name"
          id="mname"
          name="mname"
          value={filterData.mname}
          onChange={handleChange}
          className={`w-full text-base ${
            filterData.mname ? "border-blue-500 bg-blue-50" : ""
          }`}
          labelClassName="text-lg font-medium text-black"
          uppercase={true}
        />
        <InputField
          label="Suffix"
          id="sname"
          name="sname"
          value={filterData.sname}
          onChange={handleChange}
          className={`w-full text-base ${
            filterData.sname ? "border-blue-500 bg-blue-50" : ""
          }`}
          labelClassName="text-lg font-medium text-black"
          uppercase={true}
        />
      </div>
      <InputField
        label="Birth Date"
        id="birthdate"
        name="birthdate"
        type="date"
        value={filterData.birthdate}
        onChange={handleChange}
        className={`w-full text-base ${
          filterData.birthdate ? "border-blue-500 bg-blue-50" : ""
        }`}
        labelClassName="text-lg font-medium text-black"
      />
    </div>
  ), [
    filterData.fname,
    filterData.lname,
    filterData.mname,
    filterData.sname,
    filterData.birthdate,
    handleChange
  ]);

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Personal Information
      </h2>
      {inputFields}
    </div>
  );
};

export default PersonalInfoFilter; 