import { useState, useEffect } from "react";

const AddressForm = ({ onAddressChange, addressData, psgcJSON }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [subLocations, setSubLocations] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [showLocations, setShowLocations] = useState(true);

  // Initialize regions
  useEffect(() => {
    if (psgcJSON && Array.isArray(psgcJSON)) {
      const regionData = psgcJSON.map((region) => ({
        name: region["Region Name"],
        psgc: region["Region PSGC"],
        provinces: region.Provinces || [],
        independentCities: region["Independent Cities"] || [],
      }));
      setRegions(regionData);
    }
  }, [psgcJSON]);

  // Handle region selection
  useEffect(() => {
    if (addressData.region) {
      const selectedRegion = regions.find(
        (region) => region.name === addressData.region
      );

      if (selectedRegion) {
        const combinedLocations = [
          ...selectedRegion.provinces.map((province) => ({
            type: "province",
            name: province["Province Name"].toUpperCase(),
            uniqueKey: province["Province PSGC"],
            data: province,
          })),
          ...selectedRegion.independentCities.map((city) => ({
            type: "independent-city",
            name: city["City Name"].replace(/^City of\s+/i, "").toUpperCase(),
            uniqueKey: city["City PSGC"],
            data: city,
          })),
        ];

        setProvinces(combinedLocations);
        setLocations([]);
        setSubLocations([]);
        setBarangays([]);
        setShowLocations(true);
      }
    } else {
      resetForm();
    }
  }, [addressData.region, regions]);

  // Handle province/independent city selection
  useEffect(() => {
    if (addressData.province) {
      const selectedLocation = provinces.find(
        (location) => location.name === addressData.province
      );

      if (selectedLocation) {
        // For provinces
        if (selectedLocation.type === "province") {
          setShowLocations(true);
          const province = selectedLocation.data;
          const combinedLocations = [
            ...(province.Municipalities || []).map((mun) => ({
              type: "municipality",
              name: mun.Name.toUpperCase(),
              uniqueKey: mun.CorrespondenceCode,
              data: mun,
            })),
            ...(province.Cities || []).map((city) => ({
              type: "city",
              name: city.Name.replace(/^City of\s+/i, "").toUpperCase(),
              uniqueKey: city.Code,
              data: city,
            })),
          ];
          setLocations(combinedLocations);
          setBarangays([]);
        }
        // For independent cities
        else if (selectedLocation.type === "independent-city") {
          const subMuns = selectedLocation.data.SubMunicipalities || [];
          const cityBarangays = selectedLocation.data.Barangays || [];

          if (subMuns.length > 0) {
            // If there are subMuns, show the locations dropdown
            setShowLocations(true);
            const combinedLocations = subMuns.map((subMun) => ({
              type: "sub-municipality",
              name: subMun.Name.toUpperCase(),
              uniqueKey: subMun.CorrespondenceCode,
              data: subMun,
            }));
            setLocations(combinedLocations);
            setBarangays([]);
          } else {
            // If no subMuns, hide the locations dropdown and show barangays directly
            setShowLocations(false);
            setLocations([]);
            // Process and set barangays directly for the independent city
            const processedBarangays = cityBarangays.map((barangay, index) => ({
              ...barangay,
              uniqueKey: `${
                barangay["Barangay PSGC"] || barangay.CorrespondenceCode
              }-${index}`,
              name: (barangay["Barangay Name"] || barangay.Name).toUpperCase(),
            }));
            setBarangays(processedBarangays);
            // Clear any existing location selection since we're showing barangays directly
            onAddressChange("location", "");
          }
        }
      }
    } else {
      setLocations([]);
      setSubLocations([]);
      setBarangays([]);
      setShowLocations(true);
    }
  }, [addressData.province, provinces]);

  // Handle location selection
  useEffect(() => {
    if (addressData.location && locations.length > 0) {
      const selectedLocation = locations.find(
        (loc) => loc.name === addressData.location
      );

      if (selectedLocation) {
        switch (selectedLocation.type) {
          case "municipality":
          case "city":
          case "sub-municipality":
            const locationData = selectedLocation.data;
            const processedBarangays = (locationData.Barangays || []).map(
              (barangay, index) => ({
                ...barangay,
                uniqueKey: `${
                  barangay["Barangay PSGC"] || barangay.CorrespondenceCode
                }-${index}`,
                name: (
                  barangay["Barangay Name"] || barangay.Name
                ).toUpperCase(),
              })
            );
            setBarangays(processedBarangays);
            setSubLocations([]);
            break;
        }
      }
    }
  }, [addressData.location, locations]);

  const handleChange = (type) => (event) => {
    const value = event.target.value;
    onAddressChange(type, value);

    switch (type) {
      case "region":
        onAddressChange("province", "");
        onAddressChange("location", "");
        onAddressChange("subLocation", "");
        onAddressChange("barangay", "");
        break;
      case "province":
        onAddressChange("location", "");
        onAddressChange("subLocation", "");
        onAddressChange("barangay", "");
        break;
      case "location":
        onAddressChange("subLocation", "");
        onAddressChange("barangay", "");
        break;
      case "subLocation":
        onAddressChange("barangay", "");
        break;
    }
  };

  const resetForm = () => {
    setProvinces([]);
    setLocations([]);
    setSubLocations([]);
    setBarangays([]);
    setShowLocations(true);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Region Select */}
      <select
        className="w-full p-2 border rounded-md"
        value={addressData.region || ""}
        onChange={handleChange("region")}
      >
        <option value="">Select Region</option>
        {regions.map((region) => (
          <option key={region.psgc} value={region.name}>
            {region.name}
          </option>
        ))}
      </select>

      {/* Province/Independent City Select */}
      {provinces.length > 0 && (
        <select
          className="w-full p-2 border rounded-md"
          value={addressData.province || ""}
          onChange={handleChange("province")}
        >
          <option value="">Select Province/City</option>
          {provinces.map((location) => (
            <option key={location.uniqueKey} value={location.name}>
              {location.name}
            </option>
          ))}
        </select>
      )}

      {/* Municipality/City Select - Only show if showLocations is true */}
      {showLocations && locations.length > 0 && (
        <select
          className="w-full p-2 border rounded-md"
          value={addressData.location || ""}
          onChange={handleChange("location")}
        >
          <option value="">Select Municipality/City</option>
          {locations.map((location) => (
            <option key={location.uniqueKey} value={location.name}>
              {location.name}
            </option>
          ))}
        </select>
      )}

      {/* Barangay Select */}
      {barangays.length > 0 && (
        <select
          className="w-full p-2 border rounded-md"
          value={addressData.barangay || ""}
          onChange={handleChange("barangay")}
        >
          <option value="">Select Barangay</option>
          {barangays.map((barangay) => (
            <option key={barangay.uniqueKey} value={barangay.name}>
              {barangay.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default AddressForm;
