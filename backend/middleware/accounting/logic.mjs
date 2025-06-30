import { models, modelConfigs } from "../../models/modelConfig.mjs";
import ClientModel from "../../models/clients.mjs";

// Helper function to extract payment fields
const getPaymentFields = (modelName) => {
  const paymentFields = {};
  const projectFields = modelConfigs[modelName]?.projectFields || {};

  for (const [field, value] of Object.entries(projectFields)) {
    if (
      field.startsWith("paymt") ||
      field === "recvdate" ||
      field === "paymtdate" ||
      field === "adddate"
    ) {
      paymentFields[field] = value;
    }
  }
  return paymentFields;
};

// GET /payments - Get all payments for all clients
export const getAllPayments = async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json");
    // Optional query parameters
    const {
      page = 1,
      limit = 100,
      sort = "recvdate",
      order = "desc",
      startDate,
      endDate,
    } = req.query;

    // Build date filter if provided
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // First get paginated clients
    const clients = await ClientModel.find()
      .select("id lname fname mname company")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    if (!clients.length) {
      return res.status(404).json({ error: "No clients found" });
    }

    const allPayments = [];

    // Process each model for payment data
    for (const [modelName, modelLoader] of Object.entries(models)) {
      const model = await modelLoader();
      const paymentFields = getPaymentFields(modelName);

      if (Object.keys(paymentFields).length > 0) {
        const clientIdField =
          modelName === "ComplimentaryModel" ? "clientId" : "clientid";

        // Build base query
        const matchQuery = {
          [clientIdField]: { $in: clients.map((c) => c.id) },
        };

        // Add date filter if applicable
        if (Object.keys(dateFilter).length > 0) {
          matchQuery.recvdate = dateFilter;
        }

        // Get payments from this model
        const modelPayments = await model.default.aggregate([
          { $match: matchQuery },
          {
            $project: {
              ...paymentFields,
              [clientIdField]: 1,
              model: { $literal: modelName.replace("Model", "") },
            },
          },
          { $sort: { [sort]: order === "desc" ? -1 : 1 } },
        ]);

        if (modelPayments.length > 0) {
          allPayments.push(...modelPayments);
        }
      }
    }

    // Group payments by client and flatten
    const flatPayments = [];
    clients.forEach((client) => {
      const clientPayments = allPayments
        .filter((p) => p.clientid === client.id || p.clientId === client.id)
        .map(({ clientid, clientId, ...payment }) => ({
          ...payment,
          clientId: client.id,
          clientName: `${client.lname}, ${client.fname}${
            client.mname ? " " + client.mname : ""
          }`,
          company: client.company,
        }));
      flatPayments.push(...clientPayments);
    });

    res.json({
      page: parseInt(page),
      limit: parseInt(limit),
      totalClients: clients.length,
      totalPayments: allPayments.length,
      data: flatPayments, // <-- now a flat array
    });
  } catch (error) {
    console.error("Error in /payments endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
