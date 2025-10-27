import { useContext, useEffect } from "react";
import { Button } from "./ShadCN/button";
import { ActivityContext } from "../../utils/ActivityMonitor";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
  cancelButtonClass = "bg-gray-200 hover:bg-gray-300 text-gray-700",
  children,
}) => {
  const resetActivityTimer = useContext(ActivityContext);

  // Pause activity monitoring when modal is open; resume when closed
  useEffect(() => {
    if (resetActivityTimer && resetActivityTimer.setActivityPaused) {
      resetActivityTimer.setActivityPaused(Boolean(isOpen));
    }

    return () => {
      if (resetActivityTimer && resetActivityTimer.setActivityPaused) {
        resetActivityTimer.setActivityPaused(false);
      }
    };
  }, [isOpen, resetActivityTimer]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <Button
            onClick={onClose}
            className="p-1 bg-transparent hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full"
            size="sm"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children ? (
            children
          ) : (
            <div className="flex items-start space-x-3">
              {/* Warning Icon */}
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              {/* Message */}
              <div className="flex-1">
                <p className="text-sm text-gray-700">{message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <Button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md ${cancelButtonClass}`}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md ${confirmButtonClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;