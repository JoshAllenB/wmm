import { useState, useEffect } from "react";
import psgcJSON from "./psgc.json";

const AddressForm = ({ onAddressChange, addressData }) => {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  useEffect(() => {
    if (psgcJSON && Array.isArray(psgcJSON)) {
      const regionData = psgcJSON.map((region) => ({
        name: region["Region Name"],
        code: region["Region PSGC"],
      }));
      setRegions(regionData);
    }
  }, []);

  useEffect(() => {
    if (addressData.region) {
      const selectedRegion = psgcJSON.find(
        (region) => region["Region Name"] === addressData.region
      );

      if (selectedRegion) {
        setProvinces(selectedRegion.Provinces || []);
        setCities(selectedRegion.Cities || []);
      }
    }
  }, [addressData.region]);

  useEffect(() => {
    if (addressData.province) {
      const selectedProvince = provinces.find(
        (province) => province.Name === addressData.province
      );

      if (selectedProvince) {
        setCities(selectedProvince.Cities || []);
      }
    }
  }, [addressData.province, provinces]);

  useEffect(() => {
    if (addressData.city) {
      const selectedCity = cities.find((city) => city.Name === addressData.city);
      if (selectedCity) {
        setBarangays(selectedCity.barangays || []);
      }
    }
  }, [addressData.city, cities]);

  const handleChange = (type) => (event) => {
    const selectedOption = event.target.value;
    onAddressChange(type, selectedOption);
  };

  return (
    <div className="flex flex-col gap-3 text-lg mb-5">
      {/* Region Select */}
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

      {/* Province Select */}
      {addressData.region && provinces.length > 0 && (
        <select
          value={addressData.province}
          onChange={handleChange("province")}
        >
          <option value="">Select Province</option>
          {provinces.map((province) => (
            <option key={province["Correspondence Code"]} value={province.Name}>
              {province.Name}
            </option>
          ))}
        </select>
      )}

      {/* City Select */}
      {(addressData.region || addressData.province) && (
        <select value={addressData.city} onChange={handleChange("city")}>
          <option value="">Select City</option>
          {cities.map((city) => (
            <option key={city["Correspondence Code"]} value={city.Name}>
              {city.Name}
            </option>
          ))}
        </select>
      )}

      {/* Barangay Select */}
      {addressData.city && (
        <select
          name="barangay"
          value={addressData.barangay}
          onChange={handleChange("barangay")}
        >
          <option value="">Select Barangay</option>
          {barangays.map((barangay) => (
            <option
              key={barangay["Barangay Correspondence Code"]}
              value={barangay["Barangay Name"]}
            >
              {barangay["Barangay Name"]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default AddressForm;
