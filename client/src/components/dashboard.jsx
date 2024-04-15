import { useEffect, useState } from "react";
import axios from "axios";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import SearchFilter from "./searchfilter";
import { Button } from "./ui/button";
import Add from "./add";
import Edit from "./edit";
import _ from "lodash";
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from "./ui/table";

const Dashboard = () => {
  const [clients, setClients] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const fetchClients = async (pageNumber) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/clients?page=${pageNumber}`
      );
      console.log("Response data:", response.data);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Initial clients state:", clients);

    if (searchQuery.trim() === "") {
      setClients([]);
      setPage(1);
      return;
    }

    const debouncedFetchClients = _.debounce(fetchClients, 200);
    debouncedFetchClients(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  useEffect(() => {
    fetchClients(page);
  }, [page]);

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:3001/search?query=${query}`
      );
      setClients(response.data);
    } catch (e) {
      console.error("Error fetching clients:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (client) => {
    setSelectedClient(client);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
  };

  const handleSaveChanges = async (updatedClient) => {
    try {
      await axios.put(
        `http://localhost:3001/clients/${updatedClient._id}`,
        updatedClient
      );

      setClients((prevClients) =>
        prevClients.map((client) =>
          client._id === updatedClient._id ? updatedClient : client
        )
      );

      handleCloseModal();
    } catch (error) {
      console.error("error updating client:", error);
    }
  };

  const handleDelete = async (clientId) => {
    try {
      console.log("Deleting client with ID:", clientId);
      await axios.delete(`http://localhost:3001/clients/${clientId}`);

      setClients((prevClients) =>
        prevClients.filter((client) => client._id !== clientId)
      );

      handleCloseModal();
    } catch (e) {
      console.error("error deleting client:", e);
    }
  };

  const getFullName = (client) => {
    const { lname, fname, mname, sname } = client;
    return `${lname} ${fname} ${mname ? mname : ""} ${
      sname ? sname : ""
    }`.trim();
  };

  const getContactInfo = (client) => {
    const { contactnos, cellno, ofcno, email } = client;
    const contactInfo = [];

    if (contactnos) {
      contactInfo.push(contactnos);
    }
    if (cellno) {
      contactInfo.push(cellno);
    }
    if (ofcno) {
      contactInfo.push(ofcno);
    }
    if (email) {
      contactInfo.push(email);
    }

    return contactInfo.join(", ");
  };

  return (
    <div className="flex flex-col w-[100%] p-5">
      <div className="w-[300px] p-5 flex gap-1">
        <SearchFilter
          onSearch={handleSearch}
          onSearchChange={handleSearchChange}
        />
        <Add fetchClients={fetchClients} />
      </div>
      <ScrollArea className="h-[750px] rounded-md border p-1 overflow-x-auto cursor-pointer">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Birth Date</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Zipcode</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Area Code</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Add Date</TableHead>
              <TableHead>Add User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(clients) &&
              clients.map((client) => (
                <TableRow
                  key={client._id}
                  onClick={() => handleRowClick(client)}
                  className="cursor-pointer hover:bg-gray-200"
                >
                  <TableCell>{client.id}</TableCell>
                  <TableCell>{client.title}</TableCell>
                  <TableCell>{getFullName(client)}</TableCell>
                  <TableCell>{client.bdate}</TableCell>
                  <TableCell>{client.company}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{client.zipcode}</TableCell>
                  <TableCell>{client.area}</TableCell>
                  <TableCell>{client.acode}</TableCell>
                  <TableCell>{getContactInfo(client)}</TableCell>
                  <TableCell>{client.type}</TableCell>
                  <TableCell>{client.group}</TableCell>
                  <TableCell>{client.remarks}</TableCell>
                  <TableCell>{client.adddate}</TableCell>
                  <TableCell>{client.adduser}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" className="red-400" />
      </ScrollArea>
      {!searchQuery && (
        <div className="flex gap-1 mt-3">
          <Button
            onClick={() => setPage((prevPage) => Math.max(prevPage - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button onClick={() => setPage((prevPage) => prevPage + 1)}>
            Next
          </Button>
        </div>
      )}
      {loading && <p>Loading...</p>}
      {selectedClient && (
        <Edit
          client={selectedClient}
          onSave={handleSaveChanges}
          onClose={handleCloseModal}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Dashboard;
