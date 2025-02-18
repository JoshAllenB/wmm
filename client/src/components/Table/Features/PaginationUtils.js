export const handleNextPage = async (
  page,
  setPage,
  fetchFunction,
  setData,
  pageSize,
  totalPages,
  searchTerm = "",
  selectedGroup = "",
  advancedFilterData = {}
) => {
  if (page < totalPages) {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchFunction(
      nextPage,
      pageSize,
      searchTerm,
      selectedGroup,
      advancedFilterData
    );
  }
};

export const handlePreviousPage = async (
  page,
  setPage,
  fetchFunction,
  setData,
  pageSize,
  searchTerm = "",
  selectedGroup = "",
  advancedFilterData = {}
) => {
  if (page > 1) {
    const prevPage = page - 1;
    setPage(prevPage);
    await fetchFunction(
      prevPage,
      pageSize,
      searchTerm,
      selectedGroup,
      advancedFilterData
    );
  }
};

export const handleFirstPage = async (
  setPage,
  fetchFunction,
  setData,
  pageSize,
  searchTerm = "",
  selectedGroup = "",
  advancedFilterData = {}
) => {
  setPage(1);
  await fetchFunction(
    1,
    pageSize,
    searchTerm,
    selectedGroup,
    advancedFilterData
  );
};

export const handleLastPage = async (
  totalPages,
  setPage,
  fetchFunction,
  setData,
  pageSize,
  searchTerm = "",
  selectedGroup = "",
  advancedFilterData = {}
) => {
  setPage(totalPages);
  await fetchFunction(
    totalPages,
    pageSize,
    searchTerm,
    selectedGroup,
    advancedFilterData
  );
};

export const handlePageJump = async (
  newPage,
  setPage,
  fetchFunction,
  setData,
  pageSize,
  totalPages,
  searchTerm = "",
  selectedGroup = "",
  advancedFilterData = {}
) => {
  if (newPage >= 1 && newPage <= totalPages) {
    setPage(newPage);
    await fetchFunction(
      newPage,
      pageSize,
      searchTerm,
      selectedGroup,
      advancedFilterData
    );
  }
};
