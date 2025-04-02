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
    services: [],
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

  const handleServiceChange = (service) => {
    setFilterData((prev) => {
      const services = [...prev.services];
      const serviceIndex = services.indexOf(service);

      if (serviceIndex === -1) {
        services.push(service);
      } else {
        services.splice(serviceIndex, 1);
      }

      return {
        ...prev,
        services,
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
      <Button
        onClick={openModal}
        className="bg-blue-600 text-white hover:bg-blue-700 rounded-md"
      >
        Advanced Filter
      </Button>

      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <form
            onSubmit={handleSubmit}
            className="max-h-[80vh] overflow-y-auto"
          >
            <div className="mb-6 border-b pb-4">
              <h1 className="text-black text-2xl font-bold">Advanced Filter</h1>
              <p className="text-gray-500 text-sm">
                Use filters to narrow down results
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {/* Personal Information Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Personal Information
                </h2>
                <div className="space-y-3">
                  <InputField
                    label="First Name"
                    id="fname"
                    name="fname"
                    value={filterData.fname}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <InputField
                    label="Last Name"
                    id="lname"
                    name="lname"
                    value={filterData.lname}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Middle Name"
                      id="mname"
                      name="mname"
                      value={filterData.mname}
                      onChange={handleChange}
                      className="w-full"
                    />
                    <InputField
                      label="Suffix"
                      id="sname"
                      name="sname"
                      value={filterData.sname}
                      onChange={handleChange}
                      className="w-full"
                    />
                  </div>
                  <InputField
                    label="Birth Date"
                    id="birthdate"
                    name="birthdate"
                    type="date"
                    value={filterData.birthdate}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Contact Information Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Contact Information
                </h2>
                <div className="space-y-3">
                  <InputField
                    label="Email Address"
                    id="email"
                    name="email"
                    type="email"
                    value={filterData.email}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <InputField
                    label="Cell Number"
                    id="cellno"
                    name="cellno"
                    value={filterData.cellno}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <InputField
                    label="Office Number"
                    id="ofcno"
                    name="ofcno"
                    value={filterData.ofcno}
                    onChange={handleChange}
                    className="w-full"
                  />
                  <InputField
                    label="Other Contact"
                    id="contactnos"
                    name="contactnos"
                    value={filterData.contactnos}
                    onChange={handleChange}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Address Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Address
                </h2>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    value={filterData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Date Ranges Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Date Ranges
                </h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      General Date Range
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Start Date"
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={filterData.startDate}
                        onChange={handleChange}
                        className="w-full"
                      />
                      <InputField
                        label="End Date"
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={filterData.endDate}
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Active Subscriptions
                    </h3>
                    <p className="text-xs text-gray-500">
                      Find clients with active subscriptions during this month
                    </p>
                    <InputField
                      label="Select Month"
                      id="wmmActiveMonth"
                      name="wmmActiveMonth"
                      type="month"
                      value={filterData.wmmActiveMonth}
                      onChange={handleChange}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Expiring Subscriptions
                    </h3>
                    <p className="text-xs text-gray-500">
                      Find clients whose subscriptions expire this month
                    </p>
                    <InputField
                      label="Select Month"
                      id="wmmExpiringMonth"
                      name="wmmExpiringMonth"
                      type="month"
                      value={filterData.wmmExpiringMonth}
                      onChange={handleChange}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Copies Range Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Copies Range
                </h2>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Copies
                  </label>
                  <select
                    name="copiesRange"
                    value={filterData.copiesRange}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Any number of copies</option>
                    <option value="lt5">Less than 5</option>
                    <option value="5to10">5 to 10</option>
                    <option value="gt10">More than 10</option>
                    <option value="custom">Custom range</option>
                  </select>

                  {filterData.copiesRange === "custom" && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <InputField
                        label="Min copies"
                        id="minCopies"
                        name="minCopies"
                        type="number"
                        min="0"
                        value={filterData.minCopies}
                        onChange={handleChange}
                        className="w-full"
                      />
                      <InputField
                        label="Max copies"
                        id="maxCopies"
                        name="maxCopies"
                        type="number"
                        min="0"
                        value={filterData.maxCopies}
                        onChange={handleChange}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Category Filters Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Category Filters
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Group
                    </label>
                    <select
                      name="group"
                      value={filterData.group}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      name="type"
                      value={filterData.type}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subclass
                    </label>
                    <select
                      name="subsclass"
                      value={filterData.subsclass}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area
                    </label>
                    <select
                      name="area"
                      value={filterData.area}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

              {/* Services Card */}
              <div className="p-4 border rounded-lg shadow-sm">
                <h2 className="text-black text-lg font-bold mb-4 border-b pb-2">
                  Services
                </h2>
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-3">
                    Select services to filter clients
                  </p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-wmm"
                        checked={filterData.services.includes("WMM")}
                        onChange={() => handleServiceChange("WMM")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-wmm"
                        className="ml-2 text-sm text-gray-700"
                      >
                        WMM
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-fom"
                        checked={filterData.services.includes("FOM")}
                        onChange={() => handleServiceChange("FOM")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-fom"
                        className="ml-2 text-sm text-gray-700"
                      >
                        FOM
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-hrg"
                        checked={filterData.services.includes("HRG")}
                        onChange={() => handleServiceChange("HRG")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-hrg"
                        className="ml-2 text-sm text-gray-700"
                      >
                        HRG
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="service-cal"
                        checked={filterData.services.includes("CAL")}
                        onChange={() => handleServiceChange("CAL")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="service-cal"
                        className="ml-2 text-sm text-gray-700"
                      >
                        CAL
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t flex justify-end gap-3">
              <Button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
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
