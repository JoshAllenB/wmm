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

  // Auto-set services based on user roles
  useEffect(() => {
    // Only set services if the filter is empty to avoid overriding user selections
    if (filterData.services.length === 0) {
      const roleBasedServices = [];

      // Check each role and add corresponding service
      if (hasRole("WMM")) roleBasedServices.push("WMM");
      if (hasRole("FOM")) roleBasedServices.push("FOM");
      if (hasRole("HRG")) roleBasedServices.push("HRG");
      if (hasRole("CAL")) roleBasedServices.push("CAL");

      // Log the role-based services
      console.log("Role-based services:", roleBasedServices);

      // Only update if we found matching roles
      if (roleBasedServices.length > 0) {
        setFilterData((prev) => ({
          ...prev,
          services: roleBasedServices,
        }));
      }
    }
  }, [hasRole]);

  const openModal = () => {
    // Reset the filter form when opening the modal
    resetFilterData();
    setShowModal(true);
  };
  
  // Reset filter fields when closing modal
  const closeModal = () => {
    setShowModal(false);
    // Don't reset here as the filter has already been applied
  };

  // Initialize/reset filter data
  const resetFilterData = () => {
    setFilterData({
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilterData((prev) => ({
      ...prev,
      [name]: value,
      // If area is being changed, also update acode
      ...(name === "area" && value ? { acode: value } : {}),
    }));
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

      // Log the updated services array
      console.log("Updated services array:", services);

      return { ...prev, services };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Format dates to ensure they span the entire selected month
    const formatMonthRange = (monthStr) => {
      if (!monthStr) return { start: "", end: "" };

      const date = new Date(monthStr);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Format dates as YYYY-MM-DD
      const formatDate = (date) => date.toISOString().split("T")[0];

      return {
        start: formatDate(start),
        end: formatDate(end),
      };
    };

    const activeMonthRange = formatMonthRange(filterData.wmmActiveMonth);
    const expiringMonthRange = formatMonthRange(filterData.wmmExpiringMonth);

    // Log the filterData before formatting
    console.log("Filter data before formatting:", filterData);
    console.log("Services before formatting:", filterData.services);

    // Trim text fields and format data
    const formattedData = {
      ...filterData,
      fname: filterData.fname.trim(),
      lname: filterData.lname.trim(),
      mname: filterData.mname.trim(),
      sname: filterData.sname.trim(),
      wmmStartSubsDate: activeMonthRange.start,
      wmmEndSubsDate: activeMonthRange.end,
      wmmStartEndDate: expiringMonthRange.start,
      wmmEndEndDate: expiringMonthRange.end,
    };

    // Log the formatted data
    console.log("Formatted data:", formattedData);
    console.log("Services in formatted data:", formattedData.services);

    // Apply the filter with the formatted data
    onApplyFilter(formattedData);
    
    // Just close the modal - data will be reset when reopened
    setShowModal(false);
  };

  const clearAllFilters = () => {
    setFilterData({
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
  };

  const getFilterButtonText = () => {
    if (hasRole("WMM")) {
      return filterData.group ? `Group: ${filterData.group}` : "Filter Group";
    }
    return "Filter Group";
  };

  // Function to count active filters
  const countActiveFilters = () => {
    return Object.entries(filterData).reduce((count, [key, value]) => {
      const isActive =
        value &&
        key !== "group" &&
        ((typeof value === "string" && value.trim() !== "") ||
          (Array.isArray(value) && value.length > 0));

      return isActive ? count + 1 : count;
    }, 0);
  };

  // Get active filters for display
  const getActiveFilters = () => {
    // Define field mappings with their display labels
    const fieldMappings = {
      fname: "First Name",
      lname: "Last Name",
      mname: "Middle Name",
      sname: "Suffix",
      birthdate: "Birth Date",
      email: "Email",
      cellno: "Cell Number",
      ofcno: "Office Number",
      contactnos: "Other Contact",
      address: "Address",
      wmmActiveMonth: "Active Month",
      wmmExpiringMonth: "Expiring Month",
      group: "Group",
      type: "Type",
      subsclass: "Subclass",
      area: "Area",
    };

    // Special case formatters
    const formatters = {
      address: (value) =>
        value.length > 20 ? `${value.substring(0, 20)}...` : value,
      type: (value) => types.find((t) => t.id === value)?.name || value,
      subsclass: (value) =>
        subclasses.find((s) => s.id === value)?.name || value,
    };

    // Handle date range special case
    const active = [];

    // Handle date range as a special case
    if (filterData.startDate && filterData.endDate) {
      active.push({
        label: "Date Range",
        value: `${filterData.startDate} to ${filterData.endDate}`,
        key: "dateRange",
      });
    } else if (filterData.startDate) {
      active.push({
        label: "From Date",
        value: filterData.startDate,
        key: "startDate",
      });
    } else if (filterData.endDate) {
      active.push({
        label: "To Date",
        value: filterData.endDate,
        key: "endDate",
      });
    }

    // Handle copies range as a special case
    if (filterData.copiesRange) {
      const rangeMap = {
        lt5: "Less than 5",
        "5to10": "5 to 10",
        gt10: "More than 10",
        custom: `${filterData.minCopies || "0"} to ${
          filterData.maxCopies || "∞"
        }`,
      };

      active.push({
        label: "Copies",
        value: rangeMap[filterData.copiesRange] || filterData.copiesRange,
        key: "copiesRange",
      });
    }

    // Handle services as a special case
    if (filterData.services.length > 0) {
      active.push({
        label: "Services",
        value: filterData.services.join(", "),
        key: "services",
      });
    }

    // Process all other standard fields
    Object.entries(fieldMappings).forEach(([key, label]) => {
      const value = filterData[key];

      // Skip empty values, group if it matches selectedGroup, and already handled special cases
      if (
        !value ||
        (key === "group" && value === selectedGroup) ||
        key === "startDate" ||
        key === "endDate"
      ) {
        return;
      }

      // Format the value if a formatter exists, otherwise use the raw value
      const displayValue = formatters[key] ? formatters[key](value) : value;

      active.push({ label, value: displayValue, key });
    });

    return active;
  };

  // Remove a specific filter
  const removeFilter = (key) => {
    setFilterData((prev) => {
      const updates = {};

      // Handle special cases
      switch (key) {
        case "dateRange":
          updates.startDate = "";
          updates.endDate = "";
          break;
        case "services":
          updates.services = [];
          break;
        default:
          updates[key] = "";
      }

      return { ...prev, ...updates };
    });
  };

  return (
    <div>
      <Button
        onClick={openModal}
        className="bg-blue-600 text-white hover:bg-blue-700 rounded-md flex items-center gap-2"
      >
        <span>Advanced Filter</span>
        {countActiveFilters() > 0 && (
          <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {countActiveFilters()}
          </span>
        )}
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
                    className={`w-full ${
                      filterData.fname ? "border-blue-500 bg-blue-50" : ""
                    }`}
                  />
                  <InputField
                    label="Last Name"
                    id="lname"
                    name="lname"
                    value={filterData.lname}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.lname ? "border-blue-500 bg-blue-50" : ""
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Middle Name"
                      id="mname"
                      name="mname"
                      value={filterData.mname}
                      onChange={handleChange}
                      className={`w-full ${
                        filterData.mname ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    />
                    <InputField
                      label="Suffix"
                      id="sname"
                      name="sname"
                      value={filterData.sname}
                      onChange={handleChange}
                      className={`w-full ${
                        filterData.sname ? "border-blue-500 bg-blue-50" : ""
                      }`}
                    />
                  </div>
                  <InputField
                    label="Birth Date"
                    id="birthdate"
                    name="birthdate"
                    type="date"
                    value={filterData.birthdate}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.birthdate ? "border-blue-500 bg-blue-50" : ""
                    }`}
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
                    className={`w-full ${
                      filterData.email ? "border-blue-500 bg-blue-50" : ""
                    }`}
                  />
                  <InputField
                    label="Cell Number"
                    id="cellno"
                    name="cellno"
                    value={filterData.cellno}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.cellno ? "border-blue-500 bg-blue-50" : ""
                    }`}
                  />
                  <InputField
                    label="Office Number"
                    id="ofcno"
                    name="ofcno"
                    value={filterData.ofcno}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.ofcno ? "border-blue-500 bg-blue-50" : ""
                    }`}
                  />
                  <InputField
                    label="Other Contact"
                    id="contactnos"
                    name="contactnos"
                    value={filterData.contactnos}
                    onChange={handleChange}
                    className={`w-full ${
                      filterData.contactnos ? "border-blue-500 bg-blue-50" : ""
                    }`}
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
                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
                      filterData.address ? "border-blue-500 bg-blue-50" : ""
                    }`}
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
                        className={`w-full ${
                          filterData.startDate
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                      />
                      <InputField
                        label="End Date"
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={filterData.endDate}
                        onChange={handleChange}
                        className={`w-full ${
                          filterData.endDate ? "border-blue-500 bg-blue-50" : ""
                        }`}
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
                      className={`w-full ${
                        filterData.wmmActiveMonth
                          ? "border-blue-500 bg-blue-50"
                          : ""
                      }`}
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
                      className={`w-full ${
                        filterData.wmmExpiringMonth
                          ? "border-blue-500 bg-blue-50"
                          : ""
                      }`}
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
                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                      filterData.copiesRange ? "border-blue-500 bg-blue-50" : ""
                    }`}
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
                        className={`w-full ${
                          filterData.minCopies
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
                      />
                      <InputField
                        label="Max copies"
                        id="maxCopies"
                        name="maxCopies"
                        type="number"
                        min="0"
                        value={filterData.maxCopies}
                        onChange={handleChange}
                        className={`w-full ${
                          filterData.maxCopies
                            ? "border-blue-500 bg-blue-50"
                            : ""
                        }`}
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
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.group ? "border-blue-500 bg-blue-50" : ""
                      }`}
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
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.type ? "border-blue-500 bg-blue-50" : ""
                      }`}
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
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.subsclass ? "border-blue-500 bg-blue-50" : ""
                      }`}
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
                      className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                        filterData.area ? "border-blue-500 bg-blue-50" : ""
                      }`}
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
                  {hasRole("WMM") ||
                  hasRole("FOM") ||
                  hasRole("HRG") ||
                  hasRole("CAL") ? (
                    <p className="text-xs text-blue-500 mb-3">
                      Services matching your role are automatically selected.
                      You can modify these selections.
                    </p>
                  ) : null}
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
                      {hasRole("WMM") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
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
                      {hasRole("FOM") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
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
                      {hasRole("HRG") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
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
                      {hasRole("CAL") && (
                        <span className="ml-1 text-xs text-blue-500">
                          (Auto)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Section */}
            {getActiveFilters().length > 0 && (
              <div className="mt-8 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-blue-700 text-sm font-bold">
                    Active Filters
                  </h2>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getActiveFilters().map((filter, index) => (
                    <div
                      key={index}
                      className="bg-white border border-blue-300 rounded-full px-3 py-1 text-xs flex items-center"
                    >
                      <span className="font-semibold mr-1">
                        {filter.label}:
                      </span>
                      <span className="truncate max-w-[150px]">
                        {filter.value}
                      </span>
                      <button
                        type="button"
                        className="ml-2 text-gray-500 hover:text-red-500"
                        onClick={() => removeFilter(filter.key)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex justify-end gap-3">
              <Button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
              >
                Clear All
              </Button>
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
