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

  if (!addedBy || !addedAt) {
    addedBy = adduser;
    addedAt = adddate;
  }

  addedAt = addedAt ? new Date(addedAt).toLocaleString() : "No data";

  return (
    <div
      className="fixed z-50 p-2 max-w-[300px] max-h-[250px] bg-indigo-900 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-20 border border-gray-100 text-white"
      style={{ left: position.x, top: position.y }}
    >
      <h2 className="text-xl font-semibold mb-1">Metadata</h2>
      <ul className="text-base">
        <li>
          <span className="font-semibold">Added By:</span> {addedBy}
        </li>
        <li>
          <span className="font-semibold">Added At:</span> {addedAt}
        </li>
        <li>
          <span className="font-semibold">Edited By:</span> {metadata.editedBy}
        </li>
        <li>
          <span className="font-semibold">Edited At:</span>{" "}
          {metadata.editedAt && new Date(metadata.editedAt).toLocaleString()}
        </li>
      </ul>
    </div>
  );
};

export default HoverCard;
