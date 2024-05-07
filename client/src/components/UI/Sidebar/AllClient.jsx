import ClientTable from "@/components/Tables/clienttable";
import { columns } from "@/components/Tables/Data/clientdata";
import { fetchClients } from "@/components/Tables/Data/clientdata";
import { useState, useEffect } from "react";

export default function AllClient() {
  const [clientData, setClientData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await fetchClients(setClientData);
  };

  return (
    <div className="m-[30px]">
      <ClientTable data={clientData} columns={columns} />
    </div>
  );
}
