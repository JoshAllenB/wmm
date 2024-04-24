import ClientTable from "@/components/Tables/clienttable";
import { clientData, columns } from "@/components/Tables/Data/clientdata";

export default function AllClient() {
  return (
    <div className="">
      <ClientTable data={clientData} columns={columns} />
    </div>
  );
}
