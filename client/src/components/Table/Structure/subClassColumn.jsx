/** @type import('@tanstack/react-table').ColumnDef<any>[] */
export const subClassColumns = [
  {
    id: "id",
    header: "ID",
    accessorFn: (row) => row.id,
  },
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
  },
];
