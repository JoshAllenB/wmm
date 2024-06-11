import { useState } from "react";

export const useRowHandlers = () => {
  const [hoverRowMetadata, setHoverRowMetadata] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleRowHover = (rowData) => {
    const { original } = rowData;
    const { adduser, adddate, metadata } = original;
    setHoverRowMetadata({ metadata, adduser, adddate });
  };

  const handleRowClick = (rowData) => {
    const rowValues = rowData.original;
    setSelectedRow(rowValues);
  };

  return {
    hoverRowMetadata,
    selectedRow,
    handleRowHover,
    handleRowClick,
    setHoverRowMetadata,
    setSelectedRow,
  };
};
