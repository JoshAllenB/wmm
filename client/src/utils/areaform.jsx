import { useState, useEffect, useMemo } from "react";
import { fetchAreas } from "../components/Table/Data/utilData";
import InputField from "../components/CRUD/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/UI/ShadCN/select";

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
  const [highlightedIndex, setHighlightedIndex] = useState(0);

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

  // Reset highlighted index when search results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [citySearchResults]);

  // Key handler for city search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showCityResults || citySearchResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex < citySearchResults.length - 1 ? prevIndex + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : citySearchResults.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = citySearchResults[highlightedIndex];
        if (selected) {
          handleCitySelect(selected.name, selected._id, selected.zipcode);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCityResults(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [citySearchResults, showCityResults, highlightedIndex]);

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
  const handleAreaCodeChange = (value) => {
    // If placeholder is selected, treat it as empty
    const selectedValue = value === "placeholder" ? "" : value;
    setAcode(selectedValue);
    onAreaChange("acode", selectedValue);

    // Clear zipcode when area changes
    setZipcode("");
    onAreaChange("zipcode", "");

    // Update available zipcodes based on the selected area
    if (selectedValue) {
      const selectedArea = areas.find((area) => area._id === selectedValue);
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
  const handleZipcodeSelect = (value) => {
    const selectedValue = value === "placeholder" ? "" : value;
    setZipcode(selectedValue);
    onAreaChange("zipcode", selectedValue);
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
          aria-expanded={showCityResults}
          aria-haspopup="listbox"
          aria-controls="city-search-results"
          aria-activedescendant={
            showCityResults && citySearchResults.length > 0
              ? `city-option-${highlightedIndex}`
              : undefined
          }
        />
        {showCityResults && citySearchResults.length > 0 && (
          <div 
            id="city-search-results"
            role="listbox"
            aria-label="City search results"
            className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            {citySearchResults.map((result, index) => (
              <div
                id={`city-option-${index}`}
                key={index}
                role="option"
                aria-selected={index === highlightedIndex}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  index === highlightedIndex ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
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
          <Select 
            defaultValue={acode || "placeholder"} 
            onValueChange={handleAreaCodeChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Area Code" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder">Select Area Code</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area._id} value={area._id}>
                  {area._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <label className="block text-black text-xl mb-1">Zip Code</label>
          {availableZipcodes.length > 1 ? (
            <Select 
              defaultValue={zipcode || "placeholder"} 
              onValueChange={handleZipcodeSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Zip Code" />
              </SelectTrigger>
              <SelectContent>
                {availableZipcodes.map((zip) => (
                  <SelectItem key={zip} value={zip}>
                    {zip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              type="text"
              name="zipcode"
              value={zipcode}
              onChange={handleZipcodeChange}
              className="w-full p-2 text-lg border-2 rounded-md border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-300"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaForm;
