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

  // New state variables for autocomplete
  const [areaSearchResults, setAreaSearchResults] = useState([]);
  const [showAreaResults, setShowAreaResults] = useState(false);
  const [zipcodeSearchResults, setZipcodeSearchResults] = useState([]);
  const [showZipcodeResults, setShowZipcodeResults] = useState(false);
  const [highlightedAreaIndex, setHighlightedAreaIndex] = useState(0);
  const [highlightedZipcodeIndex, setHighlightedZipcodeIndex] = useState(0);

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

  const areaTrie = useMemo(() => {
    return buildTrie(areas.map(area => ({
      name: area._id,
      _id: area._id
    })));
  }, [areas]);

  const zipcodeTrie = useMemo(() => {
    const allZipcodes = areas.flatMap(area =>
      area.locations
        .filter(loc => loc.zipcode)
        .map(loc => ({
          name: String(loc.zipcode),
          _id: area._id,
          city: loc.name
        }))
    );
    return buildTrie(allZipcodes);
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

  // Handle area code input change
  const handleAreaInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setAcode(value);
    onAreaChange("acode", value);

    if (value.length >= 1) {
      const results = searchTrie(areaTrie, value);
      setAreaSearchResults(results);
      setShowAreaResults(true);
    } else {
      setAreaSearchResults([]);
      setShowAreaResults(false);
    }

    // Clear zipcode when area changes
    setZipcode("");
    onAreaChange("zipcode", "");
  };

  // Handle area code selection
  const handleAreaSelect = (areaCode) => {
    setAcode(areaCode);
    onAreaChange("acode", areaCode);
    setShowAreaResults(false);

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

  // Handle zipcode input change
  const handleZipcodeInputChange = (e) => {
    const value = e.target.value;
    setZipcode(value);
    onAreaChange("zipcode", value);

    if (value.length >= 1) {
      const results = searchTrie(zipcodeTrie, value);
      setZipcodeSearchResults(results);
      setShowZipcodeResults(true);
    } else {
      setZipcodeSearchResults([]);
      setShowZipcodeResults(false);
    }
  };

  // Handle zipcode selection
  const handleZipcodeSelect = (zipcodeData) => {
    setZipcode(zipcodeData.name);
    onAreaChange("zipcode", zipcodeData.name);
    
    // Update area code and city if they're from a different area
    if (zipcodeData._id !== acode) {
      setAcode(zipcodeData._id);
      onAreaChange("acode", zipcodeData._id);
      if (zipcodeData.city) {
        setCity(zipcodeData.city);
        onAreaChange("city", zipcodeData.city);
      }
    }
    
    setShowZipcodeResults(false);
  };

  // Key handlers for area code and zipcode search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showAreaResults && areaSearchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedAreaIndex((prevIndex) =>
            prevIndex < areaSearchResults.length - 1 ? prevIndex + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedAreaIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : areaSearchResults.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selected = areaSearchResults[highlightedAreaIndex];
          if (selected) {
            handleAreaSelect(selected.name);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowAreaResults(false);
        }
      }

      if (showZipcodeResults && zipcodeSearchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedZipcodeIndex((prevIndex) =>
            prevIndex < zipcodeSearchResults.length - 1 ? prevIndex + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedZipcodeIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : zipcodeSearchResults.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selected = zipcodeSearchResults[highlightedZipcodeIndex];
          if (selected) {
            handleZipcodeSelect(selected);
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowZipcodeResults(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAreaResults, areaSearchResults, highlightedAreaIndex, showZipcodeResults, zipcodeSearchResults, highlightedZipcodeIndex]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.area-search-container')) {
        setShowAreaResults(false);
      }
      if (!event.target.closest('.zipcode-search-container')) {
        setShowZipcodeResults(false);
      }
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
        <div className="area-search-container relative">
          <label className="block text-black text-xl mb-1">Area Code</label>
          <InputField
            type="text"
            name="acode"
            value={acode}
            onChange={handleAreaInputChange}
            className="text-base"
            autoComplete="off"
            uppercase={true}
            aria-expanded={showAreaResults}
            aria-haspopup="listbox"
            aria-controls="area-search-results"
            aria-activedescendant={
              showAreaResults && areaSearchResults.length > 0
                ? `area-option-${highlightedAreaIndex}`
                : undefined
            }
          />
          {showAreaResults && areaSearchResults.length > 0 && (
            <div 
              id="area-search-results"
              role="listbox"
              aria-label="Area code search results"
              className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {areaSearchResults.map((result, index) => (
                <div
                  id={`area-option-${index}`}
                  key={index}
                  role="option"
                  aria-selected={index === highlightedAreaIndex}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    index === highlightedAreaIndex ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleAreaSelect(result.name)}
                >
                  {result.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="zipcode-search-container relative">
          <label className="block text-black text-xl mb-1">Zip Code</label>
          <InputField
            type="text"
            name="zipcode"
            value={zipcode}
            onChange={handleZipcodeInputChange}
            className="text-base"
            autoComplete="off"
            aria-expanded={showZipcodeResults}
            aria-haspopup="listbox"
            aria-controls="zipcode-search-results"
            aria-activedescendant={
              showZipcodeResults && zipcodeSearchResults.length > 0
                ? `zipcode-option-${highlightedZipcodeIndex}`
                : undefined
            }
          />
          {showZipcodeResults && zipcodeSearchResults.length > 0 && (
            <div 
              id="zipcode-search-results"
              role="listbox"
              aria-label="Zipcode search results"
              className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {zipcodeSearchResults.map((result, index) => (
                <div
                  id={`zipcode-option-${index}`}
                  key={index}
                  role="option"
                  aria-selected={index === highlightedZipcodeIndex}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    index === highlightedZipcodeIndex ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleZipcodeSelect(result)}
                >
                  {result.name} - {result.city}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AreaForm;
