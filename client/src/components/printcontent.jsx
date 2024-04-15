import React from "react";

const PrintableContent = React.forwardRef((props, ref) => (
  <div ref={ref}>
    <h2>Mailing Label Preview</h2>
    <textarea
      value={props.editableAddress}
      readOnly
      rows={5}
      cols={50}
      className="w-full border border-gray-300 rounded-md px-3 py-2"
    />
  </div>
));

PrintableContent.displayName = "PrintableContent";

export default PrintableContent;
