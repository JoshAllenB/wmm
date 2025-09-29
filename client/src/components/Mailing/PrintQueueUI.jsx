// PrintQueueUI.jsx
import React, { useState, useEffect } from "react";
import { Button } from "../UI/ShadCN/button";
import { ScrollArea } from "../UI/ShadCN/scroll-area";
import { Badge } from "../UI/ShadCN/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../UI/ShadCN/card";
import { Separator } from "../UI/ShadCN/separator";
import { toast } from "react-hot-toast";
import {
  Trash2,
  Play,
  Pause,
  Clock,
  Printer,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

const PrintQueueUI = ({
  printQueueManager,
  onPrintCallback,
  availableRows = [],
  selectedTemplate = null,
  userRole = "",
  subscriptionType = "WMM",
  selectedFields = [],
  labelAdjustments = {},
  selectedPrinter = "",
  startClientId = "",
  endClientId = "",
  startPosition = "left",
  afterSpecifiedStart = false,
  rowsPerPage = 3,
  columnsPerPage = 2,
}) => {
  const [queueStatus, setQueueStatus] = useState({
    jobCount: 0,
    totalLabels: 0,
    isFlushing: false,
    jobs: [],
  });
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [newJobRows, setNewJobRows] = useState([]);
  const [newJobOptions, setNewJobOptions] = useState({});
  const [jspmStatus, setJspmStatus] = useState("unknown");

  // Ensure JSPrintManager is connected (mirrors Print Preview flow)
  const ensureJspmConnected = async (timeoutMs = 15000) => {
    if (!window.JSPM || !window.JSPM.JSPrintManager) return false;
    try {
      window.JSPM.JSPrintManager.auto_reconnect = true;
      try {
        await window.JSPM.JSPrintManager.start();
      } catch (e) {
        // Already started; ignore
      }

      const isOpen = () =>
        (window.JSPM.JSPrintManager.websocket_status ||
          window.JSPM.JSPrintManager.WS?.status) === window.JSPM.WSStatus.Open;

      if (isOpen()) return true;

      return await new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(false);
          }
        }, timeoutMs);

        const prevHandler = window.JSPM.JSPrintManager.WS
          ? window.JSPM.JSPrintManager.WS.onStatusChanged
          : null;

        if (window.JSPM.JSPrintManager.WS) {
          window.JSPM.JSPrintManager.WS.onStatusChanged = (s) => {
            if (s === window.JSPM.WSStatus.Open && !done) {
              done = true;
              clearTimeout(timer);
              window.JSPM.JSPrintManager.WS.onStatusChanged = prevHandler || null;
              resolve(true);
            }
            if (typeof prevHandler === "function") prevHandler(s);
          };
        } else {
          const interval = setInterval(() => {
            if (isOpen() && !done) {
              done = true;
              clearInterval(interval);
              clearTimeout(timer);
              resolve(true);
            }
          }, 200);
        }
      });
    } catch (err) {
      return false;
    }
  };

  // Update queue status and JSPrintManager status periodically
  useEffect(() => {
    const updateStatus = () => {
      setQueueStatus(printQueueManager.getQueueStatus());

      // Check JSPrintManager status
      if (window.JSPM && window.JSPM.JSPrintManager) {
        const wsStatus = window.JSPM.JSPrintManager.websocket_status;
        if (wsStatus === window.JSPM.WSStatus.Open) {
          setJspmStatus("connected");
        } else if (wsStatus === window.JSPM.WSStatus.Closed) {
          setJspmStatus("disconnected");
        } else if (wsStatus === window.JSPM.WSStatus.Blocked) {
          setJspmStatus("blocked");
        } else {
          setJspmStatus("connecting");
        }
      } else {
        setJspmStatus("unavailable");
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [printQueueManager]);

  // Auto-attempt to connect to JSPrintManager on mount
  useEffect(() => {
    (async () => {
      if (window.JSPM && window.JSPM.JSPrintManager) {
        await ensureJspmConnected(15000);
      }
    })();
  }, []);

  // Handle adding current selection to queue
  const handleAddCurrentSelection = async () => {
    if (availableRows.length === 0) {
      toast.error("No rows selected to add to queue");
      return;
    }

    setIsAddingJob(true);
    try {
      const jobId = printQueueManager.addJob(availableRows, {
        startClientId,
        endClientId,
        startPosition: printQueueManager.getNextStartPosition(),
        template: selectedTemplate,
        selectedFields,
        userRole,
        subscriptionType,
        rowsPerPage,
        columnsPerPage,
        labelAdjustments,
        printerName: selectedTemplate?.selectedPrinter || selectedPrinter,
        afterSpecifiedStart,
      });

      toast.success(`Added ${availableRows.length} labels to print queue`);
      setQueueStatus(printQueueManager.getQueueStatus());
    } catch (error) {
      console.error("Error adding job to queue:", error);
      toast.error("Failed to add job to queue");
    } finally {
      setIsAddingJob(false);
    }
  };

  // Handle removing a job from queue
  const handleRemoveJob = (jobId) => {
    try {
      const success = printQueueManager.removeJob(jobId);
      if (success) {
        toast.success("Job removed from queue");
        setQueueStatus(printQueueManager.getQueueStatus());
      } else {
        toast.error("Failed to remove job from queue");
      }
    } catch (error) {
      console.error("Error removing job:", error);
      toast.error("Failed to remove job from queue");
    }
  };

  // Handle clearing entire queue
  const handleClearQueue = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all jobs from the print queue?"
      )
    ) {
      printQueueManager.clearQueue();
      toast.success("Print queue cleared");
      setQueueStatus(printQueueManager.getQueueStatus());
    }
  };

  // Handle printing the entire queue
  const handlePrintQueue = async () => {
    if (queueStatus.jobCount === 0) {
      toast.error("No jobs in queue to print");
      return;
    }

    // Attempt to connect/start JSPrintManager like Print Preview flow
    if (!window.JSPM || !window.JSPM.JSPrintManager) {
      toast.error("JSPrintManager not available. Please install/start the client app.");
      return;
    }

    const connected = await ensureJspmConnected(15000);
    if (!connected) {
      toast.error(
        "Could not establish JSPrintManager WebSocket connection. Ensure the client app is running and allowed."
      );
      return;
    }

    try {
      await printQueueManager.flush(true, onPrintCallback);
      toast.success(`Successfully printed ${queueStatus.totalLabels} labels`);
      setQueueStatus(printQueueManager.getQueueStatus());
    } catch (error) {
      console.error("Error printing queue:", error);
      toast.error(`Print failed: ${error.message}`);
    }
  };

  // Format time estimate
  const formatTimeEstimate = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format date/time
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Print Queue Manager
          {queueStatus.jobCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {queueStatus.jobCount} job{queueStatus.jobCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {queueStatus.jobCount}
            </div>
            <div className="text-sm text-blue-700">Jobs</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {queueStatus.totalLabels}
            </div>
            <div className="text-sm text-green-700">Labels</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatTimeEstimate(printQueueManager.estimatePrintTime())}
            </div>
            <div className="text-sm text-orange-700">Est. Time</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {printQueueManager.getNextStartPosition()}
            </div>
            <div className="text-sm text-purple-700">Next Start</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAddCurrentSelection}
            disabled={
              isAddingJob ||
              availableRows.length === 0 ||
              queueStatus.isFlushing
            }
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isAddingJob ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Current Selection ({availableRows.length})
              </>
            )}
          </Button>

          <Button
            onClick={handlePrintQueue}
            disabled={
              queueStatus.jobCount === 0 ||
              queueStatus.isFlushing
            }
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {queueStatus.isFlushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Print Queue
              </>
            )}
          </Button>

          <Button
            onClick={handleClearQueue}
            disabled={queueStatus.jobCount === 0 || queueStatus.isFlushing}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Queue
          </Button>
        </div>

        {/* Queue Jobs List */}
        {queueStatus.jobs.length > 0 ? (
          <div className="space-y-2">
            <Separator />
            <h4 className="font-medium text-gray-700">Queued Jobs</h4>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {queueStatus.jobs.map((job, index) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          Job #{job.id.toString().slice(-6)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {job.labelCount} label
                          {job.labelCount !== 1 ? "s" : ""} •
                          {job.startClientId && job.endClientId
                            ? ` Range: ${job.startClientId}-${job.endClientId}`
                            : job.startClientId
                            ? ` From: ${job.startClientId}`
                            : " All selected"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added: {formatDateTime(job.addedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.subscriptionType}
                      </Badge>
                      <Button
                        onClick={() => handleRemoveJob(job.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={queueStatus.isFlushing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Printer className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No jobs in print queue</p>
            <p className="text-sm">Add some labels to get started</p>
          </div>
        )}

        {/* Status Indicators */}
        {queueStatus.isFlushing && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="text-blue-700 font-medium">
              Printing queue... Please wait
            </span>
          </div>
        )}

        {/* JSPrintManager Status */}
        {jspmStatus !== "connected" && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg border ${
              jspmStatus === "unavailable"
                ? "bg-red-50 border-red-200"
                : jspmStatus === "disconnected"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            {jspmStatus === "unavailable" ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : jspmStatus === "disconnected" ? (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            ) : (
              <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
            )}
            <span
              className={`font-medium ${
                jspmStatus === "unavailable"
                  ? "text-red-700"
                  : jspmStatus === "disconnected"
                  ? "text-yellow-700"
                  : "text-orange-700"
              }`}
            >
              {jspmStatus === "unavailable"
                ? "JSPrintManager not available - Please install and start the client app"
                : jspmStatus === "disconnected"
                ? "JSPrintManager disconnected - Please start the client app"
                : jspmStatus === "blocked"
                ? "JSPrintManager blocked - Please allow this website in the client app"
                : "Connecting to JSPrintManager..."}
            </span>
          </div>
        )}

        {jspmStatus === "connected" && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 font-medium">
              JSPrintManager connected and ready
            </span>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            • <strong>Add Current Selection:</strong> Adds the currently
            selected rows to the print queue
          </p>
          <p>
            • <strong>Print Queue:</strong> Sends all queued jobs to the printer
            in sequence
          </p>
          <p>
            • <strong>Clear Queue:</strong> Removes all jobs without printing
          </p>
          <p>
            • Jobs are automatically positioned to continue from the previous
            job's end position
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrintQueueUI;
