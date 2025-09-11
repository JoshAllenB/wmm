import React, { useState, useEffect } from "react";
import { Button } from "./UI/ShadCN/button";
import { AlertTriangle, RotateCcw, CheckCircle, XCircle } from "lucide-react";
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
import { Textarea } from "./UI/ShadCN/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./UI/ShadCN/tabs";
import { ScrollArea } from "./UI/ShadCN/scroll-area";
import { Badge } from "./UI/ShadCN/badge";

const RTSUpdate = ({
  filtering,
  selectedGroup,
  advancedFilterData,
  onUpdateSuccess,
  page,
  pageSize,
  debouncedFiltering,
  table,
  isOpen = false,
  onClose,
}) => {
  const [isUpdatingRTS, setIsUpdatingRTS] = useState(false);
  const [showRTSModal, setShowRTSModal] = useState(isOpen);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [updateResults, setUpdateResults] = useState(null);
  const [selectedRTSAction, setSelectedRTSAction] = useState(null);
  const [rtsReason, setRtsReason] = useState("");
  const [customRtsCount, setCustomRtsCount] = useState("");
  const [previewCounts, setPreviewCounts] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [clientIdsText, setClientIdsText] = useState("");
  const [activeTab, setActiveTab] = useState("filter");
  const [clientsData, setClientsData] = useState({});

  // Update modal open state when isOpen prop changes
  useEffect(() => {
    setShowRTSModal(isOpen);
  }, [isOpen]);

  // Store client data when table data changes
  useEffect(() => {
    if (table) {
      const newClientsData = {};
      table.getRowModel().rows.forEach((row) => {
        newClientsData[row.original.id] = {
          fname: row.original.fname,
          lname: row.original.lname,
          rtsCount: row.original.rtsCount || 0,
          rtsMaxReached: row.original.rtsMaxReached || false,
        };
      });
      setClientsData(newClientsData);
    }
  }, [table]);

  // Update parent component when modal closes
  const handleClose = () => {
    // Reset all form state
    setSelectedRTSAction(null);
    setRtsReason("");
    setCustomRtsCount("");
    setClientIdsText("");
    setPreviewCounts(null);
    setActiveTab("filter");
    setShowResultsDialog(false);
    setUpdateResults(null);

    // Close modal and notify parent
    setShowRTSModal(false);
    if (onClose) {
      onClose();
    }
  };

  // Get selected rows from table
  const selectedRows = table?.getSelectedRowModel().rows || [];
  const hasSelectedRows = selectedRows.length > 0;

  const handleUpdateRTS = async () => {
    if (selectedRTSAction === null) {
      toast({
        title: "Error",
        description: "Please select an RTS action",
        variant: "destructive",
      });
      return;
    }

    if (selectedRTSAction === "add" && !rtsReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for adding RTS",
        variant: "destructive",
      });
      return;
    }

    if (selectedRTSAction === "custom") {
      const customCount = parseInt(customRtsCount);
      if (isNaN(customCount) || customCount < 0 || customCount > 10) {
        toast({
          title: "Error",
          description: "Please enter a valid RTS count (0-10)",
          variant: "destructive",
        });
        return;
      }
      if (!rtsReason.trim()) {
        toast({
          title: "Error",
          description: "Please provide a reason for setting custom RTS count",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsUpdatingRTS(true);

      const currentClientsData = { ...clientsData };

      const requestData = {
        filter: activeTab === "filter" ? filtering : "",
        group: activeTab === "filter" ? selectedGroup : "",
        advancedFilterData: activeTab === "filter" ? advancedFilterData : {},
        rtsAction: selectedRTSAction,
        rtsReason: rtsReason.trim(),
        customRtsCount:
          selectedRTSAction === "custom" ? parseInt(customRtsCount) : null,
        clientIds:
          activeTab === "specific"
            ? clientIdsText
                .split(/[\s,]+/)
                .map((id) => parseInt(id.trim()))
                .filter((id) => !isNaN(id))
            : [],
      };

      // If using selected rows, override clientIds
      if (activeTab === "selected" && hasSelectedRows) {
        requestData.clientIds = selectedRows
          .map((row) => parseInt(row.original.id))
          .filter((id) => !isNaN(id));
      }

      console.log("Sending RTS update request with data:", requestData);

      const response = await fetch(
        `http://${import.meta.env.VITE_IP_ADDRESS}:3001/clients/update-rts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      console.log("RTS update response status:", response.status);
      const data = await response.json();
      console.log("RTS update response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to update RTS status");
      }

      // Show results dialog
      setUpdateResults({
        success: true,
        modifiedCount: data.modifiedCount || 0,
        processedCount: data.processedCount || 0,
        skippedCount: data.skippedCount || 0,
        errorCount: data.errorCount || 0,
        updatedClientIds: data.updatedClientIds || [],
        failedClientIds: data.failedClientIds || [],
        clientsData: currentClientsData,
      });
      setShowResultsDialog(true);

      // Notify parent component of successful update
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }

      // Reset form
      setSelectedRTSAction(null);
      setRtsReason("");
      setCustomRtsCount("");
      setClientIdsText("");

      toast({
        title: "Success",
        description: `RTS status updated successfully for ${
          data.modifiedCount || 0
        } clients`,
      });
    } catch (error) {
      console.error("Error updating RTS status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update RTS status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingRTS(false);
    }
  };

  const fetchPreviewCounts = async () => {
    try {
      setIsLoadingPreview(true);

      const requestData = {
        filter: activeTab === "filter" ? filtering : "",
        group: activeTab === "filter" ? selectedGroup : "",
        advancedFilterData: activeTab === "filter" ? advancedFilterData : {},
        clientIds:
          activeTab === "specific"
            ? clientIdsText
                .split(/[\s,]+/)
                .map((id) => parseInt(id.trim()))
                .filter((id) => !isNaN(id))
            : [],
      };

      // If using selected rows, override clientIds
      if (activeTab === "selected" && hasSelectedRows) {
        requestData.clientIds = selectedRows
          .map((row) => parseInt(row.original.id))
          .filter((id) => !isNaN(id));
      }

      const response = await fetch(
        `http://${
          import.meta.env.VITE_IP_ADDRESS
        }:3001/clients/preview-rts-update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch preview counts");
      }

      const data = await response.json();
      setPreviewCounts(data);
    } catch (error) {
      console.error("Error fetching preview counts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch preview counts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const validateClientIds = () => {
    if (activeTab === "specific") {
      const ids = clientIdsText
        .split(/[\s,]+/)
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
      return ids.length > 0;
    }
    return true;
  };

  const validateCustomCount = () => {
    if (selectedRTSAction === "custom") {
      const customCount = parseInt(customRtsCount);
      return !isNaN(customCount) && customCount >= 0 && customCount <= 10;
    }
    return true;
  };

  const getRTSStatusBadge = (rtsCount, rtsMaxReached) => {
    if (rtsMaxReached || rtsCount >= 3) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800">
          MAX RTS
        </Badge>
      );
    } else if (rtsCount > 0) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          {rtsCount} RTS
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          No RTS
        </Badge>
      );
    }
  };

  return (
    <>
      <Dialog
        open={showRTSModal}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setShowRTSModal(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              RTS (Return to Sender) Management
            </DialogTitle>
            <DialogDescription>
              Manage RTS counts for clients. Clients with 3+ RTS will be marked
              as max reached.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="filter">Filter Based</TabsTrigger>
              <TabsTrigger value="selected" disabled={!hasSelectedRows}>
                Selected Rows ({selectedRows.length})
              </TabsTrigger>
              <TabsTrigger value="specific">Specific IDs</TabsTrigger>
            </TabsList>

            <TabsContent value="filter" className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold mb-2">Current Filter:</h3>
                <p className="text-sm text-gray-600">
                  Filter: "{filtering}" | Group: "{selectedGroup}"
                </p>
              </div>
            </TabsContent>

            <TabsContent value="selected" className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold mb-2">Selected Clients:</h3>
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {selectedRows.map((row) => (
                      <div
                        key={row.original.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {row.original.id} - {row.original.fname}{" "}
                          {row.original.lname}
                        </span>
                        {getRTSStatusBadge(
                          row.original.rtsCount || 0,
                          row.original.rtsMaxReached || false
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="specific" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientIds">
                  Client IDs (comma or space separated)
                </Label>
                <Textarea
                  id="clientIds"
                  value={clientIdsText}
                  onChange={(e) => setClientIdsText(e.target.value)}
                  placeholder="Enter client IDs: 123, 456, 789"
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">RTS Action</Label>
              <RadioGroup
                value={selectedRTSAction}
                onValueChange={setSelectedRTSAction}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="add" />
                  <Label htmlFor="add" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Add RTS (+1)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reset" id="reset" />
                  <Label htmlFor="reset" className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                    Reset RTS Count (0)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-purple-600" />
                    Set Custom Count
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {(selectedRTSAction === "add" ||
              selectedRTSAction === "custom") && (
              <div className="space-y-2">
                <Label htmlFor="rtsReason">
                  Reason for RTS {selectedRTSAction === "add" ? "*" : "*"}
                </Label>
                <Textarea
                  id="rtsReason"
                  value={rtsReason}
                  onChange={(e) => setRtsReason(e.target.value)}
                  placeholder={
                    selectedRTSAction === "add"
                      ? "Enter reason for return to sender..."
                      : "Enter reason for setting custom RTS count..."
                  }
                  className="min-h-[80px]"
                />
              </div>
            )}

            {selectedRTSAction === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customRtsCount">Custom RTS Count *</Label>
                <input
                  id="customRtsCount"
                  type="number"
                  min="0"
                  max="10"
                  value={customRtsCount}
                  onChange={(e) => setCustomRtsCount(e.target.value)}
                  placeholder="Enter RTS count (0-10)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500">
                  Enter a number between 0 and 10. Clients with 3+ RTS will be
                  marked as max reached.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={fetchPreviewCounts}
                variant="outline"
                disabled={
                  !validateClientIds() ||
                  !validateCustomCount() ||
                  isLoadingPreview
                }
                className="flex items-center gap-2"
              >
                {isLoadingPreview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Preview Count
                  </>
                )}
              </Button>
            </div>

            {previewCounts && (
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold mb-2">Preview Results:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Clients:</span>{" "}
                    {previewCounts.totalClients}
                  </div>
                  <div>
                    <span className="font-medium">Will be Modified:</span>{" "}
                    {previewCounts.willModify}
                  </div>
                  <div>
                    <span className="font-medium">Already Max RTS:</span>{" "}
                    {previewCounts.alreadyMaxRTS}
                  </div>
                  <div>
                    <span className="font-medium">Will Reach Max:</span>{" "}
                    {previewCounts.willReachMax}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRTS}
              disabled={
                !validateClientIds() || !validateCustomCount() || isUpdatingRTS
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isUpdatingRTS ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Update RTS
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              RTS Update Results
            </DialogTitle>
          </DialogHeader>

          {updateResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-green-600">
                    Successfully Updated:
                  </span>
                  <p className="text-2xl font-bold text-green-600">
                    {updateResults.modifiedCount}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">
                    Total Processed:
                  </span>
                  <p className="text-2xl font-bold text-gray-600">
                    {updateResults.processedCount}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-yellow-600">
                    Skipped:
                  </span>
                  <p className="text-2xl font-bold text-yellow-600">
                    {updateResults.skippedCount}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-red-600">Errors:</span>
                  <p className="text-2xl font-bold text-red-600">
                    {updateResults.errorCount}
                  </p>
                </div>
              </div>

              {updateResults.updatedClientIds.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Updated Clients:</h3>
                  <ScrollArea className="h-32 border rounded p-2">
                    <div className="space-y-1 text-sm">
                      {updateResults.updatedClientIds
                        .slice(0, 20)
                        .map((clientInfo) => {
                          // Handle both object format (from backend) and simple ID format
                          const clientId =
                            typeof clientInfo === "object"
                              ? clientInfo.id
                              : clientInfo;
                          const clientName =
                            typeof clientInfo === "object"
                              ? clientInfo.name
                              : updateResults.clientsData[clientId]
                              ? `${updateResults.clientsData[clientId].fname} ${updateResults.clientsData[clientId].lname}`
                              : "Unknown";

                          return (
                            <div
                              key={clientId}
                              className="flex items-center justify-between"
                            >
                              <span>
                                {clientId} - {clientName}
                              </span>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          );
                        })}
                      {updateResults.updatedClientIds.length > 20 && (
                        <div className="text-gray-500 text-center">
                          ... and {updateResults.updatedClientIds.length - 20}{" "}
                          more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {updateResults.failedClientIds.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">
                    Failed Updates:
                  </h3>
                  <ScrollArea className="h-32 border rounded p-2">
                    <div className="space-y-1 text-sm">
                      {updateResults.failedClientIds
                        .slice(0, 20)
                        .map((clientInfo) => {
                          // Handle both object format (from backend) and simple ID format
                          const clientId =
                            typeof clientInfo === "object"
                              ? clientInfo.id
                              : clientInfo;
                          const clientName =
                            typeof clientInfo === "object"
                              ? clientInfo.name || "Unknown"
                              : updateResults.clientsData[clientId]
                              ? `${updateResults.clientsData[clientId].fname} ${updateResults.clientsData[clientId].lname}`
                              : "Unknown";

                          return (
                            <div
                              key={clientId}
                              className="flex items-center justify-between"
                            >
                              <span>
                                {clientId} - {clientName}
                              </span>
                              <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                          );
                        })}
                      {updateResults.failedClientIds.length > 20 && (
                        <div className="text-gray-500 text-center">
                          ... and {updateResults.failedClientIds.length - 20}{" "}
                          more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RTSUpdate;
