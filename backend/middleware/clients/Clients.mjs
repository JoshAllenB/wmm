import express from "express";
import ClientModel from "../../models/clients.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { checkRole } from "../users/checkRole.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import CalModel from "../../models/cal.mjs";
import attachSocketId from "../apiLogic/attachSocketId.js";
import dotenv from "dotenv";
import dataService from "../apiLogic/services/DataService.mjs";
import { logClientCreation, logClientUpdate, logClientDeletion } from '../clientLogs/clientLogs.mjs';
import { checkDuplicates } from './duplicateCheck.mjs';
import { calculateStatistics } from '../apiLogic/services/statsCalculator.mjs';
import { buildFilterQuery } from '../apiLogic/services/filterBuilder.mjs';
import PromoModel from "../../models/promo.mjs";
import ComplimentaryModel from "../../models/complimentary.mjs";
import { getSubscriptionModelName, adjustModelNamesForSubscription } from '../apiLogic/services/helpers.mjs';

dotenv.config();

const router = express.Router();

// Shared function for data fetching logic
const fetchClientData = async (req, options = {}) => {
  const {
    skipPagination = false,
    page = 1,
    pageSize = 20,
    filter = "",
    group = "",
    modelNames = [],
    subscriptionType = "WMM",  // Add default subscription type
    ...advancedFilterData
  } = options;

  await req.user.populate({
    path: "roles.role",
    populate: { path: "defaultPermissions" },
  });

  const userRoles = req.user.roles.map((role) => role.role.name);
  
  // Ensure modelNames is always a valid array
  let validModelNames = Array.isArray(modelNames) && modelNames.length > 0 
    ? modelNames 
    : userRoles.includes("Admin") || userRoles.includes("Accounting")
      ? ["WmmModel", "HrgModel", "FomModel", "CalModel"]
      : userRoles
          .filter(role => role !== "Accounting")
          .map((role) => `${role}Model`);

  // Ensure we have at least one model to query
  if (validModelNames.length === 0) {
    validModelNames.push("WmmModel");
  }

  // Replace WmmModel with appropriate subscription model using helper function
  validModelNames = adjustModelNamesForSubscription(validModelNames, subscriptionType);

  // Use appropriate data fetching method based on skipPagination
  const results = skipPagination
    ? await dataService.fetchAllData({
        modelNames: validModelNames,
        filter,
        group,
        clientIds: null,
        advancedFilterData: {
          ...advancedFilterData,
          subscriptionType
        }
      })
    : await dataService.fetchData({
        modelNames: validModelNames,
        filter,
        page,
        limit: pageSize,
        pageSize,
        group,
        clientIds: null,
        advancedFilterData: {
          ...advancedFilterData,
          subscriptionType
        }
      });

  // Process and merge client services data
  const { combinedData, clientServices, stats, totalPages, currentPage } = results;
  const processedData = combinedData.map((client) => {
    const clientService = clientServices.find(
      (service) => service.clientId === client.id
    );
    return {
      ...client,
      services: clientService ? clientService.services : [],
      subscriptionType // Add subscription type to processed data
    };
  });

  return {
    processedData,
    stats,
    totalPages,
    currentPage,
    subscriptionType // Add subscription type to return object
  };
};

router.get(
  "/",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    const io = req.io;
    const socketId = req.socketId;
    const {
      page = 1,
      pageSize = 20,
      filter = "",
      group = "",
      subscriptionType = "WMM",
      ...advancedFilterData
    } = req.query;

    try {
      const parsedPage = parseInt(page, 10);
      const parsedPageSize = parseInt(pageSize, 10);
      const validPage = isNaN(parsedPage) ? 1 : parsedPage;
      const validPageSize = isNaN(parsedPageSize) ? 20 : parsedPageSize;

      // Normalize subscription type
      let normalizedSubscriptionType = Array.isArray(subscriptionType) 
        ? subscriptionType[0] 
        : subscriptionType;

      // Validate subscription type
      if (!["WMM", "Promo", "Complimentary"].includes(normalizedSubscriptionType)) {
        normalizedSubscriptionType = "WMM";
      }

      const { processedData, stats, totalPages, currentPage } = await fetchClientData(req, {
        page: validPage,
        pageSize: validPageSize,
        filter,
        group,
        subscriptionType: normalizedSubscriptionType,
        ...advancedFilterData
      });

      const actualPage = Math.min(currentPage, totalPages || 1);

      res.json({
        combinedData: processedData,
        page: actualPage,
        totalPages: totalPages || 1,
        stats,
        subscriptionType: normalizedSubscriptionType
      });

      if (io && socketId) {
        io.to(socketId).emit("dataFetched", {
          message: "Data fetched successfully",
          timestamp: new Date(),
          subscriptionType: normalizedSubscriptionType
        });
      }
    } catch (error) {
      console.error("Error in client data fetch:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
);

router.post(
  "/fetchall",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    const io = req.io;
    const socketId = req.socketId;
    const {
      filter = "",
      group = "",
      advancedFilterData = {}
    } = req.body;

    try {
      await req.user.populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      });

      const userRoles = req.user.roles.map((role) => role.role.name);
      
      // Ensure modelNames is always an array
      let modelNames = [];
      if (userRoles.includes("Admin") || userRoles.includes("Accounting")) {
        modelNames = ["WmmModel", "HrgModel", "FomModel", "CalModel"];
      } else {
        modelNames = userRoles
          .filter(role => role !== "Accounting") // Skip Accounting role as it's handled above
          .map((role) => `${role}Model`);
      }

      // Validate modelNames is not empty
      if (!Array.isArray(modelNames) || modelNames.length === 0) {
        modelNames = ["WmmModel"]; // Default to WmmModel if no roles match
      }

      // Use the shared fetchClientData function with skipPagination=true
      const results = await fetchClientData(req, {
        skipPagination: true,
        filter,
        group,
        ...advancedFilterData,
        modelNames // Pass modelNames explicitly
      });

      // Extract the processed data
      const { processedData, stats } = results;

      // Add additional data needed for mailing features
      const enhancedData = await Promise.all(processedData.map(async (client) => {
        // Get the latest subscription data for each client
        const [wmmSubscription] = await WmmModel.find({ clientid: client.id })
          .sort({ subsdate: -1 })
          .limit(1)
          .lean();

        return {
          ...client,
          wmmData: wmmSubscription ? {
            ...wmmSubscription,
            records: [wmmSubscription]
          } : null
        };
      }));

      res.json({
        combinedData: enhancedData,
        stats
      });

      if (io && socketId) {
        io.to(socketId).emit("dataFetched", {
          message: "All data fetched successfully",
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error in client data fetch:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      });
    }
  }
);

