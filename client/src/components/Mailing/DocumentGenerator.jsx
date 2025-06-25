import React, { useState, useCallback } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import RenewalNoticeDataOverlay from "./RenewalNotice";
import ThankYouLetterDataOverlay from "./ThankYouLetter";
import { ScrollArea } from "../UI/ShadCN/scroll-area";

const DocumentGenerator = ({
  startClientId,
  endClientId,
  availableRows,
  allData,
  useAllData,
  setUseAllData,
  onSkippedDataUpdate,
  onClose
}) => {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [renewalNoticeConfig, setRenewalNoticeConfig] = useState(null);
  const [thankYouLetterConfig, setThankYouLetterConfig] = useState(null);
  const [skippedData, setSkippedData] = useState([]);
  const [showSkippedData, setShowSkippedData] = useState(false);

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
    setRenewalNoticeConfig(prev => ({
      ...prev,
      positions: positions
    }));
  };

  // Function to update thank you letter positions from shared config
  const updateThankYouLetterPositions = (positions) => {
    setThankYouLetterConfig(prev => ({
      ...prev,
      positions: positions
    }));
  };

  // Function to handle skipped data updates
  const handleSkippedDataUpdate = (skippedRecords) => {
    setSkippedData(skippedRecords);
    if (onSkippedDataUpdate) {
      onSkippedDataUpdate(skippedRecords);
    }
  };

  // Component to display skipped data
  const SkippedDataDisplay = () => {
    if (skippedData.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-yellow-800">
            Records Not Being Printed ({skippedData.length})
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkippedData(!showSkippedData)}
            className="text-yellow-800 hover:text-yellow-900"
          >
            {showSkippedData ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
        
        {showSkippedData && (
          <ScrollArea className="h-[200px] w-full rounded border border-yellow-200 bg-white">
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-yellow-200">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Name/Company</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {skippedData.map((record, index) => (
                    <tr key={index} className="border-b border-yellow-100 last:border-0">
                      <td className="py-2">{record.id}</td>
                      <td className="py-2">
                        {record.name || record.company || 'N/A'}
                      </td>
                      <td className="py-2 text-yellow-700">{record.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </div>
    );
  };

  const filterSubscribers = useCallback((rows) => {
    if (!rows) return { filtered: [], skipped: [] };
    
    const filtered = [];
    const skipped = [];
    
    rows.forEach((row) => {
      const clientId = row?.original?.id?.toString();
      if (!clientId) {
        skipped.push({
          id: "N/A",
          reason: "Missing client ID"
        });
        return;
      }
      
      const trimmedStartId = startClientId?.trim();
      const trimmedEndId = endClientId?.trim();
      
      // Convert to numbers for comparison
      const numericClientId = parseInt(clientId, 10);
      const numericStartId = trimmedStartId ? parseInt(trimmedStartId, 10) : null;
      const numericEndId = trimmedEndId ? parseInt(trimmedEndId, 10) : null;
      
      // Check if any conversion resulted in NaN
      if (isNaN(numericClientId) || (numericStartId && isNaN(numericStartId)) || (numericEndId && isNaN(numericEndId))) {
        skipped.push({
          id: clientId,
          name: `${row.original.title || ''} ${row.original.fname || ''} ${row.original.lname || ''}`.trim(),
          company: row.original.company,
          reason: "Invalid ID format"
        });
        return;
      }
      
      const isAfterStart = numericStartId ? numericClientId >= numericStartId : true;
      const isBeforeEnd = numericEndId ? numericClientId <= numericEndId : true;
      
      if (!isAfterStart || !isBeforeEnd) {
        skipped.push({
          id: clientId,
          name: `${row.original.title || ''} ${row.original.fname || ''} ${row.original.lname || ''}`.trim(),
          company: row.original.company,
          reason: "Outside selected ID range"
        });
        return;
      }

      // Add the row to filtered if it passes all checks
      filtered.push(row);
    });
    
    return { filtered, skipped };
  }, [startClientId, endClientId]);

  return (
    <div className="w-full max-w-[1500px]">
      <h2 className="text-2xl font-bold mb-3 text-center">Document Generator</h2>
      
      {/* Standardized Data Source Toggle */}
      {allData && (
        <div className="mb-6 mx-auto max-w-md p-4 bg-blue-50 rounded-lg">
          <div className="flex flex-col">
            <h4 className="font-medium text-gray-700 mb-2">Data Source</h4>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setUseAllData(false);
                  setSkippedData([]); // Reset skipped data when changing data source
                  setShowSkippedData(false);
                  if (onSkippedDataUpdate) {
                    onSkippedDataUpdate([]); // Reset parent's skipped data
                  }
                }}
                size="sm"
                variant={useAllData ? "outline" : "default"}
                className={`flex-1 ${!useAllData ? 'bg-blue-600 text-white' : ''}`}
              >
                Selected ({availableRows.length})
              </Button>
              <Button
                onClick={() => {
                  setUseAllData(true);
                  setSkippedData([]); // Reset skipped data when changing data source
                  setShowSkippedData(false);
                  if (onSkippedDataUpdate) {
                    onSkippedDataUpdate([]); // Reset parent's skipped data
                  }
                }}
                size="sm"
                variant={useAllData ? "default" : "outline"}
                className={`flex-1 ${useAllData ? 'bg-blue-600 text-white' : ''}`}
              >
                All Records ({allData.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Display skipped data information */}
      <SkippedDataDisplay />

      {!selectedDocument ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Renewal Notice Card */}
          <div 
            onClick={() => handleDocumentSelect('renewal')}
            className="cursor-pointer group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-500"
          >
            <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
              Renewal
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 text-blue-600 transform group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Renewal Notice</h3>
              <p className="text-gray-600 text-sm text-center">
                Generate renewal notices for subscribers with upcoming expiration dates
              </p>
            </div>
          </div>

          {/* Thank You Letter Card */}
          <div 
            onClick={() => handleDocumentSelect('thankyou')}
            className="cursor-pointer group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border-2 border-transparent hover:border-purple-500"
          >
            <div className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
              Thank You
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 mb-4 text-purple-600 transform group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Thank You Letter</h3>
              <p className="text-gray-600 text-sm text-center">
                Generate thank you letters for new subscribers or renewals
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {selectedDocument === 'renewal' ? (
            <RenewalNoticeDataOverlay
              startId={startClientId}
              endId={endClientId}
              availableRows={availableRows}
              useSharedConfig={!!renewalNoticeConfig}
              sharedConfig={renewalNoticeConfig}
              updatePositions={updateRenewalNoticePositions}
              onSkippedDataUpdate={handleSkippedDataUpdate}
            />
          ) : (
            <ThankYouLetterDataOverlay
              startId={startClientId}
              endId={endClientId}
              availableRows={availableRows}
              useSharedConfig={!!thankYouLetterConfig}
              sharedConfig={thankYouLetterConfig}
              updatePositions={updateThankYouLetterPositions}
              onSkippedDataUpdate={handleSkippedDataUpdate}
            />
          )}
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setSelectedDocument(null)}
              variant="outline"
              className="mr-2"
            >
              Back to Selection
            </Button>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentGenerator; 