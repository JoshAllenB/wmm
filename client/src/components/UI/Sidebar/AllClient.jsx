import ClientTable from "@/components/Tables/clienttable";
import Add from "@/components/add";

import { columns, fetchClients } from "@/components/Tables/Data/clientdata";
import { useState, useEffect } from "react";

export default function AllClient() {
  const [clientData, setClientData] = useState([]);

  useEffect(() => {
    fetchClients(setClientData);
  }, []);

  return (
    <div className="m-[30px]">
      <Add fetchClients={() => fetchClients(setClientData)} />
      <ClientTable data={clientData} columns={columns} />
    </div>
  );
}