router.get("/:id/latest-subscription", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const clientExists = await ClientModel.findOne({ id: parseInt(id) });

    if (!clientExists) {
      return res.status(404).json({
        error: "Client not found",
        message: `No client found with ID ${id}`,
      });
    }

    const [wmmSubscription, hrgSubscription, fomSubscription] =
      await Promise.all([
        WmmModel.findOne({ clientid: parseInt(id) })
          .sort({ subsdate: -1, enddate: -1 })
          .exec(),
        HrgModel.findOne({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .exec(),
        FomModel.findOne({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .exec(),
      ]);

    let latestSubscription = null;

    if (wmmSubscription) {
      latestSubscription = {
        ...wmmSubscription.toObject(),
        subscriptionEnd: wmmSubscription.enddate,
        subscriptionType: "WMM",
      };
    } else if (hrgSubscription) {
      latestSubscription = {
        ...hrgSubscription.toObject(),
        subscriptionEnd: hrgSubscription.renewdate,
        subscriptionType: "HRG",
      };
    } else if (fomSubscription) {
      latestSubscription = {
        ...fomSubscription.toObject(),
        subscriptionEnd: fomSubscription.recvdate,
        subscriptionType: "FOM",
      };
    }

    if (!latestSubscription) {
      return res.status(404).json({
        error: "No subscription found",
        message: `No subscription data found for client ID ${id}`,
      });
    }

    res.json(latestSubscription);
  } catch (err) {
    console.error("Error fetching latest subscription:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
});

router.post("/add", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { clientData, roleSubmissions } = req.body;

    const user = await UserModel.findById(req.userId).populate("roles.role");

    // Generate new client ID
    const highestIdClient = await ClientModel.findOne().sort({ id: -1 });
    const newClientId = (highestIdClient ? highestIdClient.id : 0) + 1;

    // Create base client
    const baseClientData = {
      id: newClientId,
      ...clientData,
      adduser: user.username,
      adddate: new Date()
        .toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
        .replace(",", ""),
    };

    // Insert base client data
    const newClient = await ClientModel.create(baseClientData);

    // Log the client creation
    await logClientCreation(req.userId, newClient.toObject());

    // Handle role-specific data
    const roleModelMap = {
      WMM: WmmModel,
      HRG: HrgModel,
      FOM: FomModel,
      CAL: CalModel,
      PROMO: PromoModel,
      COMP: ComplimentaryModel
    };

    const roleResults = [];

    // Process each role submission
    for (const submission of roleSubmissions) {
      const { roleType, roleData } = submission;

      // Map subscription types to their model types
      const subscriptionModelTypes = {
        "Promo": "PROMO",
        "Complimentary": "COMP",
        "WMM": "WMM"
      };

      // If this is a subscription-related submission
      if (["WMM", "PROMO", "COMP"].includes(roleType)) {
        // Only process if it matches the client's subscription type
        const expectedModelType = subscriptionModelTypes[clientData.subscriptionType];
        if (roleType !== expectedModelType) {
          continue;
        }
      }

      if (roleType && roleModelMap[roleType]) {
        const RoleModel = roleModelMap[roleType];

        // Generate new ID for the role-specific model
        const highestIdRoleSpecific = await RoleModel.findOne().sort({ id: -1 });
        const newRoleSpecificId = (highestIdRoleSpecific ? highestIdRoleSpecific.id : 0) + 1;

        // Format adddate based on subscription type
        let formattedAddDate;
        if (roleType === "COMP") {
          // For complimentary subscriptions, format as YYYY-MM-DD
          const now = new Date();
          formattedAddDate = now.toISOString().split('T')[0];
        } else {
          // For other types, use the existing format
          formattedAddDate = new Date()
            .toLocaleString("en-US", {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
            .replace(",", "");
        }

        const roleSpecificData = {
          id: newRoleSpecificId,
          clientid: newClientId,
          ...roleData,
          adduser: user.username,
          adddate: formattedAddDate,
        };

        // Insert role-specific data
        const roleSpecificClient = await RoleModel.create(roleSpecificData);
        roleResults.push({
          roleType,
          success: true,
          data: roleSpecificClient
        });
      }
    }

    // Emit socket event with complete data - only fetch data for the correct subscription type
    const [wmmData, hrgData, fomData, calData, promoData, complimentaryData] = await Promise.all([
      clientData.subscriptionType === "WMM" ? WmmModel.find({ clientid: newClientId }).sort({ subsdate: -1 }).lean() : [],
      HrgModel.find({ clientid: newClientId }).sort({ recvdate: -1 }).lean(),
      FomModel.find({ clientid: newClientId }).sort({ recvdate: -1 }).lean(),
      CalModel.find({ clientid: newClientId }).sort({ recvdate: -1 }).lean(),
      clientData.subscriptionType === "Promo" ? PromoModel.find({ clientid: newClientId }).sort({ subsdate: -1 }).lean() : [],
      clientData.subscriptionType === "Complimentary" ? ComplimentaryModel.find({ clientid: newClientId }).sort({ subsdate: -1 }).lean() : []
    ]);

    // Build the complete client data object
    const completeClientData = {
      ...newClient.toObject(),
      subscriptionType: clientData.subscriptionType,
      services: roleSubmissions.map(sub => sub.roleType),
      wmmData: { records: wmmData || [] },
      hrgData: { records: hrgData || [] },
      fomData: { records: fomData || [] },
      calData: { records: calData || [] },
      promoData: { records: promoData || [] },
      complimentaryData: { records: complimentaryData || [] }
    };

    // Emit the data update event
    io.emit("data-update", {
      type: "add",
      data: completeClientData,
      timestamp: Date.now()
    });

    res.json({ 
      success: true, 
      client: completeClientData,
      roleResults
    });
  } catch (err) {
    console.error("Error adding client:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { id } = req.params;
    const { clientData, roleType, roleData, isNewRecord, isNewRoleData, recordId } = req.body;
    
    // Get the old client data before update
    const oldClientData = await ClientModel.findOne({ id }).lean();

    if (!oldClientData) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Update base client data
    const updatedClientData = {
      ...clientData,
      editedBy: user.username,
      editedAt: new Date()
        .toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
        .replace(",", ""),
    };

    const updatedClient = await ClientModel.findOneAndUpdate(
      { id },
      updatedClientData,
      { new: true }
    );

    // Log the client update
    await logClientUpdate(req.userId, oldClientData, updatedClient.toObject());

    if (!updatedClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Handle role-specific data update
    let updatedRoleSpecificClient = null;
    const roleModelMap = {
      WMM: WmmModel,
      HRG: HrgModel,
      FOM: FomModel,
      CAL: CalModel
    };

    if (roleType === "WMM") {
      
      if (roleData.isNewSubscription) {
        // Generate new ID for the role-specific model
        const highestIdRoleSpecific = await WmmModel.findOne().sort({ id: -1 });
        const newRoleSpecificId = (highestIdRoleSpecific ? highestIdRoleSpecific.id : 0) + 1;
        
        const newRoleSpecificData = {
          id: newRoleSpecificId,
          clientid: id,
          ...roleData,
          adduser: user.username,
          adddate: roleData.adddate || new Date()
            .toLocaleString("en-US", {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
            .replace(",", ""),
        };
        
        // Create new role-specific record
        updatedRoleSpecificClient = await WmmModel.create(newRoleSpecificData);
      } else if (roleData.id) {
        
        // Check if roleData.id is an ObjectId (string with 24 hex chars) or a numeric id
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(roleData.id);
        
        let query;
        if (isObjectId) {
          query = { _id: roleData.id };
        } else {
          query = { id: Number(roleData.id) };
        }
        
        // Create a clean update object without the id field
        const { id: removedId, _id, ...cleanRoleData } = roleData;
        
        const updatedRoleData = {
          ...cleanRoleData,
          editdate: new Date(),
          edituser: user.username,
        };
        
        updatedRoleSpecificClient = await WmmModel.findOneAndUpdate(
          query,
          updatedRoleData,
          { new: true }
        );
      }
    } else if (roleType && roleModelMap[roleType]) {
      const RoleModel = roleModelMap[roleType];

      if (isNewRecord || isNewRoleData) {
        // If this is a new record, create it
        
        // Generate new ID for the role-specific model
        const highestIdRoleSpecific = await RoleModel.findOne().sort({ id: -1 });
        const newRoleSpecificId = (highestIdRoleSpecific ? highestIdRoleSpecific.id : 0) + 1;
        
        const newRoleSpecificData = {
          id: newRoleSpecificId,
          clientid: id,
          ...roleData,
          adduser: user.username,
          adddate: roleData.adddate || new Date()
            .toLocaleString("en-US", {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
            .replace(",", ""),
        };
        
        // Create new role-specific record
        updatedRoleSpecificClient = await RoleModel.create(newRoleSpecificData);
      } else if (recordId) {
        // If we have a recordId, find and update that specific record
        const updatedRoleData = {
          ...roleData,
          editdate: new Date(),
          edituser: user.username,
        };
        
        // Check if recordId is an ObjectId (string with 24 hex chars) or a numeric id
        // ObjectIds look like: "6818b6211563c24249e1e027"
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(recordId);
        
        let query;
        if (isObjectId) {
          // If it's an ObjectId string, only query by _id
          query = { _id: recordId };
        } else {
          // If it's a numeric id, convert to number and query by id
          query = { id: Number(recordId) };
        }
        
        updatedRoleSpecificClient = await RoleModel.findOneAndUpdate(
          query,
          updatedRoleData,
          { new: true }
        );
      } else {
        // Find existing role-specific data by client ID (legacy behavior)
        const existingRoleData = await RoleModel.findOne({ clientid: id });

        if (existingRoleData) {
          // Update only changed fields
          const updatedRoleData = {};
          for (const [key, value] of Object.entries(roleData)) {
            if (existingRoleData[key] !== value) {
              updatedRoleData[key] = value;
            }
          }

          // Add metadata for the update
          updatedRoleData.editdate = new Date();
          updatedRoleData.edituser = user.username;

          // Update role-specific data
          updatedRoleSpecificClient = await RoleModel.findOneAndUpdate(
            { clientid: id },
            updatedRoleData,
            { new: true }
          );
        } else {
          // If role-specific data doesn't exist, create it
          // Format adddate based on subscription type
          let formattedAddDate;
          if (roleType === "COMP") {
            // For complimentary subscriptions, format as YYYY-MM-DD
            const now = new Date();
            formattedAddDate = now.toISOString().split('T')[0];
          } else {
            // For other types, use the existing format
            formattedAddDate = new Date()
              .toLocaleString("en-US", {
                month: "numeric",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
              .replace(",", "");
          }

          const newRoleSpecificData = {
            clientid: id,
            ...roleData,
            adduser: user.username,
            adddate: formattedAddDate,
          };
          updatedRoleSpecificClient = await RoleModel.create(newRoleSpecificData);
        }
      }
    }

    // Gather all role-specific data after update
    const [wmmData, hrgData, fomData, calData] = await Promise.all([
      WmmModel.find({ clientid: parseInt(id) }).sort({ subsdate: -1 }).lean(),
      HrgModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
      FomModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
      CalModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean()
    ]);
    
    // WebSocket updates
    if (req.io) {
      
      // Get all subscription data for this client
      const [wmmData, hrgData, fomData, calData] = await Promise.all([
        WmmModel.find({ clientid: parseInt(id) }).sort({ subsdate: -1 }).lean(),
        HrgModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
        FomModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
        CalModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean()
      ]);

      // Emit the updated client data with all subscription data
      req.io.emit("data-update", [{
        type: "update",
        data: {
          ...updatedClient.toObject(),
          services: [roleType],
          wmmData: wmmData || [],
          hrgData: hrgData || [],
          fomData: fomData || [],
          calData: calData || []
        }
      }]);

      // Then fetch and emit the filtered data
      const { filter, group, pageSize = 20, page = 1, ...advancedFilterData } = req.query;
      
      // Use the DataService to fetch filtered data
      const results = await dataService.fetchData({
        modelNames: ["WmmModel", "HrgModel", "FomModel", "CalModel"],
        filter,
        page: parseInt(page),
        limit: parseInt(pageSize),
        pageSize: parseInt(pageSize),
        group,
        clientIds: null,
        advancedFilterData
      });

      let { combinedData, clientServices } = results;

      // Merge clientServices into combinedData
      combinedData = combinedData.map((client) => {
        const clientService = clientServices.find(
          (service) => service.clientId === client.id
        );
        return {
          ...client,
          services: clientService ? clientService.services : [],
        };
      });

      // Emit the filtered data update
      req.io.emit("data-update", {
        type: "filter-update",
        data: {
          combinedData,
          updatedClientId: parseInt(id)
        }
      });
    }

    // Include all subscription data in the response
    const responseData = {
      success: true,
      client: updatedClient,
      wmmData: await WmmModel.find({ clientid: parseInt(id) }).sort({ subsdate: -1 }).lean(),
      hrgData: await HrgModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
      fomData: await FomModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean(),
      calData: await CalModel.find({ clientid: parseInt(id) }).sort({ recvdate: -1 }).lean()
    };

    res.json(responseData);
  } catch (err) {
    console.error("\n=== Update Process Failed ===");
    console.error("Error updating client:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    // Get client data before deletion
    const clientToDelete = await ClientModel.findOne({ id }).lean();

    if (!clientToDelete) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Fetch all associated data before deletion for logging purposes
    const [wmmData, hrgData, fomData, calData, promoData, complimentaryData] = await Promise.all([
      WmmModel.find({ clientid: parseInt(id) }).lean(),
      HrgModel.find({ clientid: parseInt(id) }).lean(),
      FomModel.find({ clientid: parseInt(id) }).lean(),
      CalModel.find({ clientid: parseInt(id) }).lean(),
      PromoModel.find({ clientid: parseInt(id) }).lean(),
      ComplimentaryModel.find({ clientid: parseInt(id) }).lean()
    ]);

    // Store complete client data for logging
    const completeClientData = {
      ...clientToDelete,
      wmmData,
      hrgData,
      fomData,
      calData,
      promoData,
      complimentaryData
    };

    // Delete from ClientModel
    const deletedClient = await ClientModel.findOneAndDelete({ id });

    // Log the client deletion with complete data
    await logClientDeletion(req.userId, completeClientData);

    // Delete all associated data from each model
    const deletePromises = [
      WmmModel.deleteMany({ clientid: parseInt(id) }),
      HrgModel.deleteMany({ clientid: parseInt(id) }),
      FomModel.deleteMany({ clientid: parseInt(id) }),
      CalModel.deleteMany({ clientid: parseInt(id) }),
      PromoModel.deleteMany({ clientid: parseInt(id) }),
      ComplimentaryModel.deleteMany({ clientid: parseInt(id) })
    ];

    // Wait for all delete operations to complete
    const deleteResults = await Promise.all(deletePromises);

    // Count total deleted associated records
    const totalAssociatedDeleted = deleteResults.reduce((sum, result) => sum + result.deletedCount, 0);

    // Re-run the filter to get updated filtered data for all clients
    if (io) {
      const { filter, group, pageSize = 20, page = 1, ...advancedFilterData } = req.query;
      
      // Use the DataService to fetch filtered data
      const results = await dataService.fetchData({
        modelNames: ["WmmModel", "HrgModel", "FomModel", "CalModel", "PromoModel", "ComplimentaryModel"],
        filter,
        page: parseInt(page),
        limit: parseInt(pageSize),
        pageSize: parseInt(pageSize),
        group,
        clientIds: null,
        advancedFilterData
      });

      let { combinedData, clientServices } = results;

      // Merge clientServices into combinedData
      combinedData = combinedData.map((client) => {
        const clientService = clientServices.find(
          (service) => service.clientId === client.id
        );
        return {
          ...client,
          services: clientService ? clientService.services : [],
        };
      });

      // Emit both the deletion and updated filtered data
      io.emit("data-update", {
        type: "filter-update",
        data: {
          ...results,
          combinedData,
          deletedClientId: parseInt(id)
        }
      });
    }

    res.json({ 
      success: true,
      message: `Client and ${totalAssociatedDeleted} associated records deleted successfully`
    });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/check-duplicates", verifyToken, async (req, res) => {
  try {
    const { 
      fname, 
      lname, 
      email, 
      cellno, 
      contactnos, 
      bdate, 
      address, 
      standardizedAddress, 
      addressComponents, 
      acode, 
      company,
      priorities
    } = req.body;

    const result = await checkDuplicates({
      fname,
      lname,
      email,
      cellno,
      contactnos,
      bdate,
      address,
      standardizedAddress,
      addressComponents,
      acode,
      company,
      priorities
    });

    res.json(result);
  } catch (err) {
    console.error("Error checking for duplicates:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "An error occurred while checking for duplicates",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the client by ID
    const client = await ClientModel.findOne({ id: parseInt(id) }).lean();

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Determine which role-specific models to query based on user roles
    await req.user.populate({
      path: "roles.role",
      populate: { path: "defaultPermissions" },
    });

    const userRoles = req.user.roles.map((role) => role.role.name);
    

    // Gather data from each role-specific model
    const roleData = {};
    
    // Admin should get data from all models
    const isAdmin = userRoles.includes("Admin");

    // For Admin users, always fetch all role data regardless of other roles
    if (isAdmin) {
      try {
        const wmmData = await WmmModel.find({ clientid: parseInt(id) })
          .sort({ subsdate: -1 })
          .lean();
        roleData.wmmData = wmmData;
        
        const hrgData = await HrgModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.hrgData = hrgData;
        
        const fomData = await FomModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.fomData = fomData;
        
        const calData = await CalModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.calData = calData;
      } catch (error) {
        console.error("Error fetching role data for admin:", error);
      }
    } else {
      // If not admin, fetch data based on user roles
      if (userRoles.includes("WMM")) {
        const wmmData = await WmmModel.find({ clientid: parseInt(id) })
          .sort({ subsdate: -1 })
          .lean();
        roleData.wmmData = wmmData;
      }

      if (userRoles.includes("HRG")) {
        const hrgData = await HrgModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.hrgData = hrgData;
      }

      if (userRoles.includes("FOM")) {
        const fomData = await FomModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.fomData = fomData;
      }

      if (userRoles.includes("CAL")) {
        const calData = await CalModel.find({ clientid: parseInt(id) })
          .sort({ recvdate: -1 })
          .lean();
        roleData.calData = calData;
      }
    }

    // Return combined data
    res.json({
      ...client,
      ...roleData,
    });
  } catch (err) {
    console.error("Error fetching client details:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

router.post(
  "/import-csv",
  verifyToken,
  checkRole(["Admin"]),
  async (req, res) => {
    try {
      const { subscribers, updateExisting = true } = req.body;
      
      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ 
          error: "Invalid request", 
          message: "No valid subscriber data provided" 
        });
      }
      
      // Track results
      const results = {
        success: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        errorDetails: []
      };
      
      // Process each subscriber
      for (let i = 0; i < subscribers.length; i++) {
        const subscriber = subscribers[i];
        
        try {
          // Check if this is a new subscriber or existing one
          const existingSubscriber = subscriber.id ? 
            await ClientModel.findOne({ id: subscriber.id }) : 
            await ClientModel.findOne({ 
              lname: subscriber.lname,
              fname: subscriber.fname,
              address: { $regex: subscriber.address.split('\n')[0], $options: 'i' }
            });
          
          if (existingSubscriber) {
            // Skip if we're not updating existing subscribers
            if (!updateExisting) {
              results.skipped++;
              continue;
            }
            
            // Update existing subscriber
            const subscrId = existingSubscriber.id;
            
            // Update main client record
            await ClientModel.updateOne(
              { id: subscrId },
              { $set: {
                title: subscriber.title || existingSubscriber.title,
                fname: subscriber.fname || existingSubscriber.fname,
                mname: subscriber.mname || existingSubscriber.mname,
                lname: subscriber.lname || existingSubscriber.lname,
                address: subscriber.address || existingSubscriber.address,
                cellno: subscriber.cellno || existingSubscriber.cellno,
                officeno: subscriber.officeno || existingSubscriber.officeno,
                email: subscriber.email || existingSubscriber.email,
                acode: subscriber.acode !== undefined ? subscriber.acode : existingSubscriber.acode
              }}
            );
            
            // Handle service-specific data (WMM)
            if (subscriber.copies || subscriber.enddate || subscriber.subsdate || subscriber.subsclass) {
              // Check for existing WMM subscription
              let wmmSubscription = await WmmModel.findOne({ clientid: subscrId });
              
              if (wmmSubscription) {
                // Update existing WMM subscription
                await WmmModel.updateOne(
                  { clientid: subscrId },
                  { $set: {
                    copies: subscriber.copies || wmmSubscription.copies,
                    enddate: subscriber.enddate || wmmSubscription.enddate,
                    subsdate: subscriber.subsdate || wmmSubscription.subsdate,
                    subsclass: subscriber.subsclass || wmmSubscription.subsclass
                  }}
                );
              } else {
                // Create new WMM subscription
                const newWmmSubscription = new WmmModel({
                  clientid: subscrId,
                  copies: subscriber.copies || 1,
                  enddate: subscriber.enddate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
                  subsdate: subscriber.subsdate || new Date(),
                  subsclass: subscriber.subsclass || "Regular"
                });
                await newWmmSubscription.save();
              }
            }
            
            // Handle HRG data if present
            if (subscriber.hrgData) {
              let hrgSubscription = await HrgModel.findOne({ clientid: subscrId });
              
              if (hrgSubscription) {
                // Update existing
                await HrgModel.updateOne(
                  { clientid: subscrId },
                  { $set: {
                    quantity: subscriber.hrgData.quantity || hrgSubscription.quantity,
                    totalAmount: subscriber.hrgData.totalAmount || hrgSubscription.totalAmount,
                    lastPaymentDate: subscriber.hrgData.lastPaymentDate || hrgSubscription.lastPaymentDate
                  }}
                );
              } else if (subscriber.hrgData.quantity || subscriber.hrgData.totalAmount) {
                // Create new
                const newHrg = new HrgModel({
                  clientid: subscrId,
                  quantity: subscriber.hrgData.quantity || 1,
                  totalAmount: subscriber.hrgData.totalAmount || 0,
                  lastPaymentDate: subscriber.hrgData.lastPaymentDate || new Date()
                });
                await newHrg.save();
              }
            }
            
            // Handle FOM data if present
            if (subscriber.fomData) {
              let fomSubscription = await FomModel.findOne({ clientid: subscrId });
              
              if (fomSubscription) {
                // Update existing
                await FomModel.updateOne(
                  { clientid: subscrId },
                  { $set: {
                    quantity: subscriber.fomData.quantity || fomSubscription.quantity,
                    totalAmount: subscriber.fomData.totalAmount || fomSubscription.totalAmount,
                    lastPaymentDate: subscriber.fomData.lastPaymentDate || fomSubscription.lastPaymentDate
                  }}
                );
              } else if (subscriber.fomData.quantity || subscriber.fomData.totalAmount) {
                // Create new
                const newFom = new FomModel({
                  clientid: subscrId,
                  quantity: subscriber.fomData.quantity || 1,
                  totalAmount: subscriber.fomData.totalAmount || 0,
                  lastPaymentDate: subscriber.fomData.lastPaymentDate || new Date()
                });
                await newFom.save();
              }
            }
            
            // Handle CAL data if present
            if (subscriber.calData) {
              let calSubscription = await CalModel.findOne({ clientid: subscrId });
              
              if (calSubscription) {
                // Update existing
                await CalModel.updateOne(
                  { clientid: subscrId },
                  { $set: {
                    quantity: subscriber.calData.quantity || calSubscription.quantity,
                    totalAmount: subscriber.calData.totalAmount || calSubscription.totalAmount,
                    lastPaymentDate: subscriber.calData.lastPaymentDate || calSubscription.lastPaymentDate
                  }}
                );
              } else if (subscriber.calData.quantity || subscriber.calData.totalAmount) {
                // Create new
                const newCal = new CalModel({
                  clientid: subscrId,
                  quantity: subscriber.calData.quantity || 1,
                  totalAmount: subscriber.calData.totalAmount || 0,
                  lastPaymentDate: subscriber.calData.lastPaymentDate || new Date()
                });
                await newCal.save();
              }
            }
            
            results.updated++;
          } else {
            // Create new subscriber
            
            // Get next available ID
            const lastClient = await ClientModel.findOne().sort({ id: -1 });
            const nextId = lastClient ? lastClient.id + 1 : 1;
            
            // Create client record
            const newClient = new ClientModel({
              id: nextId,
              title: subscriber.title || "",
              fname: subscriber.fname || "",
              mname: subscriber.mname || "",
              lname: subscriber.lname || "",
              address: subscriber.address || "",
              cellno: subscriber.cellno || "",
              officeno: subscriber.officeno || "",
              email: subscriber.email || "",
              acode: subscriber.acode !== undefined ? subscriber.acode : ""
            });
            
            await newClient.save();
            
            // Create WMM subscription if data provided
            if (subscriber.copies || subscriber.enddate || subscriber.subsdate || subscriber.subsclass) {
              const newWmmSubscription = new WmmModel({
                clientid: nextId,
                copies: subscriber.copies || 1,
                enddate: subscriber.enddate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
                subsdate: subscriber.subsdate || new Date(),
                subsclass: subscriber.subsclass || "Regular"
              });
              await newWmmSubscription.save();
            }
            
            // Create HRG subscription if data provided
            if (subscriber.hrgData && (subscriber.hrgData.quantity || subscriber.hrgData.totalAmount)) {
              const newHrg = new HrgModel({
                clientid: nextId,
                quantity: subscriber.hrgData.quantity || 1,
                totalAmount: subscriber.hrgData.totalAmount || 0,
                lastPaymentDate: subscriber.hrgData.lastPaymentDate || new Date()
              });
              await newHrg.save();
            }
            
            // Create FOM subscription if data provided
            if (subscriber.fomData && (subscriber.fomData.quantity || subscriber.fomData.totalAmount)) {
              const newFom = new FomModel({
                clientid: nextId,
                quantity: subscriber.fomData.quantity || 1,
                totalAmount: subscriber.fomData.totalAmount || 0,
                lastPaymentDate: subscriber.fomData.lastPaymentDate || new Date()
              });
              await newFom.save();
            }
            
            // Create CAL subscription if data provided
            if (subscriber.calData && (subscriber.calData.quantity || subscriber.calData.totalAmount)) {
              const newCal = new CalModel({
                clientid: nextId,
                quantity: subscriber.calData.quantity || 1,
                totalAmount: subscriber.calData.totalAmount || 0,
                lastPaymentDate: subscriber.calData.lastPaymentDate || new Date()
              });
              await newCal.save();
            }
            
            results.success++;
          }
        } catch (error) {
          results.errors++;
          results.errorDetails.push({
            row: i + 1,
            message: error.message,
            subscriber: subscriber.id || `${subscriber.lname}, ${subscriber.fname}`
          });
          console.error(`Error processing subscriber at row ${i + 1}:`, error);
        }
      }
      
      // Broadcast update notification through socket.io if available
      if (req.io) {
        req.io.emit("data-update", {
          type: "subscribers-imported",
          count: results.success + results.updated
        });
      }
      
      res.json({
        ...results,
        message: `Import complete: ${results.success} added, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`
      });
    } catch (error) {
      console.error("Error in CSV import:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

router.post(
  "/preview-calendar-update",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    try {
      const { filter = "", group = "", advancedFilterData = {} } = req.body;

      // Get the filter query
      const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Get all matching clients
      const clients = await ClientModel.find(filterQuery).lean();

      // Count clients with WMM records
      let clientsWithWmm = 0;
      for (const client of clients) {
        const hasWmmRecord = await WmmModel.exists({ clientid: client.id });
        if (hasWmmRecord) {
          clientsWithWmm++;
        }
      }

      res.json({
        success: true,
        totalClients: clients.length,
        clientsWithWmm
      });

    } catch (error) {
      console.error("Error getting calendar update preview:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

router.post(
  "/update-calendar",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    const io = req.io;
    try {
      const { filter = "", group = "", advancedFilterData = {}, setCalendarTo, clientIds = [], subscriptionType = "WMM" } = req.body;

      if (setCalendarTo === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "setCalendarTo parameter is required"
        });
      }

      let clients;
      if (clientIds.length > 0) {
        // If specific client IDs are provided, use those
        clients = await ClientModel.find({ id: { $in: clientIds } }).lean();
      } else {
        // Otherwise use the filter query
        const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);
        clients = await ClientModel.find(filterQuery).lean();
      }

      if (!clients || clients.length === 0) {
        return res.json({
          success: true,
          message: "No matching clients found",
          modifiedCount: 0
        });
      }

      let modifiedCount = 0;
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let updatedClientIds = []; // Track successful updates
      let failedClientIds = []; // Track failed updates and skips

      // Determine which model to use based on subscription type
      let SubscriptionModel;
      console.log(subscriptionType);
      switch(subscriptionType) {
        case "Promo":
          SubscriptionModel = PromoModel;
          break;
        case "Complimentary":
          SubscriptionModel = ComplimentaryModel;
          break;
        default:
          SubscriptionModel = WmmModel;
      }

      // Update each client's most recent subscription record
      for (const client of clients) {
        try {
          processedCount++;
          // Find all subscription records for this client
          const subscriptionRecords = await SubscriptionModel.find({ clientid: client.id })
            .sort({ subsdate: -1 })
            .lean();

          if (subscriptionRecords && subscriptionRecords.length > 0) {
            // Get the most recent record
            const mostRecentRecord = subscriptionRecords[0];
            
            // Check if the status is already what we want to set it to
            if (mostRecentRecord.calendar === setCalendarTo) {
              skippedCount++;
              failedClientIds.push({
                id: client.id,
                fname: client.fname,
                lname: client.lname,
                error: "No changes made",
                currentStatus: setCalendarTo
              });
              continue;
            }
            
            // Update the calendar status for the most recent record
            const updateResult = await SubscriptionModel.updateOne(
              { _id: mostRecentRecord._id },
              { 
                $set: { 
                  calendar: setCalendarTo,
                  editdate: new Date(),
                  edituser: req.user.username
                }
              }
            );

            if (updateResult.modifiedCount > 0) {
              modifiedCount++;
              updatedClientIds.push({
                id: client.id,
                fname: client.fname,
                lname: client.lname,
                wmmId: mostRecentRecord._id
              });
            } else {
              skippedCount++;
              failedClientIds.push({
                id: client.id,
                fname: client.fname,
                lname: client.lname,
                error: "Already has status",
                currentStatus: mostRecentRecord.calendar
              });
            }
          } else {
            skippedCount++;
            failedClientIds.push({
              id: client.id,
              fname: client.fname,
              lname: client.lname,
              error: `No ${subscriptionType} record found`
            });
          }
        } catch (err) {
          errorCount++;
          failedClientIds.push({
            id: client.id,
            fname: client.fname,
            lname: client.lname,
            error: err.message || "Unknown error"
          });
          console.error(`Error processing client ID ${client.id}:`, err);
        }
      }

      // Emit socket event for data update
      if (io) {
        io.emit("data-update", {
          type: "bulk-update",
          message: "Calendar status updated for filtered clients"
        });
      }

      res.json({
        success: true,
        message: `Updated calendar status for ${modifiedCount} records`,
        modifiedCount,
        summary: {
          totalClientsFound: clients.length,
          processedCount,
          modifiedCount,
          skippedCount,
          errorCount,
          updatedClientIds,
          failedClientIds
        }
      });

    } catch (error) {
      console.error("Error updating calendar status:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

router.post(
  "/preview-spack-update",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    try {
      const { filter = "", group = "", advancedFilterData = {} } = req.body;

      // Get the filter query
      const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);

      // Get all matching clients
      const clients = await ClientModel.find(filterQuery).lean();

      res.json({
        success: true,
        totalClients: clients.length
      });

    } catch (error) {
      console.error("Error getting spack update preview:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

router.post(
  "/update-spack",
  verifyToken,
  attachSocketId,
  async (req, res) => {
    const io = req.io;
    try {
      const { filter = "", group = "", advancedFilterData = {}, setSpackTo, clientIds = [] } = req.body;

      if (setSpackTo === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "setSpackTo parameter is required"
        });
      }

      let clients;
      if (clientIds.length > 0) {
        // If specific client IDs are provided, use those
        clients = await ClientModel.find({ id: { $in: clientIds } }).lean();
      } else {
        // Otherwise use the filter query
        const filterQuery = await buildFilterQuery(filter, group, advancedFilterData);
        clients = await ClientModel.find(filterQuery).lean();
      }

      if (!clients || clients.length === 0) {
        return res.json({
          success: true,
          message: "No matching clients found",
          modifiedCount: 0
        });
      }

      let modifiedCount = 0;
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let updatedClientIds = []; // Track successful updates
      let failedClientIds = []; // Track failed updates

      // Update each client's spack status
      for (const client of clients) {
        try {
          processedCount++;
          
          // Update the client's spack status
          const updateResult = await ClientModel.updateOne(
            { id: client.id },
            { 
              $set: { 
                spack: setSpackTo,
                editdate: new Date(),
                edituser: req.user.username
              }
            }
          );

          if (updateResult.modifiedCount > 0) {
            modifiedCount++;
            updatedClientIds.push({
              id: client.id,
              name: `${client.lname}, ${client.fname}`
            });
          } else {
            skippedCount++;
            failedClientIds.push({
              id: client.id,
              error: "No changes made"
            });
          }
        } catch (err) {
          errorCount++;
          failedClientIds.push({
            id: client.id,
            error: err.message || "Unknown error"
          });
          console.error(`Error processing client ID ${client.id}:`, err);
        }
      }

      // Emit socket event for data update
      if (io) {
        io.emit("data-update", {
          type: "bulk-update",
          message: "Spack status updated for clients"
        });
      }

      res.json({
        success: true,
        message: `Updated spack status for ${modifiedCount} records`,
        modifiedCount,
        summary: {
          totalClientsFound: clients.length,
          processedCount,
          modifiedCount,
          skippedCount,
          errorCount,
          updatedClientIds,
          failedClientIds
        }
      });

    } catch (error) {
      console.error("Error updating spack status:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message
      });
    }
  }
);

router.get("/test-subscription-data", async (req, res) => {
  try {
    // Test queries for both models
    const promoCount = await PromoModel.countDocuments();
    const complimentaryCount = await ComplimentaryModel.countDocuments();
    
    // Get sample data from each model
    const promoSample = await PromoModel.find().limit(5).lean();
    const complimentarySample = await ComplimentaryModel.find().limit(5).lean();

    // Log the results for debugging
    console.log('Test Route - Promo Count:', promoCount);
    console.log('Test Route - Complimentary Count:', complimentaryCount);
    console.log('Test Route - Promo Sample:', promoSample);
    console.log('Test Route - Complimentary Sample:', complimentarySample);

    res.json({
      promoCount,
      complimentaryCount,
      promoSample,
      complimentarySample,
      message: "Query completed successfully"
    });
  } catch (error) {
    console.error("Error in test subscription data route:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

