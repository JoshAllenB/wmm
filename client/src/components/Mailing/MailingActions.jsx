import { Button } from "../UI/ShadCN/button";

const MailingActions = ({
  isLoading,
  hasAvailableRows,
  selectedTemplate,
  onPrintPreview,
  onDirectPrint,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Print Preview Button */}
      <Button
        onClick={onPrintPreview}
        disabled={!hasAvailableRows || isLoading}
        className="w-full"
        variant="default"
      >
        Print Preview
      </Button>

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
