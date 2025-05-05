import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useToast } from "../../../components/UI/ShadCN/hooks/use-toast";
import GroupForm from "./GroupForm";
import { fetchGroups as fetchGroupsUtil } from "../../../components/Table/Data/utilData";
import DataTable from "../../../components/Table/DataTable";

const GroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const { toast } = useToast();
  const API_URL = `http://${import.meta.env.VITE_IP_ADDRESS}:3001/util`;
  const [isLoading, setIsLoading] = useState(false);

  // Define columns for DataTable
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => row.getValue("id") || "-",
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => row.getValue("name") || "-",
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => row.getValue("description") || "-",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-center space-x-2">
            <button
              className="text-blue-500 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row.original);
              }}
            >
              <EditIcon style={{ fontSize: 20 }} />
            </button>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row.original.id);
              }}
            >
              <DeleteIcon style={{ fontSize: 20 }} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Function to fetch all groups without pagination
  const fetchGroupsForTable = async () => {
    try {
      const allGroups = await fetchGroupsUtil();
      
      if (!Array.isArray(allGroups)) {
        console.error("Groups data is not an array", allGroups);
        return { data: [] };
      }

      // Sort groups by ID
      const sortedGroups = [...allGroups].sort((a, b) => 
        (a.id || '').localeCompare(b.id || '')
      );
      
      return { 
        data: sortedGroups,
        totalPages: 1,
        totalClients: sortedGroups.length,
        pageSpecificClients: sortedGroups.length 
      };
    } catch (error) {
      console.error("Error fetching groups:", error);
      return { data: [] };
    }
  };

  // Load all groups
  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const result = await fetchGroupsForTable();
      setGroups(result.data || []);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load groups"
      });
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Handle group deletion
  const handleDelete = async (id) => {
    if (!id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid group ID for deletion"
      });
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        setIsLoading(true);
        await axios.delete(`${API_URL}/groups-delete/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        toast({
          title: "Success",
          description: "Group deleted successfully"
        });
        // Refresh data after operation
        await loadGroups();
      } catch (error) {
        console.error("Error deleting group:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete group"
        });
        setIsLoading(false);
      }
    }
  };

  // Handle edit action
  const handleEdit = (group) => {
    if (!group || !group.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid group data for editing"
      });
      return;
    }
    setEditGroup(group);
    setShowForm(true);
  };

  // Handle form submission (create/update)
  const handleFormSubmit = async (formData) => {
    try {
      setIsLoading(true);
      if (editGroup) {
        // Update existing group
        await axios.put(`${API_URL}/groups-edit/${editGroup.id}`, {
          name: formData.name,
          description: formData.description,
          newId: formData.id !== editGroup.id ? formData.id : undefined,
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        toast({
          title: "Success",
          description: "Group updated successfully"
        });
      } else {
        // Create new group
        await axios.post(`${API_URL}/groups-add`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        toast({
          title: "Success",
          description: "Group created successfully"
        });
      }
      setShowForm(false);
      setEditGroup(null);
      
      // Refresh data after operation
      await loadGroups();
    } catch (error) {
      console.error("Error saving group:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.error || "Failed to save group"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Group Management</h1>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          onClick={() => {
            setEditGroup(null);
            setShowForm(true);
          }}
        >
          <AddIcon className="mr-2" style={{ fontSize: 20 }} />
          Add Group
        </button>
      </div>

      {showForm && (
        <GroupForm
          initialData={editGroup}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditGroup(null);
          }}
        />
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={groups}
          fetchFunction={fetchGroupsForTable} 
          isLoading={isLoading}
          usePagination={false} // Disable pagination
          useHoverCard={false}
          enableEdit={false}
          columnVisibility={{}}
        />
      </div>
    </div>
  );
};

export default GroupManagement; 