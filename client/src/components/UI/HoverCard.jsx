import { useState, useEffect } from "react";

const HoverCard = ({ metadata, adduser, adddate }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const hanldeMouseMove = (e) => {
      const cardWidth = 300;
      const cardHeight = 250;
      const padding = 10;

      const newX = e.clientX + padding;
      const newY = e.clientY + padding;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const adjustedX = Math.min(newX, viewportWidth - cardWidth - padding);
      const adjustedY = Math.min(newY, viewportHeight - cardHeight - padding);

      setPosition({ x: adjustedX, y: adjustedY });
    };

    window.addEventListener("mousemove", hanldeMouseMove);

    return () => {
      window.removeEventListener("mousemove", hanldeMouseMove);
    };
  }, []);

  let addedBy = metadata.addedBy;
  let addedAt = metadata.addedAt;
  const editedBy = metadata.editedBy;
  let editedAt = metadata.editedAt;

  if (!addedBy || !addedAt) {
    addedBy = adduser;
    addedAt = adddate;
  }

  addedAt = addedAt ? new Date(addedAt).toLocaleString() : "No data";
  editedAt = editedAt ? new Date(editedAt).toLocaleString() : "No data";

  return (
    <div
      className="fixed z-50 p-4 max-w-md max-h-64 rounded-md bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-0 border border-slate-500"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <ul className="text-l space-y-2">
        <li>
          <span className="font-semibold">Added By:</span> {addedBy}
        </li>
        <li>
          <span className="font-semibold">Added Date:</span> {addedAt}
        </li>
        <li>
          <span className="font-semibold">Edited By:</span> {editedBy}
        </li>
        <li>
          <span className="font-semibold">Edited Date:</span> {editedAt}
        </li>
      </ul>
    </div>
  );
};

export default HoverCard;
