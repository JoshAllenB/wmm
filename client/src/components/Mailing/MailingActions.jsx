import React from 'react';
import { Button } from "../UI/ShadCN/button";

const MailingActions = ({
  isLoading,
  hasAvailableRows,
  selectedTemplate,
  useLegacyFormat,
  onPrintPreview,
  onDirectPrint
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Modern Template Print Preview Button */}
      {!useLegacyFormat && (
        <Button
          onClick={onPrintPreview}
          disabled={!hasAvailableRows || isLoading}
          className="w-full"
          variant="default"
        >
          Print Preview
        </Button>
      )}

      {/* Legacy Template Direct Print Button */}
      {useLegacyFormat && selectedTemplate?.isLegacy && (
        <Button
          onClick={onDirectPrint}
          disabled={!hasAvailableRows || isLoading}
          className="w-full"
          variant="default"
        >
          Print to Dot Matrix
        </Button>
      )}

      {/* Show message if no rows available */}
      {!hasAvailableRows && (
        <p className="text-sm text-center text-gray-500">
          No records selected for printing
        </p>
      )}
    </div>
  );
};

export default MailingActions; 