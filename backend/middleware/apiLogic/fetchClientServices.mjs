import ClientModel from "../../models/clients.mjs";

const models = {
  WmmModel: () => import("../../models/wmm.mjs"),
  HrgModel: () => import("../../models/hrg.mjs"),
  FomModel: () => import("../../models/fom.mjs"),
  CalModel: () => import("../../models/cal.mjs"),
};

async function fetchClientServices(clientIds = null) {
  try {
    let clientQuery = {};
    if (clientIds) {
      clientQuery = { id: { $in: clientIds } };
    }

    const clients = await ClientModel.find(clientQuery).select("id").lean();

    const serviceData = await Promise.all(
      Object.entries(models).map(async ([modelName, importFunc]) => {
        const { default: Model } = await importFunc();
        const serviceName = modelName
          .toLowerCase()
          .replace("model", "")
          .toUpperCase();

        const serviceSubscriptions = await Model.aggregate([
          {
            $group: {
              _id: "$clientid",
              hasData: { $sum: 1 },
            },
          },
        ]);

        return { serviceName, subscriptions: serviceSubscriptions };
      })
    );

    const clientServices = clients.map((client) => {
      const services = serviceData.reduce(
        (acc, { serviceName, subscriptions }) => {
          const hasService = subscriptions.some(
            (sub) => sub._id === client.id && sub.hasData > 0
          );
          if (hasService) {
            acc.push(serviceName);
          }
          return acc;
        },
        []
      );

      return {
        clientId: client.id,
        services,
      };
    });

    console.log("Services:", clientServices);

    return clientServices;
  } catch (error) {
    console.error("Error fetching client services:", error);
    throw error;
  }
}

export default fetchClientServices;
