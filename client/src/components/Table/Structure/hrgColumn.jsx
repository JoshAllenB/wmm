import { Checkbox } from "../../UI/ShadCN/checkbox";

/** @type import ('@tanstack/react-table).ColumnDef<any>*/
export const columns = [
  {
    id: "select",
    size: 30,
    header: ({ table }) => (
      <div className="checkbox-cell">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
          }}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="checkbox-cell">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
        />
      </div>
    ),
  },
  { id: "ID", header: "ID", accessorFn: (row) => row.id, size: 40 },
  {
    id: "ClientID",
    header: "ClientID",
    accessorFn: (row) => row.clientid,
    size: 60,
  },
  { id: "RecvDate", header: "Recv Date", accessorFn: (row) => row.recvdate },
  { id: "RenewDate", header: "Renew Date", accessorFn: (row) => row.renewdate },
  {
    id: "PaymtAmt",
    header: "Paymt Amt",
    accessorFn: (row) => row.paymtamt,
  },
  {
    id: "Unsubscribe",
    header: "Unsubscribe",
    accessorFn: (row) => row.unsubscribe,
  },
  { id: "AddDate", header: "Add Date", accessorFn: (row) => row.adddate },
  { id: "AddUser", header: "Add User", accessorFn: (row) => row.adduser },
];
