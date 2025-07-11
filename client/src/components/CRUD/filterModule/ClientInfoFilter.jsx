const ClientInfoFilter = ({
  filterData,
  handleChange,
}) => {
  const inputClasses = "w-full p-2 border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:border-gray-400 transition-colors";

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
        Client Information
      </h2>
      <div className="space-y-4">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-medium text-black mb-2">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lname"
                value={filterData.lname}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter last name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                First Name
              </label>
              <input
                type="text"
                name="fname"
                value={filterData.fname}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Middle Name
              </label>
              <input
                type="text"
                name="mname"
                value={filterData.mname}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter middle name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Suffix
              </label>
              <input
                type="text"
                name="sname"
                value={filterData.sname}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter suffix"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-black mb-1">
                Birth Date
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <select
                    name="birthdateMonth"
                    value={filterData.birthdateMonth}
                    onChange={handleChange}
                    className={inputClasses}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    name="birthdateDay"
                    value={filterData.birthdateDay}
                    onChange={handleChange}
                    placeholder="Day"
                    maxLength="2"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="birthdateYear"
                    value={filterData.birthdateYear}
                    onChange={handleChange}
                    placeholder="Year"
                    maxLength="4"
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-black mb-2">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={filterData.email}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Cell Number
              </label>
              <input
                type="text"
                name="cellno"
                value={filterData.cellno}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter cell number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Office Number
              </label>
              <input
                type="text"
                name="ofcno"
                value={filterData.ofcno}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter office number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Other Contact
              </label>
              <input
                type="text"
                name="contactnos"
                value={filterData.contactnos}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter other contact numbers"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-black mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={filterData.address}
              onChange={handleChange}
              className={inputClasses}
              rows={3}
              placeholder="Enter address"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoFilter; 