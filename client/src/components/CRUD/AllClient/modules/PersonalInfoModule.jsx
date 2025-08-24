import React from "react";
import InputField from "../../input.jsx";

const PersonalInfoModule = ({
  formData,
  handleChange,
  months,
  types,
  groups,
}) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Personal Information
      </h2>
      <div className="space-y-3">
        <div className="mb-4">
          <label className="block text-black text-xl mb-1">
            Special Package:
          </label>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="spack"
              name="spack"
              checked={formData.spack || false}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: "spack",
                    value: e.target.checked,
                  },
                })
              }
              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="spack" className="ml-2 text-gray-700 text-base">
              Mark as Special Package
            </label>
          </div>
        </div>
        <InputField
          label="Title:"
          id="title"
          name="title"
          value={formData.title || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="First Name:"
          id="fname"
          name="fname"
          value={formData.fname || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Middle Name:"
          id="mname"
          name="mname"
          value={formData.mname || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Last Name:"
          id="lname"
          name="lname"
          value={formData.lname || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <InputField
          label="Suffix:"
          id="sname"
          name="sname"
          value={formData.sname || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
        <div className="mb-2">
          <label className="block text-black text-base mb-1">Birth Date:</label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <select
                id="bdateMonth"
                name="bdateMonth"
                value={formData.bdateMonth || ""}
                onChange={handleChange}
                className="w-full p-2 text-base border rounded-md border-gray-300"
              >
                <option value="">Month</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              id="bdateDay"
              name="bdateDay"
              value={formData.bdateDay || ""}
              onChange={handleChange}
              placeholder="DD"
              className="w-full p-2 text-base border rounded-md border-gray-300"
              maxLength="2"
            />
            <input
              type="text"
              id="bdateYear"
              name="bdateYear"
              value={formData.bdateYear || ""}
              onChange={handleChange}
              placeholder="YYYY"
              className="w-full p-2 text-base border rounded-md border-gray-300"
              maxLength="4"
            />
          </div>
        </div>
        <InputField
          label="Company:"
          id="company"
          name="company"
          value={formData.company || ""}
          onChange={handleChange}
          uppercase={true}
          className="text-base"
        />
      </div>
    </div>
  );
};

export default PersonalInfoModule;
