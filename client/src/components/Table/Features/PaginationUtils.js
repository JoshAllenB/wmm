export function handlePreviousPage(
  page,
  setPage,
  fetchClients,
  setData,
  pageSize
) {
  if (page > 1) {
    setPage(page - 1);
    fetchClients(setData, page - 1, pageSize);
  }
}

export function handleNextPage(page, setPage, fetchClients, setData, pageSize) {
  setPage(page + 1);
  fetchClients(setData, page + 1, pageSize);
}
