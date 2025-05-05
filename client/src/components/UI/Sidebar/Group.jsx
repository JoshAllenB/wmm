import React from "react";
import { BsArrowLeftCircle } from "react-icons/bs";
import { FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Group = ({ open, setOpen }) => {
  const navigate = useNavigate();

  const handleGroupClick = () => {
    navigate("/group");
  };

  return (
    <div className="flex flex-col">
      <div
        className={`${
          open ? "w-60" : "w-20"
        } relative flex items-center py-4 px-4 gap-3.5`}
      >
        <div
          onClick={() => setOpen(!open)}
          className={`cursor-pointer duration-500 text-gray-400 text-lg ${
            open && "rotate-180"
          }`}
        >
          <BsArrowLeftCircle />
        </div>
        <h1
          className={`text-gray-400 origin-left font-semibold text-lg duration-300 ${
            !open && "scale-0"
          }`}
        >
          Group
        </h1>
      </div>
      <div
        onClick={handleGroupClick}
        className="pl-4 flex cursor-pointer items-center gap-x-4 p-4 hover:bg-gray-800 rounded-md mt-2"
      >
        <span className="text-2xl text-gray-300 block float-left">
          <FaUsers />
        </span>
        <span
          className={`text-base font-medium flex-1 text-gray-300 duration-200 ${
            !open && "hidden"
          }`}
        >
          All Groups
        </span>
      </div>
    </div>
  );
};

export default Group; 