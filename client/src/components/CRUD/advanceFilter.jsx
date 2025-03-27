import { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import InputField from "../CRUD/input";
import {
  fetchSubclasses,
  fetchAreas,
  fetchTypes,
} from "../Table/Data/utilData";
import { useUser } from "../../utils/Hooks/userProvider";

const AdvancedFilter = ({ onApplyFilter, groups, selectedGroup }) => {
  const { hasRole } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [filterData, setFilterData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    birthdate: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    address: "",
    startDate: "",
    endDate: "",
    wmmActiveMonth: "",
    wmmExpiringMonth: "",
    copiesRange: "",
    minCopies: "",
    maxCopies: "",
    group: selectedGroup || "",
    type: "",
    subsclass: "",
    area: "",
    acode: "",
  });

  const [subclasses, setSubclasses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([]);

  // Load subclasses, areas, and types on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [subclassesData, areasData, typesData] = await Promise.all([
          fetchSubclasses(),
          fetchAreas(),
          fetchTypes(),
        ]);
        setSubclasses(subclassesData);
        setAreas(areasData);
        setTypes(typesData);
      } catch (error) {
        console.error("Error loading filter data:", error);
      }
    };
    loadData();
  }, []);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilterData((prev) => {
      // If area is being changed, also update acode since they're related
      if (name === "area" && value) {
        // For area, the value is the area._id which is the same as acode
        return {
          ...prev,
          [name]: value,
          acode: value, // Set acode to match the selected area's ID
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Format dates to ensure they span the entire selected month
    const formatMonthRange = (monthStr) => {
      if (!monthStr) return { start: "", end: "" };

      const date = new Date(monthStr);

      // For active subscriptions:
      // We only need the selected month's start and end
      // The backend will handle checking if subscriptions are active during this period
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Format dates as YYYY-MM-DD for consistent date handling
      const formatDate = (date) => {
        return date.toISOString().split("T")[0];
      };

      return {
        start: formatDate(start),
        end: formatDate(end),
      };
    };

    const activeMonthRange = formatMonthRange(filterData.wmmActiveMonth);
    const expiringMonthRange = formatMonthRange(filterData.wmmExpiringMonth);

    // Make sure all personal info fields are explicitly included
    const formattedData = {
      ...filterData,
      fname: filterData.fname.trim(), // Ensure first name is included and trimmed
      lname: filterData.lname.trim(), // Ensure last name is included and trimmed
      mname: filterData.mname.trim(), // Trim middle name
      sname: filterData.sname.trim(), // Trim suffix
      wmmStartSubsDate: activeMonthRange.start,
      wmmEndSubsDate: activeMonthRange.end,
      wmmStartEndDate: expiringMonthRange.start,
      wmmEndEndDate: expiringMonthRange.end,
      copiesRange: filterData.copiesRange,
      minCopies: filterData.minCopies,
      maxCopies: filterData.maxCopies,
      group: filterData.group,
      type: filterData.type,
      subsclass: filterData.subsclass,
      area: filterData.area,
      acode: filterData.acode, // Explicitly include acode in formatted data
    };

    onApplyFilter(formattedData);
    closeModal();
  };

  const getFilterButtonText = () => {
    if (hasRole("WMM")) {
      return filterData.group ? `Group: ${filterData.group}` : "Filter Group";
    } else if (hasRole("HRG, FOM, CAL")) {
      return "Filter Group";
    }
    return "Filter Group";
  };

  return (
    <div>
      <Button onClick={openModal} className="bg-blue-600 text-white">
        Advanced Filter
      </Button>

      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <h1 className="text-black text-3xl font-bold">Advanced Filter</h1>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Personal Info</h1>
                <InputField
                  label="First Name:"
                  id="fname"
                  name="fname"
                  value={filterData.fname}
                  onChange={handleChange}
                />
                <InputField
                  label="Middle Name:"
                  id="mname"
                  name="mname"
                  value={filterData.mname}
                  onChange={handleChange}
                />
                <InputField
                  label="Last Name:"
                  id="lname"
                  name="lname"
                  value={filterData.lname}
                  onChange={handleChange}
                />
                <InputField
                  label="Suffix:"
                  id="sname"
                  name="sname"
                  value={filterData.sname}
                  onChange={handleChange}
                />
                <InputField
                  label="Birth Date:"
                  id="birthdate"
                  name="birthdate"
                  value={filterData.birthdate}
                  onChange={handleChange}
                />
                <h1 className="text-black mb-2 font-bold">Address</h1>
                <textarea
                  label="Address:"
                  id="address"
                  name="address"
                  className="w-full h-[100px] p-2 border-2 border-gray-300 rounded-md"
                  value={filterData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Contact Info</h1>
                <InputField
                  label="Contact Numbers:"
                  id="contactnos"
                  name="contactnos"
                  value={filterData.contactnos}
                  onChange={handleChange}
                />
                <InputField
                  label="Cell Number:"
                  id="cellno"
                  name="cellno"
                  value={filterData.cellno}
                  onChange={handleChange}
                />
                <InputField
                  label="Office Number:"
                  id="ofcno"
                  name="ofcno"
                  value={filterData.ofcno}
                  onChange={handleChange}
                />
                <InputField
                  label="Email:"
                  id="email"
                  name="email"
                  value={filterData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <div className="flex flex-col p-2">
                  <h1 className="text-black mb-2 font-bold">Date Range</h1>
                  <InputField
                    label="Start Date:"
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={filterData.startDate}
                    onChange={handleChange}
                  />
                  <InputField
                    label="End Date:"
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={filterData.endDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex flex-col p-2">
                  <h1 className="text-black mb-2 font-bold">
                    Active Subscriptions
                  </h1>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Select month to find clients with active subscriptions
                      during this period
                    </p>
                    <InputField
                      label="Select Month:"
                      id="wmmActiveMonth"
                      name="wmmActiveMonth"
                      type="month"
                      value={filterData.wmmActiveMonth}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="flex flex-col p-2">
                  <h1 className="text-black mb-2 font-bold">
                    Expiring Subscriptions
                  </h1>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Select month to find clients whose subscriptions expire in
                      this period
                    </p>
                    <InputField
                      label="Select Month:"
                      id="wmmExpiringMonth"
                      name="wmmExpiringMonth"
                      type="month"
                      value={filterData.wmmExpiringMonth}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                {/* Copies Range - Existing code */}
                <div className="p-2">
                  <label className="text-black font-bold">Copies Range:</label>
                  <select
                    name="copiesRange"
                    value={filterData.copiesRange}
                    onChange={handleChange}
                    className="w-full p-2 border-2 border-gray-300 rounded-md"
                  >
                    <option value="">Any number of copies</option>
                    <option value="lt5">Less than 5</option>
                    <option value="5to10">5 to 10</option>
                    <option value="gt10">More than 10</option>
                    <option value="custom">Custom range</option>
                  </select>

                  {filterData.copiesRange === "custom" && (
                    <div className="flex gap-2 mt-2">
                      <InputField
                        label="Min copies:"
                        id="minCopies"
                        name="minCopies"
                        type="number"
                        min="0"
                        value={filterData.minCopies}
                        onChange={handleChange}
                      />
                      <InputField
                        label="Max copies:"
                        id="maxCopies"
                        name="maxCopies"
                        type="number"
                        min="0"
                        value={filterData.maxCopies}
                        onChange={handleChange}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h1 className="text-black mb-2 font-bold">Category Filters</h1>

                {/* Group Filter Dropdown - Simplified */}
                <div className="mb-3">
                  <label className="text-black font-semibold">Group:</label>
                  <select
                    name="group"
                    value={filterData.group}
                    onChange={handleChange}
                    className="w-full p-2 border-2 border-gray-300 rounded-md"
                    disabled={!hasRole("WMM")}
                  >
                    <option value="">All Groups</option>
                    {Array.isArray(groups) &&
                      groups.map((group) => (
                        <option key={group._id} value={group.id}>
                          {group.id}
                        </option>
                      ))}
                  </select>
                  {!hasRole("WMM") && (
                    <p className="text-xs text-gray-500 mt-1">
                      Group filtering not available for your role
                    </p>
                  )}
                </div>

                {/* Type Filter Dropdown - Now using locally fetched types */}
                <div className="mb-3">
                  <label className="text-black font-semibold">Type:</label>
                  <select
                    name="type"
                    value={filterData.type}
                    onChange={handleChange}
                    className="w-full p-2 border-2 border-gray-300 rounded-md"
                  >
                    <option value="">All Types</option>
                    {Array.isArray(types) &&
                      types.map((type) => (
                        <option key={type._id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Subclass Filter Dropdown - Adding this based on fetched data */}
                <div className="mb-3">
                  <label className="text-black font-semibold">Subclass:</label>
                  <select
                    name="subsclass"
                    value={filterData.subsclass}
                    onChange={handleChange}
                    className="w-full p-2 border-2 border-gray-300 rounded-md"
                  >
                    <option value="">All Subclasses</option>
                    {Array.isArray(subclasses) &&
                      subclasses.map((subclass) => (
                        <option key={subclass._id} value={subclass.id}>
                          {subclass.id} - {subclass.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Area Filter Dropdown - Enhanced with more information */}
                <div className="mb-3">
                  <label className="text-black font-semibold">Area:</label>
                  <select
                    name="area"
                    value={filterData.area}
                    onChange={handleChange}
                    className="w-full p-2 border-2 border-gray-300 rounded-md"
                  >
                    <option value="">All Areas</option>
                    {Array.isArray(areas) &&
                      areas.map((area) => (
                        <option key={area._id} value={area._id}>
                          {area._id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              <Button
                type="button"
                onClick={closeModal}
                className="text-white bg-red-500 hover:bg-red-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white text-sm bg-green-600 hover:bg-green-800 rounded-xl"
              >
                Apply Filter
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdvancedFilter;
