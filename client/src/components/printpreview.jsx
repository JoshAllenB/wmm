import React from "react";
import { Button } from "./UI/ShadCN/button";

const PreviewContent = React.forwardRef((props, ref) => (
  <div ref={ref}>
    <h2 className="text-black">Mailing Label Preview</h2>
    <textarea
      value={props.editableAddress}
      readOnly
      rows={5}
      cols={50}
      className="w-full border border-gray-300 rounded-md px-3 py-2"
    />
    <div className="flex gap-2">
      <Button onClick={props.handleEdit} className="bg-red-500">
        Edit
      </Button>
      <Button onClick={props.handlePrint} className="bg-red-500">
        Print
      </Button>
    </div>
  </div>
));

PreviewContent.displayName = "PreviewContent";

export default PreviewContent;
