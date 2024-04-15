const Modal = ({ children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="flex flex-col bg-white rounded-lg shadow-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {children}
        <div></div>
      </div>
    </div>
  );
};

export default Modal;
