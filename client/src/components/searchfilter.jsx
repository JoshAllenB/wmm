/* eslint-disable react/prop-types */
import { useState } from "react";
import { Button } from "./ui/button";

const SearchFilter = ({ onSearch, onClear }) => {
  const [query, setQuery] = useState("");

  const handleChange = (e) => {
    const { value } = e.target;
    setQuery(value);
    // Trigger search function with the current query value
    onSearch(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit function can be handled separately if needed
  };

  const handleClear = () => {
    setQuery(""); // Clear the search query
    onClear(); // Execute clear function
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search"
          className="border-2 border-gray-700 rounded-md px-5 py-2 mr-3"
        />
        <Button type="submit">Search</Button>
        {query && ( // Render clear button only when there's a search query
          <Button onClick={handleClear} className="ml-2">
            Clear Search
          </Button>
        )}
      </div>
    </form>
  );
};

export default SearchFilter;
