/* eslint-disable no-unused-vars */
import { useUser } from "../../utils/Hooks/userProvider";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import AreaForm from "../../utils/areaform";
import InputField from "./input";
import { fetchTypes, fetchAreas } from "../Table/Data/utilData";
import { useToast } from "../UI/ShadCN/hooks/use-toast";
import useDuplicateChecker from "./duplicateChecker/duplicateLogic";
import { debounce } from "lodash";

const DonorAdd = ({ onDonorSelect, onNewDonorAdded }) => {
  const { toast } = useToast();

  // Duplicate checker hook
  const {
    potentialDuplicates,
    isCheckingDuplicates,
    showDuplicates,
    selectedDuplicate,
    viewingDuplicate,
    setPotentialDuplicates,
    setIsCheckingDuplicates,
    setShowDuplicates,
    setSelectedDuplicate,
    setViewingDuplicate,
    checkForDuplicates,
    immediatelyClearDuplicates,
    handleViewDuplicate,
    handleCloseDuplicateView,
    DuplicatePanel,
    normalizeAddress,
  } = useDuplicateChecker();

  const [formData, setFormData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    title: "",
    bdate: "",
    bdateMonth: "",
    bdateDay: "",
    bdateYear: "",
    company: "",
    address: "",
    zipcode: "",
    area: "",
    acode: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    type: "",
    group: "",
    remarks: "",
    spack: false,
  });

  const [addressData, setAddressData] = useState({
    housestreet: "",
    subdivision: "",
    barangay: "",
    city: "",
    zipcode: "",
  });

  const [combinedAddress, setCombinedAddress] = useState("");
  const [areaData, setAreaData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [areas, setAreas] = useState(null);
  const [isLoadingAreas, setIsLoadingAreas] = useState(false);
  const [isEditingCombinedAddress, setIsEditingCombinedAddress] =
    useState(false);
  const [donors, setDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDonors, setFilteredDonors] = useState([]);
  const [isDonorAddActive, setIsDonorAddActive] = useState(false);
  const [isRefreshingDonors, setIsRefreshingDonors] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDonors(donors);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = donors.filter((donor) => {
      const idMatch = donor.id.toString().includes(searchTermLower);
      const nameMatch = donor.name.toLowerCase().includes(searchTermLower);
      return idMatch || nameMatch;
    });
    setFilteredDonors(filtered);
  }, [searchTerm, donors]);

  // Array of month names for the dropdown
  const months = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];

  const fetchDonors = async () => {
    try {
      setIsRefreshingDonors(true);
      const response = await axios.get(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/donor-data/donors`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setDonors(response.data);
    } catch (error) {
      console.error("Error fetching donors:", error);
    } finally {
      setIsRefreshingDonors(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(
          `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util/groups`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        setGroups(response.data);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const typesData = await fetchTypes();
        setTypes(typesData);
      } catch (error) {
        console.error("Error loading types:", error);
      }
    };
    loadTypes();
  }, []);

  useEffect(() => {
    if (!isEditingCombinedAddress) {
      const formattedAddress = formatAddressLines(
        addressData,
        formData.area,
        areaData
      );
      setCombinedAddress(formattedAddress);
    }
  }, [
    addressData.housestreet,
    addressData.subdivision,
    addressData.barangay,
    areaData.zipcode,
    formData.area,
    isEditingCombinedAddress,
  ]);

  const formatAddressLines = (addressData, area, areaData) => {
    const lines = [];
    if (addressData.housestreet) {
      lines.push(addressData.housestreet.trim() + ",");
    }
    if (addressData.subdivision) {
      lines.push(addressData.subdivision.trim() + ",");
    }
    if (addressData.barangay) {
      lines.push(addressData.barangay.trim() + ",");
    }
    const line4Parts = [];
    if (areaData.zipcode) {
      line4Parts.push(areaData.zipcode.trim());
    }
    if (area) {
      const cleanedArea = area
        .replace(/^(CITY OF|MUNICIPALITY OF)\s+/i, "")
        .trim();
      line4Parts.push(cleanedArea);
    }
    if (line4Parts.length > 0) {
      lines.push(line4Parts.join(" ") + (areaData.province ? "," : ""));
    }
    if (areaData.province) {
      lines.push(areaData.province.trim());
    }
    return lines.join("\n");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For fields that affect duplicate search, immediately clear duplicates for better UX
    const duplicateRelatedFields = [
      "fname",
      "lname",
      "company",
      "bdate",
      "bdateMonth",
      "bdateDay",
      "bdateYear",
      "email",
      "cellno",
      "contactnos",
      "company",
      "housestreet",
      "subdivision",
      "barangay",
    ];
    if (duplicateRelatedFields.includes(name)) {
      immediatelyClearDuplicates();
    }

    // Handle bdate parts
    if (name === "bdateMonth" || name === "bdateDay" || name === "bdateYear") {
      setFormData((prevData) => {
        const newData = {
          ...prevData,
          [name]: value,
        };

        // Combine the date parts into bdate if all are present
        if (newData.bdateMonth && newData.bdateDay && newData.bdateYear) {
          // Format as YYYY-MM-DD for consistent database storage and duplicate checking
          const month = newData.bdateMonth.padStart(2, "0");
          const day = newData.bdateDay.padStart(2, "0");
          newData.bdate = `${newData.bdateYear}-${month}-${day}`;
        } else {
          newData.bdate = "";
        }

        // Trigger duplicate check after updating birthdate
        if (duplicateRelatedFields.includes(name)) {
          const checkData = {
            fname: newData.fname,
            lname: newData.lname,
            bdate: newData.bdate || "",
            bdateMonth: newData.bdateMonth,
            bdateDay: newData.bdateDay,
            bdateYear: newData.bdateYear,
            company: newData.company,
            email: newData.email,
            cellno: newData.cellno,
            contactnos: newData.contactnos,
            address: combinedAddress,
            addressComponents: {
              housestreet: addressData.housestreet || "",
              subdivision: addressData.subdivision || "",
              barangay: addressData.barangay || "",
            },
            acode: areaData.acode || "",
          };
          checkForDuplicates(checkData, name);
        }

        return newData;
      });

      return;
    }

    setFormData((prevData) => {
      const newData = {
        ...prevData,
        [name]: value,
      };

      // Trigger duplicate check after state update
      if (duplicateRelatedFields.includes(name)) {
        setTimeout(() => {
          // Only check if we have at least one identifying field with enough content
          if (
            (newData.fname && newData.fname.length > 1) ||
            (newData.lname && newData.lname.length > 1) ||
            (newData.company && newData.company.length > 1) ||
            (newData.bdate && newData.bdate.length > 0) ||
            (newData.bdateMonth && newData.bdateDay) || // Trigger if day and month are present
            (newData.cellno && newData.cellno.length > 5) ||
            (newData.contactnos && newData.contactnos.length > 5) ||
            (addressData.housestreet && addressData.housestreet.length > 2) ||
            (addressData.subdivision && addressData.subdivision.length > 2) ||
            (addressData.barangay && addressData.barangay.length > 2)
          ) {
            const checkData = {
              fname: newData.fname,
              lname: newData.lname,
              bdate: newData.bdate || "",
              bdateMonth: newData.bdateMonth,
              bdateDay: newData.bdateDay,
              bdateYear: newData.bdateYear,
              company: newData.company,
              email: newData.email,
              cellno: newData.cellno,
              contactnos: newData.contactnos,
              address: combinedAddress,
              addressComponents: {
                housestreet: addressData.housestreet || "",
                subdivision: addressData.subdivision || "",
                barangay: addressData.barangay || "",
              },
              acode: areaData.acode || "",
            };
            checkForDuplicates(checkData, name);
          } else {
            setIsCheckingDuplicates(false);
          }
        }, 0);
      }

      return newData;
    });
  };

  const handleAddressChange = (type, value) => {
    if (potentialDuplicates.length > 0) {
      immediatelyClearDuplicates();
    }
    setIsCheckingDuplicates(true);

    // Remove any existing comma if this is a street or barangay field
    // But preserve spaces and only trim the comma at the end
    let cleanedValue = value;
    if (["housestreet", "subdivision", "barangay"].includes(type)) {
      cleanedValue = value.replace(/,\s*$/, "");
    }

    setAddressData((prev) => {
      const newAddressData = {
        ...prev,
        [type]: cleanedValue,
      };

      // Format address with commas
      const formattedAddress = formatAddressLines(
        newAddressData,
        formData.area,
        areaData
      );
      setCombinedAddress(formattedAddress);

      // Update formData with new address
      setFormData((prev) => ({
        ...prev,
        address: formattedAddress,
        housestreet: newAddressData.housestreet,
        subdivision: newAddressData.subdivision,
        barangay: newAddressData.barangay,
      }));

      // Check for duplicates with updated address
      const currentFormData = {
        fname: formData.fname,
        lname: formData.lname,
        bdate: formData.bdate,
        company: formData.company,
        email: formData.email,
        cellno: formData.cellno,
        contactnos: formData.contactnos,
        address: formattedAddress,
        addressComponents: {
          housestreet: newAddressData.housestreet || "",
          subdivision: newAddressData.subdivision || "",
          barangay: newAddressData.barangay || "",
        },
        acode: areaData.acode || "",
      };
      checkForDuplicates(currentFormData, "address");
      return newAddressData;
    });
  };

  const memoizedOnAreaChange = (field, value) => {
    if (!areas && !isLoadingAreas) {
      // This would typically call loadAreas() if it exists
    }

    setAreaData((prev) => ({ ...prev, [field]: value }));

    if (field === "city") {
      // Update form data with new city
      setFormData((prev) => ({
        ...prev,
        area: value,
      }));

      // Update address data and check for duplicates
      setAddressData((prev) => {
        const newAddressData = {
          ...prev,
          city: value,
        };

        const formattedAddress = formatAddressLines(
          newAddressData,
          value,
          areaData
        );
        setCombinedAddress(formattedAddress);

        // Update form data with new address
        setFormData((prev) => ({
          ...prev,
          area: value,
          address: formattedAddress,
        }));

        // Check for duplicates with updated address
        const currentFormData = {
          fname: formData.fname,
          lname: formData.lname,
          bdate: formData.bdate,
          bdateMonth: formData.bdateMonth,
          bdateDay: formData.bdateDay,
          bdateYear: formData.bdateYear,
          company: formData.company,
          email: formData.email,
          cellno: formData.cellno,
          contactnos: formData.contactnos,
          address: formattedAddress,
          addressComponents: {
            housestreet: addressData.housestreet || "",
            subdivision: addressData.subdivision || "",
            barangay: addressData.barangay || "",
          },
          acode: areaData.acode || "",
        };
        checkForDuplicates(currentFormData, "city");
        return newAddressData;
      });
    }

    if (field === "zipcode") {
      setFormData((prev) => {
        const newFormData = { ...prev, zipcode: value };
        // Check for duplicates when zipcode changes
        const checkData = {
          ...newFormData,
          address: combinedAddress,
          ...addressData,
          ...areaData,
          [field]: value,
        };
        checkForDuplicates(checkData, field);
        return newFormData;
      });
    }

    if (field === "acode") {
      // Validate area code to prevent zipcode input
      if (value && /^\d+$/.test(value)) {
        console.warn("Area code must contain letters (e.g., NCR, CAR, R01)");
        setValidationError(
          "Area code must contain letters (e.g., NCR, CAR, R01)"
        );
        return;
      }

      // Validate area code is required
      if (!value || value.trim() === "") {
        setValidationError("Area code is required");
        return;
      }

      // Clear validation error if area code is valid
      if (
        validationError.includes("Area code must contain letters") ||
        validationError.includes("Area code is required")
      ) {
        setValidationError("");
      }

      setFormData((prev) => {
        const newFormData = { ...prev, acode: value };
        // Check for duplicates when acode changes
        const checkData = {
          ...newFormData,
          address: combinedAddress,
          ...addressData,
          ...areaData,
          [field]: value,
        };
        checkForDuplicates(checkData, field);
        return newFormData;
      });
    }
  };

  const handleCombinedAddressChange = (e) => {
    setIsEditingCombinedAddress(true);
    const value = e.target.value;
    setCombinedAddress(value);

    const lines = value
      .split("\n")
      .map((line) => line.trim().replace(/,\s*$/, ""))
      .filter((line) => line);

    setAddressData((prev) => {
      const lastLine = lines[lines.length - 1] || "";
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";

      return {
        housestreet: lines[0] || "",
        subdivision: lines[1] || "",
        barangay: lines[2] || "",
        city: prev.city,
        zipcode: zipcode,
      };
    });

    setFormData((prev) => {
      const lastLine = lines[lines.length - 1] || "";
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";
      const city = lastLine.replace(zipcode, "").trim();

      return {
        ...prev,
        address: value,
        housestreet: lines[0] || "",
        subdivision: lines[1] || "",
        barangay: lines[2] || "",
        zipcode: zipcode ? parseInt(zipcode) : "",
        area: city,
      };
    });

    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      const zipMatch = lastLine.match(/^\d+/);
      const zipcode = zipMatch ? zipMatch[0] : "";
      const city = lastLine.replace(zipcode, "").trim();

      setAreaData((prev) => ({
        ...prev,
        zipcode,
        city,
      }));
    }
  };

  const handleCombinedAddressFocus = () => {
    setIsEditingCombinedAddress(true);
  };

  const handleCombinedAddressBlur = () => {
    setIsEditingCombinedAddress(false);
    const formattedAddress = formatAddressLines(
      addressData,
      formData.area,
      areaData
    );
    setCombinedAddress(formattedAddress);
  };

  const resetForm = () => {
    // Reset main form data
    setFormData({
      lname: "",
      fname: "",
      mname: "",
      sname: "",
      title: "",
      bdate: "",
      bdateMonth: "",
      bdateDay: "",
      bdateYear: "",
      company: "",
      address: "",
      zipcode: "",
      area: "",
      acode: "",
      contactnos: "",
      cellno: "",
      ofcno: "",
      email: "",
      type: "",
      group: "",
      remarks: "",
      spack: false,
    });

    // Reset address data
    setAddressData({
      housestreet: "",
      subdivision: "",
      barangay: "",
      city: "",
      zipcode: "",
    });

    // Reset combined address
    setCombinedAddress("");

    // Reset area data
    setAreaData({
      acode: "",
      zipcode: "",
      area: "",
      city: "",
      province: "",
      region: "",
    });

    // Reset selected donor
    setSelectedDonor(null);

    // Reset duplicate checker state
    immediatelyClearDuplicates();
    setSelectedDuplicate(null);
    setViewingDuplicate(false);

    if (onDonorSelect) {
      onDonorSelect(null);
    }
  };

  const openModal = () => {
    setIsDonorAddActive(true);
    setShowModal(true);
  };

  const closeModal = () => {
    setIsDonorAddActive(false);
    setShowModal(false);
    resetForm();
  };

  const closeModalAndReset = () => {
    setShowModal(false);
    resetForm();
  };

  const cleanFormData = (data) => {
    // Create a new object to store cleaned data
    const cleanedData = {};

    // Iterate over data and clean each field
    for (const key in data) {
      const value = data[key];

      // Skip null and undefined values
      if (value === null || value === undefined) {
        continue;
      }

      // Check if the field has meaningful data
      let shouldInclude = false;

      if (typeof value === "string") {
        // Include non-empty strings (after trimming)
        shouldInclude = value.trim() !== "";
      } else if (typeof value === "number") {
        // Include valid numbers (not NaN)
        shouldInclude = !isNaN(value);
      } else if (typeof value === "boolean") {
        // Include boolean values (both true and false are meaningful)
        shouldInclude = true;
      } else if (Array.isArray(value)) {
        // Include non-empty arrays
        shouldInclude = value.length > 0;
      } else if (typeof value === "object") {
        // Include non-empty objects
        shouldInclude = Object.keys(value).length > 0;
      }

      if (shouldInclude) {
        // For strings, trim whitespace and check if it's still not empty
        if (typeof value === "string") {
          const trimmedValue = value.trim();
          if (trimmedValue !== "") {
            cleanedData[key] = trimmedValue;
          }
        } else {
          cleanedData[key] = value;
        }
      }
    }

    return cleanedData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rawClientData = {
      ...formData,
      address: combinedAddress,
      ...areaData,
      isDonor: true, // Ensure isDonor is in clientData for database storage
    };

    // Only add donorid if selectedDonor exists and has an id
    if (selectedDonor?.id) {
      rawClientData.donorid = selectedDonor.id;
    }

    const clientData = cleanFormData(rawClientData);

    try {
      const response = await axios.post(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/add`,
        {
          clientData,
          roleSubmissions: [], // Add empty roleSubmissions array for donors
          isDonor: true, // Add isDonor flag at the top level
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      if (response.data.success) {
        const newClientId = response.data.clientId;
        const clientName =
          formData.company || `${formData.fname} ${formData.lname}`.trim();

        toast({
          title: "Donor Added Successfully",
          description: (
            <div>
              <p>
                Client ID:{" "}
                <span className="font-mono bg-gray-100 px-1 rounded">
                  {newClientId}
                </span>
              </p>
              <p>Name: {clientName}</p>
              <p className="text-sm text-green-600 mt-1">
                ✓ Donor list updated and auto-selected
              </p>
            </div>
          ),
          duration: 10000, // Show for 10 seconds to give time to copy
        });

        // Create donor data object with all the details
        const newDonorData = {
          ...formData,
          id: newClientId,
          address: combinedAddress,
          ...areaData,
        };

        // Call the callback to update parent component with the new donor data
        if (onNewDonorAdded) {
          onNewDonorAdded(newDonorData);
        }

        // Refresh the donors list to include the newly added donor
        try {
          await fetchDonors();
        } catch (error) {
          console.error("Error refreshing donors list:", error);
          // Don't show error toast here as the main operation was successful
        }

        // Auto-select the newly added donor in the dropdown
        const newDonor = {
          id: newClientId,
          name: clientName,
          ...formData,
        };
        setSelectedDonor(newDonor);
        setSearchTerm(`${newClientId} - ${clientName}`);
        if (onDonorSelect) {
          onDonorSelect(newClientId);
        }

        // Close the modal immediately after successful submission
        setTimeout(() => {
          closeModal();
        }, 1000);
      } else {
        // Handle case where API returns success: false
        toast({
          title: "Error",
          description:
            response.data.message || "Failed to add donor. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);

      // Show error toast to user
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to add donor. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!areas && !isLoadingAreas) {
      setIsLoadingAreas(true);
      fetchAreas()
        .then((areasData) => {
          setAreas(areasData);
          setIsLoadingAreas(false);
        })
        .catch(() => setIsLoadingAreas(false));
    }
  }, [areas, isLoadingAreas]);

  const initialAreaData = {
    acode: formData.acode || areaData.acode || "",
    zipcode: formData.zipcode || areaData.zipcode || "",
    city: formData.area || areaData.city || addressData.city || "",
  };

  return (
    <div className="relative flex items-center gap-4">
      <div className="flex-1">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isRefreshingDonors
                ? "Refreshing donors..."
                : "Search by ID or name..."
            }
            className={`w-full px-2 border-2 rounded-md text-xl bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none ${
              isRefreshingDonors ? "opacity-75" : ""
            }`}
            disabled={isRefreshingDonors}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedDonor(null);
                if (onDonorSelect) {
                  onDonorSelect(null);
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              title="Clear selection"
            >
              ✕
            </button>
          )}
          <div
            className={`absolute w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg ${
              searchTerm && filteredDonors.length > 0 ? "block" : "hidden"
            }`}
          >
            {isRefreshingDonors && (
              <div className="p-2 text-sm text-gray-500 text-center">
                Refreshing donors list...
              </div>
            )}
            {!isRefreshingDonors &&
              filteredDonors.length === 0 &&
              searchTerm && (
                <div className="p-2 text-sm text-gray-500 text-center">
                  No donors found matching "{searchTerm}"
                </div>
              )}
            {filteredDonors.map((donor) => (
              <div
                key={donor.id}
                onClick={() => {
                  setSelectedDonor(donor);
                  setSearchTerm(`${donor.id} - ${donor.name}`);
                  if (onDonorSelect) {
                    onDonorSelect(donor.id);
                  }
                }}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {donor.id} - {donor.name}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          // Return false to ensure no further propagation
          openModal();
          return false;
        }}
        onMouseDown={(e) => {
          // Prevent any mousedown events from propagating
          e.preventDefault();
          e.stopPropagation();
        }}
        className="bg-blue-600 text-white hover:opacity-90 transition-opacity duration-200"
      >
        <span>Add New Donor</span>
      </Button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100 max-w-[95vw] w-full overflow-hidden"
        >
          <div className="flex-1 p-4 overflow-y-auto flex">
            {/* Main form content - takes up 2/3 of width on large screens */}
            <div className="flex-1 overflow-y-auto pr-4 lg:w-2/3">
              <div className="mb-2 border-b pb-2">
                <h1 className="bg-blue-600 p-2 text-center text-white text-3xl font-bold">
                  Add New Donor
                </h1>
                <p className="text-white text-base">
                  Fill in the details to add a new donor
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal Information Card */}
                <div>
                  <InputField
                    label="Title:"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                  />
                  <InputField
                    label="First Name:"
                    id="fname"
                    name="fname"
                    value={formData.fname}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                    autoComplete="off"
                  />
                  <InputField
                    label="Middle Name:"
                    id="mname"
                    name="mname"
                    value={formData.mname}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                    autoComplete="off"
                  />
                  <InputField
                    label="Last Name:"
                    id="lname"
                    name="lname"
                    value={formData.lname}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                    autoComplete="off"
                  />
                  <InputField
                    label="Suffix:"
                    id="sname"
                    name="sname"
                    value={formData.sname}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                    autoComplete="off"
                  />
                  <div className="mb-2">
                    <label className="block text-black text-xl mb-1">
                      Birth Date:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <select
                          id="bdateMonth"
                          name="bdateMonth"
                          value={formData.bdateMonth}
                          onChange={handleChange}
                          className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
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
                        value={formData.bdateDay}
                        onChange={handleChange}
                        placeholder="DD"
                        className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
                        autoComplete="off"
                        maxLength="2"
                      />
                      <input
                        type="text"
                        id="bdateYear"
                        name="bdateYear"
                        value={formData.bdateYear}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d{0,4}$/.test(value)) {
                            handleChange(e);
                          }
                        }}
                        placeholder="YYYY"
                        className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
                        autoComplete="off"
                        maxLength="4"
                      />
                    </div>
                  </div>
                  <InputField
                    label="Company:"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    uppercase={true}
                    className="text-base"
                  />
                  <div className="flex gap-2">
                    <div className="relative w-full">
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full p-2 pl-3 pr-8 border-2 rounded-md text-xl bg-white appearance-none cursor-pointer border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none relative z-10"
                      >
                        <option value="">Select a type</option>
                        {types.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.id} - {type.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg
                          className="fill-current h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>

                    <div className="relative w-full">
                      <select
                        id="group"
                        name="group"
                        value={formData.group}
                        onChange={handleChange}
                        className="w-full p-2 pl-3 pr-8 border-2 rounded-md text-xl bg-white appearance-none cursor-pointer border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none relative z-10"
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.id} - {group.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg
                          className="fill-current h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information Card */}
                <div>
                  <div className="space-y-3">
                    <InputField
                      label="House/Building Number & Street Name:"
                      id="housestreet"
                      name="housestreet"
                      value={addressData.housestreet}
                      onChange={(e) =>
                        handleAddressChange("housestreet", e.target.value)
                      }
                      uppercase={true}
                      className="text-base"
                      autoComplete="off"
                    />
                    <InputField
                      label="Subdivision/Compound Name:"
                      id="subdivision"
                      name="subdivision"
                      value={addressData.subdivision}
                      onChange={(e) =>
                        handleAddressChange("subdivision", e.target.value)
                      }
                      uppercase={true}
                      className="text-base"
                      autoComplete="off"
                    />
                    <InputField
                      label="Barangay:"
                      id="barangay"
                      name="barangay"
                      value={addressData.barangay}
                      onChange={(e) =>
                        handleAddressChange("barangay", e.target.value)
                      }
                      uppercase={true}
                      className="text-base"
                      autoComplete="off"
                    />
                    {areas && (
                      <AreaForm
                        onAreaChange={memoizedOnAreaChange}
                        initialAreaData={initialAreaData}
                        areas={areas}
                      />
                    )}
                    <div className="mt-4">
                      <InputField
                        label="Address Preview:"
                        id="combinedAddress"
                        name="combinedAddress"
                        value={combinedAddress}
                        type="textarea"
                        onChange={handleCombinedAddressChange}
                        onFocus={handleCombinedAddressFocus}
                        onBlur={handleCombinedAddressBlur}
                        className="w-full h-[160px] p-2 border rounded-md text-base whitespace-pre-line"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Card */}
                <div>
                  <div className="space-y-3">
                    <InputField
                      label="Contact Numbers:"
                      id="contactnos"
                      name="contactnos"
                      value={formData.contactnos}
                      onChange={handleChange}
                      className="text-base"
                    />
                    <InputField
                      label="Cell Number:"
                      id="cellno"
                      name="cellno"
                      value={formData.cellno}
                      onChange={handleChange}
                      className="text-base"
                    />
                    <InputField
                      label="Office Number:"
                      id="ofcno"
                      name="ofcno"
                      value={formData.ofcno}
                      onChange={handleChange}
                      className="text-base"
                    />
                    <InputField
                      label="Email:"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      type="email"
                      className="text-base"
                    />
                  </div>
                  <div className="mb-2">
                    <InputField
                      className="w-full h-[160px] p-2 border rounded-md text-base"
                      label="Remarks:"
                      id="remarks"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange}
                      type="textarea"
                    />
                  </div>
                </div>
              </div>

              {/* Global validation error message */}
              {validationError && (
                <div className="w-full mt-4">
                  <div className="text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3">
                    {validationError}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-4 border-t flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    resetForm();
                  }}
                  className="px-4 py-2 bg-red-200 hover:bg-red-300 rounded-md text-base"
                >
                  Clear All Fields
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    closeModalAndReset();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md text-base"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    handleSubmit(e);
                  }}
                  className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md text-base"
                >
                  Submit
                </Button>
              </div>
            </div>

            {/* Duplicate Panel - takes up 1/3 of width on large screens */}
            <div className="hidden lg:block lg:w-1/3 pl-4">
              <div className="sticky top-4 h-[calc(80vh-2rem)] w-[500px] overflow-y-auto">
                <DuplicatePanel
                  potentialDuplicates={potentialDuplicates}
                  isCheckingDuplicates={isCheckingDuplicates}
                  handleViewDuplicate={handleViewDuplicate}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Duplicate Details Modal */}
      {viewingDuplicate && selectedDuplicate && (
        <Modal
          isOpen={viewingDuplicate}
          onClose={handleCloseDuplicateView}
          className="bg-gray-400 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10 border border-gray-100 max-w-[80vw] w-auto overflow-hidden"
        >
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="mb-4 border-b pb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Duplicate Client Details
              </h2>
              <p className="text-gray-600">Client ID: {selectedDuplicate.id}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Personal Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-gray-600">Name: </span>
                    <span className="text-gray-800">
                      {selectedDuplicate.title && `${selectedDuplicate.title} `}
                      {selectedDuplicate.fname} {selectedDuplicate.mname}{" "}
                      {selectedDuplicate.lname} {selectedDuplicate.sname}
                    </span>
                  </div>
                  {selectedDuplicate.company && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Company:{" "}
                      </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.company}
                      </span>
                    </div>
                  )}
                  {selectedDuplicate.bdate && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Birth Date:{" "}
                      </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.bdate}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Contact Information
                </h3>
                <div className="space-y-2">
                  {selectedDuplicate.cellno && (
                    <div>
                      <span className="font-medium text-gray-600">Cell: </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.cellno}
                      </span>
                    </div>
                  )}
                  {selectedDuplicate.contactnos && (
                    <div>
                      <span className="font-medium text-gray-600">Phone: </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.contactnos}
                      </span>
                    </div>
                  )}
                  {selectedDuplicate.ofcno && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Office:{" "}
                      </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.ofcno}
                      </span>
                    </div>
                  )}
                  {selectedDuplicate.email && (
                    <div>
                      <span className="font-medium text-gray-600">Email: </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Address Information
                </h3>
                <div className="space-y-2">
                  {selectedDuplicate.address && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Address:{" "}
                      </span>
                      <div className="text-gray-800 whitespace-pre-line mt-1">
                        {selectedDuplicate.address}
                      </div>
                    </div>
                  )}
                  {selectedDuplicate.acode && (
                    <div>
                      <span className="font-medium text-gray-600">
                        Area Code:{" "}
                      </span>
                      <span className="text-gray-800">
                        {selectedDuplicate.acode}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              {selectedDuplicate.services &&
                selectedDuplicate.services.length > 0 && (
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      Services
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDuplicate.services.map((service) => (
                        <span
                          key={service}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
              <Button
                onClick={handleCloseDuplicateView}
                className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600 rounded-md"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DonorAdd;
