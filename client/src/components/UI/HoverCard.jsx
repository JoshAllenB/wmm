import { useState, useEffect } from "react";

const HoverCard = ({ metadata, adduser, adddate }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
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

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const hasData = metadata || adduser || adddate;

  if (!hasData) {
    return null;
  }

  const addedBy = metadata?.addedBy || adduser || "No data";
  let addedAt = metadata?.addedAt || adddate || "No data";
  const editedBy = metadata?.editedBy || "No data";
  let editedAt = metadata?.editedAt || "No data";
  
  addedAt =
    addedAt === "No data" ? "No data" : new Date(addedAt).toLocaleString();
  editedAt =
    editedAt === "No data" ? "No data" : new Date(editedAt).toLocaleString();

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
