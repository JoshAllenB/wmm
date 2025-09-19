import React, { useState, useCallback } from "react";
import { Button } from "../UI/ShadCN/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../UI/ShadCN/dialog";
import RenewalNoticeDataOverlay from "./RenewalNotice";
import ThankYouLetterDataOverlay from "./ThankYouLetter";
import { toast } from "react-hot-toast";

const DocumentGenerator = ({
  startClientId,
  endClientId,
  availableRows,
  allData,
  useAllData,
  setUseAllData,
  onSkippedDataUpdate,
  onClose,
  onRefreshAllData,
  isOpen = false,
}) => {
  const [selectedDocument, setSelectedDocument] = useState("renewal");
  const [renewalNoticeConfig, setRenewalNoticeConfig] = useState(null);
  const [thankYouLetterConfig, setThankYouLetterConfig] = useState(null);
  const [skippedData, setSkippedData] = useState([]);
  const [showSkippedData, setShowSkippedData] = useState(false);

  const [isLoadingAllRecords, setIsLoadingAllRecords] = useState(false);

  // Function to handle document selection
  const handleDocumentSelect = (docType) => {
    setSelectedDocument(docType);
    setSkippedData([]); // Reset skipped data when changing document type
    setShowSkippedData(false);
    if (onSkippedDataUpdate) {
      onSkippedDataUpdate([]); // Reset parent's skipped data
    }
  };

  // Function to update renewal notice positions from shared config
  const updateRenewalNoticePositions = (positions) => {
    setRenewalNoticeConfig((prev) => ({
      ...prev,
      positions: positions,
    }));
  };

  // Function to update thank you letter positions from shared config
  const updateThankYouLetterPositions = (positions) => {
    setThankYouLetterConfig((prev) => ({
      ...prev,
      positions: positions,
    }));
  };

  // Function to handle skipped data updates

  // Component to display skipped data

  const filterSubscribers = useCallback(
    (rows) => {
      if (!rows) return { filtered: [], skipped: [] };

      const filtered = [];
      const skipped = [];

      rows.forEach((row) => {
        const clientId = row?.original?.id?.toString();
        if (!clientId) {
          skipped.push({
            id: "N/A",
            reason: "Missing client ID",
          });
          return;
        }

        const trimmedStartId = startClientId?.trim();
        const trimmedEndId = endClientId?.trim();

        // Convert to numbers for comparison
        const numericClientId = parseInt(clientId, 10);
        const numericStartId = trimmedStartId
          ? parseInt(trimmedStartId, 10)
          : null;
        const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;

        // Check if any conversion resulted in NaN
        if (
          isNaN(numericClientId) ||
          (numericStartId && isNaN(numericStartId)) ||
          (numericEndId && isNaN(numericEndId))
        ) {
          skipped.push({
            id: clientId,
            name: `${row.original.title || ""} ${row.original.fname || ""} ${
              row.original.lname || ""
            }`.trim(),
            company: row.original.company,
            reason: "Invalid ID format",
          });
          return;
        }

        const isAfterStart = numericStartId
          ? numericClientId >= numericStartId
          : true;
        const isBeforeEnd = numericEndId
          ? numericClientId <= numericEndId
          : true;

        if (!isAfterStart || !isBeforeEnd) {
          skipped.push({
            id: clientId,
            name: `${row.original.title || ""} ${row.original.fname || ""} ${
              row.original.lname || ""
            }`.trim(),
            company: row.original.company,
            reason: "Outside selected ID range",
          });
          return;
        }

        // Add the row to filtered if it passes all checks
        filtered.push(row);
      });

      return { filtered, skipped };
    },
    [startClientId, endClientId]
  );

  // Update data source toggle UI
  const DataSourceToggle = () => (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setUseAllData(false)}
        variant={useAllData ? "outline" : "default"}
        className={`whitespace-nowrap ${
          !useAllData ? "bg-blue-600 text-white" : ""
        }`}
      >
        Selected ({availableRows.length})
      </Button>
      <Button
        onClick={async () => {
          setUseAllData(true);
          setIsLoadingAllRecords(true);
          try {
            await onRefreshAllData?.();
          } catch (error) {
            console.error("Error fetching all data:", error);
            toast({
              title: "Error",
              description:
                "Failed to fetch all records. Using table data instead.",
              variant: "destructive",
            });
          } finally {
            setIsLoadingAllRecords(false);
          }
        }}
        variant={useAllData ? "default" : "outline"}
        className={`whitespace-nowrap ${
          useAllData ? "bg-blue-600 text-white" : ""
        }`}
      >
        {isLoadingAllRecords ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Loading...</span>
          </div>
        ) : (
          `All Records (${allData?.length || 0})`
        )}
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Document Generator</DialogTitle>
        </DialogHeader>

        {/* Top toolbar: document switch + data source */}
        <div className="px-4 pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Document</span>
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={
                    selectedDocument === "renewal" ? "default" : "outline"
                  }
                  className={`${
                    selectedDocument === "renewal"
                      ? "bg-blue-600 text-white"
                      : ""
                  } rounded-none`}
                  onClick={() => handleDocumentSelect("renewal")}
                >
                  Renewal Notice
                </Button>
                <Button
                  variant={
                    selectedDocument === "thankyou" ? "default" : "outline"
                  }
                  className={`${
                    selectedDocument === "thankyou"
                      ? "bg-purple-600 text-white"
                      : ""
                  } rounded-none`}
                  onClick={() => handleDocumentSelect("thankyou")}
                >
                  Thank You Letter
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-xs text-gray-500">
                Range: {startClientId || "Start"} - {endClientId || "End"}
              </div>
              <DataSourceToggle />
              <Button onClick={onClose} variant="secondary" className="md:ml-2">
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto px-2 md:px-4 pb-4">
          {selectedDocument === "renewal" ? (
            <RenewalNoticeDataOverlay
              startId={startClientId}
              endId={endClientId}
              availableRows={availableRows}
              useSharedConfig={!!renewalNoticeConfig}
              sharedConfig={renewalNoticeConfig}
              updatePositions={updateRenewalNoticePositions}
              onSkippedDataUpdate={onSkippedDataUpdate}
            />
          ) : (
            <ThankYouLetterDataOverlay
              startId={startClientId}
              endId={endClientId}
              availableRows={availableRows}
              useSharedConfig={!!thankYouLetterConfig}
              sharedConfig={thankYouLetterConfig}
              updatePositions={updateThankYouLetterPositions}
              onSkippedDataUpdate={onSkippedDataUpdate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentGenerator;
