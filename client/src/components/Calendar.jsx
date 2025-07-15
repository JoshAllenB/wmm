import React, { useState, useEffect } from "react";
import { Button } from "./UI/ShadCN/button";
import { Calendar } from "lucide-react";
import { toast } from "./UI/ShadCN/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./UI/ShadCN/dialog";
import { RadioGroup, RadioGroupItem } from "./UI/ShadCN/radio-group";
import { Label } from "./UI/ShadCN/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./UI/ShadCN/tabs";
import { Textarea } from "./UI/ShadCN/textarea";
import { ScrollArea } from "./UI/ShadCN/scroll-area";

const CalendarUpdate = ({
  filtering,
  selectedGroup,
  advancedFilterData,
  onUpdateSuccess,
  page,
  pageSize,
  debouncedFiltering,
  table,
  isOpen = false,
  onClose
}) => {
  const [isUpdatingCalendar, setIsUpdatingCalendar] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(isOpen);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [updateResults, setUpdateResults] = useState(null);
  const [selectedCalendarStatus, setSelectedCalendarStatus] = useState(null);
  const [previewCounts, setPreviewCounts] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [clientsData, setClientsData] = useState({});  // Store client data
  const [clientIdsText, setClientIdsText] = useState("");
  const [activeTab, setActiveTab] = useState("filter");

  // Get selected rows from table
  const selectedRows = table?.getSelectedRowModel().rows || [];
  const hasSelectedRows = selectedRows.length > 0;

  // Update modal open state when isOpen prop changes
  useEffect(() => {
    setShowCalendarModal(isOpen);
  }, [isOpen]);

  // Store client data when table data changes
  useEffect(() => {
    if (table) {
      const newClientsData = {};
      table.getRowModel().rows.forEach(row => {
        newClientsData[row.original.id] = {
          fname: row.original.fname,
          lname: row.original.lname
        };
      });
      setClientsData(newClientsData);
    }
  }, [table]);

  // Update parent component when modal closes
  const handleClose = () => {
    setShowCalendarModal(false);
    if (onClose) {
      onClose();
    }
  };

  const handleUpdateCalendar = async () => {
    if (selectedCalendarStatus === null) {
      toast({
        title: "Error",
        description: "Please select a calendar status",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingCalendar(true);
      
      // Store current client data before making the request
      const currentClientsData = { ...clientsData };
      
      const requestData = {
        filter: activeTab === "filter" ? filtering : "",
        group: activeTab === "filter" ? selectedGroup : "",
        advancedFilterData: activeTab === "filter" ? advancedFilterData : {},
        setCalendarTo: selectedCalendarStatus === "received",
        clientIds: activeTab === "specific" ? clientIdsText.split(/[\s,]+/).map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []
      };

      // If using selected rows, override clientIds
      if (activeTab === "selected" && hasSelectedRows) {
        requestData.clientIds = selectedRows.map(row => parseInt(row.original.id)).filter(id => !isNaN(id));
      }

      console.log("Sending calendar update request with data:", requestData);
      
      const response = await fetch(`http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update-calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log("Calendar update response status:", response.status);
      const data = await response.json();
      console.log("Calendar update response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update calendar status");
      }

      // Add client names to the results
      const enrichedResults = {
        ...data.summary,
        totalClientsFound: data.summary?.totalClientsFound || 0,
        modifiedCount: data.summary?.modifiedCount || 0,
        skippedCount: data.summary?.skippedCount || 0,
        errorCount: data.summary?.errorCount || 0,
        skippedClientIds: (data.summary?.skippedClientIds || []).map(client => ({
          ...client,
          ...currentClientsData[client.id]
        })),
        failedClientIds: (data.summary?.failedClientIds || []).map(client => ({
          ...client,
          ...currentClientsData[client.id]
        })),
        updatedClientIds: (data.summary?.updatedClientIds || []).map(client => ({
          ...client,
          ...currentClientsData[client.id]
        }))
      };

      setUpdateResults(enrichedResults);
      setShowResultsDialog(true);
      
      toast({
        title: "Success",
        description: "Calendar status updated successfully",
        duration: 3000,
      });
      
      onUpdateSuccess(page, pageSize, debouncedFiltering, selectedGroup, advancedFilterData);
      
      setSelectedCalendarStatus(null);
      setIsLoadingPreview(true);
      fetchPreviewCounts();
    } catch (error) {
      console.error("Error updating calendar status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update calendar status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCalendar(false);
    }
  };

  const fetchPreviewCounts = async () => {
    try {
      const requestData = {
        filter: filtering,
        group: selectedGroup,
        advancedFilterData,
      };
      
      const response = await fetch(`http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/preview-calendar-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error("Failed to get preview counts");
      }

      const data = await response.json();
      setPreviewCounts(data);
    } catch (error) {
      console.error("Error getting preview counts:", error);
      toast({
        title: "Warning",
        description: "Could not get preview counts. You can still proceed with the update.",
        variant: "warning",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenCalendarModal = () => {
    setShowCalendarModal(true);
    setSelectedCalendarStatus(null);
    setPreviewCounts(null);
    setIsLoadingPreview(true);
    fetchPreviewCounts();
  };

  const validateClientIds = () => {
    if (!clientIdsText.trim()) {
      return false;
    }
    const ids = clientIdsText.split(/[\s,]+/).map(id => parseInt(id.trim()));
    return ids.some(id => !isNaN(id));
  };

  return (
    <>
      {/* Calendar Status Modal */}
      <Dialog open={showCalendarModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Calendar Status</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="filter">By Filter</TabsTrigger>
                    <TabsTrigger value="specific">Specific Clients</TabsTrigger>
                    <TabsTrigger value="selected" disabled={!hasSelectedRows}>
                      Selected ({selectedRows.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="filter">
                    {isLoadingPreview ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                        <span className="ml-3 text-sm text-gray-600">Loading preview data...</span>
                      </div>
                    ) : previewCounts ? (
                      <>
                        <dl className="text-sm grid grid-cols-2 gap-2">
                          <dt>Total clients found:</dt>
                          <dd>{previewCounts.totalClients}</dd>
                          <dt>Clients with WMM records:</dt>
                          <dd>{previewCounts.clientsWithWmm}</dd>
                        </dl>
                        
                        {previewCounts.clientsWithWmm === 0 && (
                          <div className="text-yellow-600 text-sm bg-yellow-50 p-3 rounded-md">
                            Warning: No clients in the current filter have WMM records to update.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-gray-600">
                        Set the calendar status for all clients in the current filtered view.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="specific">
                    <div className="space-y-2">
                      <Label htmlFor="clientIds">Enter Client IDs</Label>
                      <Textarea
                        id="clientIds"
                        placeholder="Enter client IDs separated by commas or new lines"
                        value={clientIdsText}
                        onChange={(e) => setClientIdsText(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        Enter client IDs separated by commas or new lines
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="selected">
                    <div className="space-y-2">
                      <Label>Selected Clients</Label>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        <div className="space-y-2">
                          {selectedRows.map((row) => (
                            <div key={row.original.id} className="flex justify-between items-center py-1 border-b last:border-0">
                              <span className="font-medium">ID: {row.original.id}</span>
                              <span className="text-gray-600">
                                {row.original.lname}, {row.original.fname}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="py-6">
                  <RadioGroup
                    value={selectedCalendarStatus}
                    onValueChange={setSelectedCalendarStatus}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="received" id="received" />
                      <Label htmlFor="received" className="font-medium">
                        Calendar Received
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not-received" id="not-received" />
                      <Label htmlFor="not-received" className="font-medium">
                        Calendar Not Received
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUpdatingCalendar}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCalendar}
              disabled={
                isUpdatingCalendar || 
                selectedCalendarStatus === null || 
                (activeTab === "filter" && previewCounts?.clientsWithWmm === 0) ||
                (activeTab === "specific" && !validateClientIds()) ||
                (activeTab === "selected" && !hasSelectedRows)
              }
              className={isUpdatingCalendar ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isUpdatingCalendar ? "Updating..." : `Update ${
                activeTab === "filter" 
                  ? `${previewCounts?.clientsWithWmm || ''} Records` 
                  : activeTab === "selected"
                  ? `${selectedRows.length} Selected`
                  : 'Selected Clients'
              }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calendar Update Results</DialogTitle>
            <DialogDescription asChild>
              {updateResults && (
                <div className="space-y-4">
                  <dl className="text-sm grid grid-cols-2 gap-2">
                    <dt>Total clients found:</dt>
                    <dd>{updateResults.totalClientsFound}</dd>
                    <dt>Successfully updated:</dt>
                    <dd>{updateResults.modifiedCount}</dd>
                    <dt>Already have status:</dt>
                    <dd>{updateResults.skippedCount}</dd>
                    <dt>Errors:</dt>
                    <dd>{updateResults.errorCount}</dd>
                  </dl>
                  
                  {updateResults.updatedClientIds && updateResults.updatedClientIds.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Updated Clients:</h3>
                      <div className="max-h-[300px] overflow-y-auto border rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {updateResults.updatedClientIds.map((client) => (
                              <tr key={client.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm">{client.id}</td>
                                <td className="px-4 py-2 text-sm">
                                  {client.lname && client.fname ? `${client.lname}, ${client.fname}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Show Already Have Status section */}
                  {((updateResults.skippedClientIds && updateResults.skippedClientIds.length > 0) || 
                    (updateResults.failedClientIds && updateResults.failedClientIds.some(client => 
                      client.error === 'No changes made' || client.error === 'Already has status'
                    ))) && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2 text-amber-600">Already Have Status:</h3>
                      <div className="max-h-[300px] overflow-y-auto border border-amber-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-amber-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-amber-700">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-amber-700">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-amber-700">Current Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[
                              ...(updateResults.skippedClientIds || []),
                              ...(updateResults.failedClientIds?.filter(client => 
                                client.error === 'No changes made' || client.error === 'Already has status'
                              ) || [])
                            ].map((client) => (
                              <tr key={client.id} className="hover:bg-amber-50">
                                <td className="px-4 py-2 text-sm">{client.id}</td>
                                <td className="px-4 py-2 text-sm">
                                  {client.lname && client.fname ? `${client.lname}, ${client.fname}` : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-amber-600">
                                  {client.error === 'No changes made' ? 'Already has desired status' : 
                                   client.currentStatus ? 'Already Calendar Received' : 'Already Calendar Not Received'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Show Failed Updates section */}
                  {updateResults.failedClientIds && updateResults.failedClientIds.some(client => 
                    client.error !== 'No changes made' && client.error !== 'Already has status'
                  ) && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2 text-red-600">Failed Updates:</h3>
                      <div className="max-h-[300px] overflow-y-auto border border-red-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-red-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-red-700">Error Reason</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {updateResults.failedClientIds
                              .filter(client => client.error !== 'No changes made' && client.error !== 'Already has status')
                              .map((client) => (
                                <tr key={client.id} className="hover:bg-red-50">
                                  <td className="px-4 py-2 text-sm">{client.id}</td>
                                  <td className="px-4 py-2 text-sm">
                                    {client.lname && client.fname ? `${client.lname}, ${client.fname}` : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-red-600">{client.error}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CalendarUpdate; 