import axios from "axios";

export const getDonorRecipientData = async ({
  page = 1,
  pageSize = 20,
  searchTerm,
  sorting,
}) => {
  try {
    const response = await axios.get(
      `http://${
        import.meta.env.VITE_IP_ADDRESS
      }:3001/donor-data/recipient-data`,
      {
        params: {
          page,
          pageSize,
          searchTerm,
          sortField: sorting?.id,
          sortOrder: sorting?.desc ? "desc" : "asc",
        },
      }
    );
    console.log("response.data", response.data);
    console.log(
      `Fetched donor-recipient data: ${response.data.length} records`
    );
    return {
      data: response.data.data || response.data, // handle both structures
      totalPages: response.data.totalPages || 1,
      totalRecords: response.data.totalRecords || response.data.length || 0,
    };
  } catch (error) {
    console.error("Error fetching donor-recipient data:", error);
    throw error;
  }
};

// This function helps format the donor data for display
export const formatDonorData = (data) => {
  return data.map(({ donor, recipients }) => ({
    donor: {
      id: donor.id,
      name: donor.name,
      address: donor.address,
      contact: donor.contact,
    },
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      address: recipient.address,
      contact: recipient.contact,
      subscriptions: recipient.subscriptions.map((sub) => ({
        ...sub,
        subsdate: new Date(sub.subsdate).toLocaleDateString(),
        expiry: new Date(sub.expiry).toLocaleDateString(),
      })),
    })),
  }));
};
