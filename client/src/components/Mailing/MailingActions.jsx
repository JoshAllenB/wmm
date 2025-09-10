import { Button } from "../UI/ShadCN/button";

const MailingActions = ({
  isLoading,
  hasAvailableRows,
  selectedTemplate,
  onPrintPreview,
  queueLoading,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Print Preview Button - Primary action */}
      <Button
        onClick={onPrintPreview}
        disabled={!hasAvailableRows || isLoading || queueLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
        variant="default"
      >
        {queueLoading ? "Preparing Print Queue..." : "Print Preview"}
      </Button>

      {/* Show message if no rows available */}
      {!hasAvailableRows && (
        <p className="text-sm text-center text-gray-500">
          No records selected for printing
        </p>
      )}

      {/* Show message if data is being added to queue */}
      {hasAvailableRows && queueLoading && (
        <p className="text-sm text-center text-blue-600">
          Adding {hasAvailableRows.length} items to print queue...
        </p>
      )}
    </div>
  );
};

export default MailingActions;
