import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "./ShadCN/alert-dialog";

const InactivityWarning = ({ isOpen, onContinue, onClose, remainingTime }) => {
  const secondsLeft = Math.ceil(remainingTime / 1000);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <div>
                Your session will expire in{" "}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}
                </span>{" "}
                due to inactivity.
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Click "Continue Session" to stay logged in.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InactivityWarning;
