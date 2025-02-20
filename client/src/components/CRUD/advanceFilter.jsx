import { useState } from "react";
import { Button } from "../UI/ShadCN/button";
import Modal from "../modal";
import InputField from "../CRUD/input";

const AdvancedFilter = ({ onApplyFilter }) => {
  const [showModal, setShowModal] = useState(false);
  const [filterData, setFilterData] = useState({
    lname: "",
    fname: "",
    mname: "",
    sname: "",
    birthdate: "",
    contactnos: "",
    cellno: "",
    ofcno: "",
    email: "",
    address: "",
    startDate: "",
    endDate: "",
    wmmActiveMonth: "",
    wmmExpiringMonth: "",
  });

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Format dates to ensure they span the entire selected month
    const formatMonthRange = (monthStr) => {
      if (!monthStr) return { start: "", end: "" };
      
      const date = new Date(monthStr);
      
      // For active subscriptions:
      // We only need the selected month's start and end
      // The backend will handle checking if subscriptions are active during this period
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Format dates as YYYY-MM-DD for consistent date handling
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      return {
        start: formatDate(start),
        end: formatDate(end)
      };
    };

    const activeMonthRange = formatMonthRange(filterData.wmmActiveMonth);
    const expiringMonthRange = formatMonthRange(filterData.wmmExpiringMonth);

    const formattedData = {
      ...filterData,
      wmmStartSubsDate: activeMonthRange.start,
      wmmEndSubsDate: activeMonthRange.end,
      wmmStartEndDate: expiringMonthRange.start,
      wmmEndEndDate: expiringMonthRange.end,
    };

    onApplyFilter(formattedData);
    closeModal();
  };

  return (
    <div>
      <Button onClick={openModal} className="bg-blue-600 text-white">
        Advanced Filter
      </Button>

      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <h1 className="text-black text-3xl font-bold">Advanced Filter</h1>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Personal Info</h1>
                <InputField
                  label="First Name:"
                  id="fname"
                  name="fname"
                  value={filterData.fname}
                  onChange={handleChange}
                />
                <InputField
                  label="Middle Name:"
                  id="mname"
                  name="mname"
                  value={filterData.mname}
                  onChange={handleChange}
                />
                <InputField
                  label="Last Name:"
                  id="lname"
                  name="lname"
                  value={filterData.lname}
                  onChange={handleChange}
                />
                <InputField
                  label="Suffix:"
                  id="sname"
                  name="sname"
                  value={filterData.sname}
                  onChange={handleChange}
                />
                <InputField
                  label="Birth Date:"
                  id="birthdate"
                  name="birthdate"
                  value={filterData.birthdate}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Contact Info</h1>
                <InputField
                  label="Contact Numbers:"
                  id="contactnos"
                  name="contactnos"
                  value={filterData.contactnos}
                  onChange={handleChange}
                />
                <InputField
                  label="Cell Number:"
                  id="cellno"
                  name="cellno"
                  value={filterData.cellno}
                  onChange={handleChange}
                />
                <InputField
                  label="Office Number:"
                  id="ofcno"
                  name="ofcno"
                  value={filterData.ofcno}
                  onChange={handleChange}
                />
                <InputField
                  label="Email:"
                  id="email"
                  name="email"
                  value={filterData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Address</h1>
                <textarea
                  label="Address:"
                  id="address"
                  name="address"
                  className="w-full p-2 border-2 border-gray-300 rounded-md"
                  value={filterData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Date Range</h1>
                <InputField
                  label="Start Date:"
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={filterData.startDate}
                  onChange={handleChange}
                />
                <InputField
                  label="End Date:"
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={filterData.endDate}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Active Subscriptions</h1>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Select month to find clients with active subscriptions during this period
                  </p>
                  <InputField
                    label="Select Month:"
                    id="wmmActiveMonth"
                    name="wmmActiveMonth"
                    type="month"
                    value={filterData.wmmActiveMonth}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex flex-col mb-2 p-2">
                <h1 className="text-black mb-2 font-bold">Expiring Subscriptions</h1>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Select month to find clients whose subscriptions expire in this period
                  </p>
                  <InputField
                    label="Select Month:"
                    id="wmmExpiringMonth"
                    name="wmmExpiringMonth"
                    type="month"
                    value={filterData.wmmExpiringMonth}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              <Button
                type="button"
                onClick={closeModal}
                className="text-white bg-red-500 hover:bg-red-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white text-sm bg-green-600 hover:bg-green-800 rounded-xl"
              >
                Apply Filter
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdvancedFilter;
