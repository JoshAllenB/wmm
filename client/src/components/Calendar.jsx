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

const CalendarUpdate = ({
  filtering,
  selectedGroup,
  advancedFilterData,
  onUpdateSuccess,
  page,
  pageSize,
  debouncedFiltering,
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

  // Update modal open state when isOpen prop changes
  useEffect(() => {
    setShowCalendarModal(isOpen);
  }, [isOpen]);

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
      
      const requestData = {
        filter: filtering,
        group: selectedGroup,
        advancedFilterData,
        setCalendarTo: selectedCalendarStatus === "received"
      };
      
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

      // Store the results and show the results dialog
      setUpdateResults(data.summary || {});
      setShowResultsDialog(true);
      
      // Show a simple success toast
      toast({
        title: "Success",
        description: "Calendar status updated successfully",
        duration: 3000,
      });
      
      // Call the callback to refresh data
      onUpdateSuccess(page, pageSize, debouncedFiltering, selectedGroup, advancedFilterData);
      
      // Reset the form but keep the modal open
      setSelectedCalendarStatus(null);
      setIsLoadingPreview(true);
      fetchPreviewCounts(); // Refresh the preview counts
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

  return (
    <>
      {/* Calendar Status Modal */}
      <Dialog open={showCalendarModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Calendar Status</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
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
              disabled={isUpdatingCalendar || selectedCalendarStatus === null || (previewCounts?.clientsWithWmm === 0)}
              className={isUpdatingCalendar ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isUpdatingCalendar ? "Updating..." : `Update ${previewCounts?.clientsWithWmm || ''} Records`}
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
                    <dt>Skipped:</dt>
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
                                <td className="px-4 py-2 text-sm">{client.name}</td>
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