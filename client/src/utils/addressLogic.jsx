import { useState, useEffect } from "react";

const AddressForm = ({ onAddressChange, addressData }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const fetchData = async (endpoint, setter) => {
    try {
      const response = await fetch(`http://localhost:3001/api/${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected data format");
      }

      setter(data); // Update the state with the fetched data
    } catch (error) {
      console.error("There was a problem with the fetch:", error);
    }
  };

  useEffect(() => {
    fetchData("regions", setRegions);
  }, []);

  useEffect(() => {
    if (addressData.region) {
      const regionCode = regions.find(
        (r) => r.name === addressData.region,
      )?.code;
      if (regionCode) {
        fetchData(`regions/${regionCode}/provinces`, setProvinces);
        fetchData(`regions/${regionCode}/cities`, setCities);
      }
    }
  }, [addressData.region, regions]);

  useEffect(() => {
    if (addressData.province) {
      const provinceCode = provinces.find(
        (p) => p.name === addressData.province,
      )?.code;
      if (provinceCode) {
        fetchData(`provinces/${provinceCode}/cities-municipalities`, setCities);
      }
    }
  }, [addressData.province, provinces]);

  useEffect(() => {
    if (addressData.city) {
      const cityCode = cities.find((c) => c.name === addressData.city)?.code;
      if (cityCode) {
        fetchData(`cities-municipalities/${cityCode}/barangays`, setBarangays);
      }
    }
  }, [addressData.city, cities]);

  const handleChange = (type) => (event) => {
    const selectedOption = event.target.value;
    onAddressChange(type, selectedOption);
  };

  return (
    <div className="flex flex-col gap-3 text-lg mb-5">
      <select
        name="region"
        value={addressData.region}
        onChange={handleChange("region")}
      >
        <option value="">Select Region</option>
        {regions.map((region) => (
          <option key={region.code} value={region.name}>
            {region.name}
          </option>
        ))}
      </select>

      {addressData.region && provinces.length > 0 && (
        <select
          value={addressData.province}
          onChange={handleChange("province")}
        >
          <option value="">Select Province</option>
          {provinces.map((province) => (
            <option key={province.code} value={province.name}>
              {province.name}
            </option>
          ))}
        </select>
      )}

      {(addressData.region || addressData.province) && (
        <select value={addressData.city} onChange={handleChange("city")}>
          <option value="">Select City</option>
          {cities.map((city) => (
            <option key={city.code} value={city.name}>
              {city.name}
            </option>
          ))}
        </select>
      )}

      {addressData.city && (
        <select
          name="barangay"
          value={addressData.barangay}
          onChange={handleChange("barangay")}
        >
          <option value="">Select Barangay</option>
          {barangays.map((barangay) => (
            <option key={barangay.code} value={barangay.name}>
              {barangay.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default AddressForm;
