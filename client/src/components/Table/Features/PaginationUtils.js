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
