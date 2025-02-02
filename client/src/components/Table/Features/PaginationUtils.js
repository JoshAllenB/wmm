export function handlePreviousPage(
  page,
  setPage,
  fetchClients,
  setData,
  pageSize
) {
  if (page > 1) {
    setPage(page - 1);
    fetchClients(page - 1, pageSize);
  }
}

export function handleNextPage(
  page,
  setPage,
  fetchClients,
  setData,
  pageSize,
  totalPages
) {
  if (page < totalPages) {
    setPage(page + 1);
    fetchClients(page + 1, pageSize);
  }
}

export function handleFirstPage(setPage, fetchClients, setData, pageSize) {
  setPage(1);
  fetchClients(1, pageSize);
}

export function handleLastPage(totalPages, setPage, fetchClients, setData, pageSize) {
  setPage(totalPages);
  fetchClients(totalPages, pageSize);
}

export function handlePageJump(page, setPage, fetchClients, setData, pageSize, totalPages) {
  if (page >= 1 && page <= totalPages) {
    setPage(page);
    fetchClients(page, pageSize);
  }
}
