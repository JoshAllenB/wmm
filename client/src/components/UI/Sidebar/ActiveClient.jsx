import { useEffect, useState } from "react";
import ClientTable from "@/components/Tables/clienttable";
import Add from "@/components/add";
import {
  columns,
  fetchRecentClients,
} from "@/components/Tables/Data/activeClient";

export default function ActiveClient() {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchRecentClients(setClients);
  }, []);

  return (
    <>
      <div className="flex flex-col m-[20px]">
        <Add fetchClients={() => fetchRecentClients(setClients)} />
        <ClientTable columns={columns} data={clients} />
      </div>
    </>
  );
}
