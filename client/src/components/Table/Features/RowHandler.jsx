import { useState } from "react";

export const useRowHandlers = () => {
  const [hoverRowMetadata, setHoverRowMetadata] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const handleRowHover = (rowData) => {
    const { original } = rowData;
    const { adduser, adddate } = original;
    setHoverRowMetadata({ adduser, adddate });
  };

  const handleRowClick = (event, rowData) => {
    const isCheckboxClick = event.target.closest(".checkbox-cell");
    const rowValues = rowData.original;

    if (isCheckboxClick) {
      rowData.toggleSelected();
    } else {
      setEditRow(rowValues);
    }
  };

  return {
    hoverRowMetadata,
    editRow,
    handleRowHover,
    handleRowClick,
    setHoverRowMetadata,
    setEditRow,
  };
};
