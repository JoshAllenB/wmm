import { Button } from "./UI/ShadCN/button";

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed w-[100%] inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="relative flex flex-col bg-white rounded-lg shadow-lg p-8 max-h-[90vh] overflow-y-auto">
        <Button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-6 w-6"
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
        {children}
      </div>
    </div>
  );
};

export default Modal;
