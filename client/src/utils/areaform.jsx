import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import InputField from "../components/CRUD/input";

// Trie implementation
const buildTrie = (locations) => {
  const trie = {};
  locations.forEach((location) => {
    let node = trie;
    const name = location.name?.toLowerCase() || "";
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
    if (key !== "results") {
      results.push(...collectResults(node[key]));
    }
  }
  return results.slice(0, 20); // Limit results
};

const AreaForm = forwardRef(
  ({ onAreaChange, initialAreaData, areas, onValidationChange }, ref) => {
    // Separate state for each input to avoid interdependencies
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
    const [acodeError, setAcodeError] = useState("");

    // Create a memoized trie structure for city search
    const cityTrie = useMemo(() => {
      if (!areas) return {};
      const allLocations = areas.flatMap((area) =>
        area.locations.map((location) => ({
          ...location,
          _id: area._id,
        }))
      );
      return buildTrie(allLocations);
    }, [areas]);

    const areaTrie = useMemo(() => {
      if (!areas) return {};
      return buildTrie(
        areas.map((area) => ({
          name: area._id,
          _id: area._id,
        }))
      );
    }, [areas]);

    const zipcodeTrie = useMemo(() => {
      if (!areas) return {};
      const allZipcodes = areas.flatMap((area) =>
        area.locations
          .filter((loc) => loc.zipcode)
          .map((loc) => ({
            name: String(loc.zipcode),
            _id: area._id,
            city: loc.name,
          }))
      );
      return buildTrie(allZipcodes);
    }, [areas]);

    // Update initial area code effect to use areas prop
    useEffect(() => {
      if (!areas || !initialAreaData?.acode) return;

      const matchingArea = areas.find(
        (area) => area._id === initialAreaData.acode
      );

      if (matchingArea) {
        const zipcodes = matchingArea.locations
          .filter((loc) => loc.zipcode)
          .map((loc) => String(loc.zipcode));

        const uniqueZipcodes = [...new Set(zipcodes)];
        setAvailableZipcodes(uniqueZipcodes);

        if (uniqueZipcodes.length === 1 && !initialAreaData.zipcode) {
          setZipcode(uniqueZipcodes[0]);
          onAreaChange("zipcode", uniqueZipcodes[0]);
        }
      }
    }, [areas, initialAreaData, onAreaChange]);

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
    const handleCityInputChange = useCallback(
      (e) => {
        const value = e.target.value.toUpperCase();
        setCity(value);

        // Always trigger the city change first
        onAreaChange("city", value);

        if (value.length >= 2) {
          const results = searchTrie(cityTrie, value);
          const formattedResults = results.map((location) => ({
            name: location.name.toUpperCase(),
            _id: location._id,
            zipcode: location.zipcode,
          }));
          setCitySearchResults(formattedResults);
          setShowCityResults(true);
        } else {
          setCitySearchResults([]);
          setShowCityResults(false);
          // Clear related fields when city is cleared
          setAcode("");
          setZipcode("");
          onAreaChange("acode", "");
          onAreaChange("zipcode", "");
          // Force another city update to ensure the combined address updates
          setTimeout(() => {
            onAreaChange("city", value);
          }, 0);
        }
      },
      [cityTrie, onAreaChange]
    );

    // Handle city selection
    const handleCitySelect = (cityName, areaCode, cityZipcode) => {
      const upperCityName = cityName.toUpperCase();

      // First update the city to trigger the address update
      onAreaChange("city", upperCityName);

      // Then update area code and zipcode
      setCity(upperCityName);
      setAcode(areaCode);

      // Find the matching area and location
      const selectedArea = areas.find((area) => area._id === areaCode);
      const selectedLocation = selectedArea?.locations.find(
        (loc) => loc.name.toUpperCase() === upperCityName
      );

      // Get the zipcode either from the selected location or passed zipcode
      const newZipcode = selectedLocation?.zipcode || cityZipcode || "";
      setZipcode(String(newZipcode));

      // Update parent component with all changes in sequence
      onAreaChange("acode", areaCode);
      onAreaChange("zipcode", String(newZipcode));

      // Force another city update to ensure the combined address updates
      setTimeout(() => {
        onAreaChange("city", upperCityName);
      }, 0);

      setShowCityResults(false);

      // Update available zipcodes for the selected area
      if (selectedArea?.locations) {
        const zipcodes = selectedArea.locations
          .filter((loc) => loc.zipcode)
          .map((loc) => String(loc.zipcode));
        const uniqueZipcodes = [...new Set(zipcodes)];
        setAvailableZipcodes(uniqueZipcodes);
      }
    };

    // Handle area code input change
    const handleAreaInputChange = useCallback(
      (e) => {
        const value = e.target.value.toUpperCase();

        // Clear any previous error
        setAcodeError("");

        // Validate that area code is not purely numeric (to prevent zipcode input)
        if (value && /^\d+$/.test(value)) {
          setAcodeError("Area code must contain letters (e.g., NCR, CAR, R01)");
          return;
        }

        setAcode(value);
        onAreaChange("acode", value);

        // Only show search results if there's a value
        if (value.length >= 1) {
          const results = searchTrie(areaTrie, value);
          setAreaSearchResults(results);
          setShowAreaResults(true);
        } else {
          setAreaSearchResults([]);
          setShowAreaResults(false);
          // Clear related fields when area code is cleared
          setZipcode("");
          onAreaChange("zipcode", "");
        }
      },
      [areaTrie, onAreaChange]
    );

    // Handle area code selection
    const handleAreaSelect = useCallback(
      (areaCode) => {
        setAcode(areaCode);
        onAreaChange("acode", areaCode);
        setShowAreaResults(false);
        setAcodeError(""); // Clear any error when selecting from dropdown

        // Update available zipcodes for the selected area
        const selectedArea = areas.find((area) => area._id === areaCode);
        if (selectedArea?.locations) {
          const zipcodes = selectedArea.locations
            .filter((loc) => loc.zipcode)
            .map((loc) => String(loc.zipcode));
          const uniqueZipcodes = [...new Set(zipcodes)];
          setAvailableZipcodes(uniqueZipcodes);
        }
      },
      [areas, onAreaChange]
    );

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
    }, [
      showAreaResults,
      areaSearchResults,
      highlightedAreaIndex,
      showZipcodeResults,
      zipcodeSearchResults,
      highlightedZipcodeIndex,
    ]);

    // Click outside handlers
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest(".area-search-container")) {
          setShowAreaResults(false);
        }
        if (!event.target.closest(".zipcode-search-container")) {
          setShowZipcodeResults(false);
        }
        if (!event.target.closest(".city-search-container")) {
          setShowCityResults(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    useEffect(() => {
      if (initialAreaData) {
        // Only update if the values are different and not explicitly cleared by user
        if (
          initialAreaData.acode !== undefined &&
          initialAreaData.acode !== acode &&
          !acode.trim() === ""
        ) {
          setAcode(initialAreaData.acode);
        }
        if (
          initialAreaData.zipcode !== undefined &&
          String(initialAreaData.zipcode) !== zipcode &&
          !zipcode.trim() === ""
        ) {
          setZipcode(String(initialAreaData.zipcode));
        }
        if (
          initialAreaData.city !== undefined &&
          initialAreaData.city !== city &&
          !city.trim() === ""
        ) {
          setCity(initialAreaData.city);
        }
      }
    }, [initialAreaData]);

    // Validate area code is required
    const validateAreaCode = useCallback(() => {
      const isValid = acode && acode.trim() !== "";
      if (!isValid && !acodeError) {
        setAcodeError("Area code is required");
      }
      return isValid;
    }, [acode, acodeError]);

    // Notify parent of validation state changes
    useEffect(() => {
      if (onValidationChange) {
        const isValid = acode && acode.trim() !== "";
        onValidationChange("acode", isValid);
      }
    }, [acode, onValidationChange]);

    // Expose validation function to parent components
    useImperativeHandle(
      ref,
      () => ({
        validateAreaCode,
        isAreaCodeValid: () => acode && acode.trim() !== "",
      }),
      [validateAreaCode, acode]
    );

    // Memoize the className to prevent unnecessary re-renders
    const areaCodeClassName = useMemo(() => {
      return `${acodeError ? "border-red-500" : ""}`;
    }, [acodeError]);

    return (
      <div className="flex flex-col">
        <div className="city-search-container relative">
          <InputField
            label="City | Province | Country"
            type="text"
            name="city"
            value={city}
            onChange={handleCityInputChange}
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
              className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg overflow-y-auto"
            >
              {citySearchResults.map((result, index) => (
                <div
                  id={`city-option-${index}`}
                  key={index}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={`cursor-pointer text-sm ${
                    index === highlightedIndex
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() =>
                    handleCitySelect(result.name, result._id, result.zipcode)
                  }
                >
                  {result.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="area-search-container relative">
            <InputField
              label="Area Code"
              type="text"
              name="acode"
              value={acode}
              onChange={handleAreaInputChange}
              className={areaCodeClassName}
              autoComplete="off"
              uppercase={true}
              required={true}
              aria-expanded={showAreaResults}
              aria-haspopup="listbox"
              aria-controls="area-search-results"
              aria-activedescendant={
                showAreaResults && areaSearchResults.length > 0
                  ? `area-option-${highlightedAreaIndex}`
                  : undefined
              }
            />
            {acodeError && (
              <div className="text-white bg-red-500 p-1 text-xs break-words">
                {acodeError}
              </div>
            )}
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
                      index === highlightedAreaIndex
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
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
            <InputField
              label="Zip Code"
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
                      index === highlightedZipcodeIndex
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
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
  }
);

AreaForm.displayName = "AreaForm";

export default AreaForm;
