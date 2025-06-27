import { useState, useEffect, useMemo } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";

// Trie implementation
const buildTrie = (locations) => {
  const trie = {};
  locations.forEach(location => {
    let node = trie;
    const name = location.name?.toLowerCase() || '';
    for (const char of name) {
      if (!node[char]) node[char] = {};
      node = node[char];
    }
    if (!node.results) node.results = [];
    node.results.push(location);
  });
  return trie;
};

const searchTrie = (trie, query) => {
  let node = trie;
  for (const char of query.toLowerCase()) {
    if (!node[char]) return [];
    node = node[char];
  }
  return collectResults(node);
};

const collectResults = (node) => {
  let results = [];
  if (node.results) results = [...node.results];
  for (const key in node) {
    if (key !== 'results') {
      results.push(...collectResults(node[key]));
    }
  }
  return results.slice(0, 20); // Limit results
};

const AreaForm = ({ onAreaChange, initialAreaData }) => {
  // Separate state for each input to avoid interdependencies
  const [areas, setAreas] = useState([]);
  const [acode, setAcode] = useState(initialAreaData?.acode || "");
  const [zipcode, setZipcode] = useState(
    initialAreaData?.zipcode ? String(initialAreaData.zipcode) : ""
  );
  const [city, setCity] = useState(initialAreaData?.city || "");
  const [availableZipcodes, setAvailableZipcodes] = useState([]);
  const [showZipcodeOptions, setShowZipcodeOptions] = useState(false);
  const [citySearchResults, setCitySearchResults] = useState([]);
  const [showCityResults, setShowCityResults] = useState(false);

  // Create a memoized trie structure for city search
  const cityTrie = useMemo(() => {
    const allLocations = areas.flatMap(area => 
      area.locations.map(location => ({
        ...location,
        _id: area._id
      }))
    );
    return buildTrie(allLocations);
  }, [areas]);

  // Load areas data on component mount
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await fetchAreas();
        setAreas(areasData);

        // If we have an initial area code, find the matching area
        if (initialAreaData?.acode) {
          const matchingArea = areasData.find(
            (area) => area._id === initialAreaData.acode
          );

          if (matchingArea) {
            // Get all unique zipcodes for this area
            const zipcodes = matchingArea.locations
              .filter((loc) => loc.zipcode)
              .map((loc) => String(loc.zipcode));

            const uniqueZipcodes = [...new Set(zipcodes)];
            setAvailableZipcodes(uniqueZipcodes);

            // If we have only one zipcode and no initial zipcode, set it
            if (uniqueZipcodes.length === 1 && !initialAreaData.zipcode) {
              setZipcode(uniqueZipcodes[0]);
              onAreaChange("zipcode", uniqueZipcodes[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading areas:", error);
      }
    };

    loadAreas();
  }, [initialAreaData, onAreaChange]);

  // Handle city input change using trie search
  const handleCityInputChange = async (e) => {
    const value = e.target.value;
    setCity(value);
    onAreaChange("city", value);

    if (value.length >= 2) {
      const results = searchTrie(cityTrie, value);
      const formattedResults = results.map(location => ({
        name: location.name,
        _id: location._id,
        zipcode: location.zipcode
      }));
      setCitySearchResults(formattedResults);
      setShowCityResults(true);
    } else {
      setCitySearchResults([]);
      setShowCityResults(false);
    }
  };

  // Handle city selection
  const handleCitySelect = (cityName, areaCode, cityZipcode) => {
    setCity(cityName);
    setAcode(areaCode);
    onAreaChange("city", cityName);
    onAreaChange("acode", areaCode);
    
    if (cityZipcode) {
      const zipcodeStr = String(cityZipcode);
      setZipcode(zipcodeStr);
      onAreaChange("zipcode", zipcodeStr);
    }
    
    setShowCityResults(false);

    // Update available zipcodes for the selected area
    const selectedArea = areas.find((area) => area._id === areaCode);
    if (selectedArea?.locations) {
      const zipcodes = selectedArea.locations
        .filter((loc) => loc.zipcode)
        .map((loc) => String(loc.zipcode));
      const uniqueZipcodes = [...new Set(zipcodes)];
      setAvailableZipcodes(uniqueZipcodes);
    }
  };

  // Handle area code change
  const handleAreaCodeChange = (e) => {
    const selectedAcode = e.target.value;
    setAcode(selectedAcode);
    onAreaChange("acode", selectedAcode);

    // Clear zipcode options dropdown state
    setShowZipcodeOptions(false);

    // Update available zipcodes based on the selected area
    if (selectedAcode) {
      const selectedArea = areas.find((area) => area._id === selectedAcode);
      if (selectedArea?.locations) {
        // Get all unique zipcodes for this area
        const zipcodes = selectedArea.locations
          .filter((loc) => loc.zipcode)
          .map((loc) => String(loc.zipcode));

        const uniqueZipcodes = [...new Set(zipcodes)];
        setAvailableZipcodes(uniqueZipcodes);

        // If only one zipcode, set it automatically
        if (uniqueZipcodes.length === 1) {
          setZipcode(uniqueZipcodes[0]);
          onAreaChange("zipcode", uniqueZipcodes[0]);
        } else if (uniqueZipcodes.length > 1) {
          // Show available zipcodes but don't auto-select
          setShowZipcodeOptions(true);
        }
      }
    } else {
      // Reset if no area code selected
      setAvailableZipcodes([]);
    }
  };

  // Handle zipcode change - completely independent from area code
  const handleZipcodeChange = (e) => {
    const newZipcode = e.target.value;
    setZipcode(newZipcode);
    onAreaChange("zipcode", newZipcode);
  };

  // Handle selecting a zipcode from the dropdown
  const handleZipcodeSelect = (selectedZipcode) => {
    setZipcode(selectedZipcode);
    onAreaChange("zipcode", selectedZipcode);
    setShowZipcodeOptions(false);
  };

  // Click outside handler to close city results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.city-search-container')) {
        setShowCityResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 text-lg">
      <div className="city-search-container relative">
        <InputField
          label="City"
          type="text"
          name="city"
          value={city}
          onChange={handleCityInputChange}
          className="text-base"
          autoComplete="off"
          uppercase={true}
        />
        {showCityResults && citySearchResults.length > 0 && (
          <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {citySearchResults.map((result, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleCitySelect(result.name, result._id, result.zipcode)}
              >
                {result.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-black text-xl mb-1">Area Code</label>
          <select
            name="acode"
            value={acode}
            onChange={handleAreaCodeChange}
            className="
              w-full 
              p-2 
              text-lg 
              border-2 
              rounded-md 
              border-gray-300 
              focus:border-blue-500 
              focus:outline-none 
              focus:ring-4 
              focus:ring-blue-200 
              transition-all 
              duration-300
            "
          >
            <option value="">Select Area Code</option>
            {areas.map((area) => (
              <option key={area._id} value={area._id}>
                {area._id}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <label className="block text-black text-xl mb-1">Zip Code</label>
          <input
            type="text"
            name="zipcode"
            value={zipcode}
            onChange={handleZipcodeChange}
            onClick={() =>
              availableZipcodes.length > 1 && setShowZipcodeOptions(true)
            }
            className="
              w-full 
              p-2 
              text-lg 
              border-2 
              rounded-md 
              border-gray-300 
              focus:border-blue-500 
              focus:outline-none 
              focus:ring-4 
              focus:ring-blue-200 
              transition-all 
              duration-300
            "
          />

          {/* Zipcode suggestions dropdown */}
          {showZipcodeOptions && availableZipcodes.length > 1 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-2 text-sm text-gray-500 border-b">
                Available Zipcodes:
              </div>
              {availableZipcodes.map((zip) => (
                <div
                  key={zip}
                  className="p-2 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleZipcodeSelect(zip)}
                >
                  {zip}
                </div>
              ))}
            </div>
          )}

          {/* Help text when multiple zipcodes are available */}
          {availableZipcodes.length > 1 && !showZipcodeOptions && (
            <div className="text-xs text-blue-600 mt-1">
              <button
                type="button"
                className="underline focus:outline-none text-base"
                onClick={() => setShowZipcodeOptions(true)}
              >
                {availableZipcodes.length} zipcode options available - click to
                view
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaForm;
