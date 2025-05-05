import express from "express";
import ClientModel from "../../models/clients.mjs";
import { verifyToken } from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { checkRole } from "../users/checkRole.mjs";
import fetchDataServices from "../apiLogic/fetchDataServices.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import CalModel from "../../models/cal.mjs";
import attachSocketId from "../apiLogic/attachSocketId.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Address standardization utility function
const standardizeAddress = (address) => {
  if (!address || typeof address !== 'string') return '';
  
  return address
    .toUpperCase()
    // Standardize common street abbreviations
    .replace(/\bST\b|\bSTREET\b/gi, "STREET")
    .replace(/\bAVE\b|\bAVENUE\b/gi, "AVENUE")
    .replace(/\bRD\b|\bROAD\b/gi, "ROAD")
    .replace(/\bBLVD\b|\bBOULEVARD\b/gi, "BOULEVARD")
    .replace(/\bLN\b|\bLANE\b/gi, "LANE")
    .replace(/\bDR\b|\bDRIVE\b/gi, "DRIVE")
    .replace(/\bCT\b|\bCOURT\b/gi, "COURT")
    .replace(/\bPL\b|\bPLACE\b/gi, "PLACE")
    .replace(/\bSQ\b|\bSQUARE\b/gi, "SQUARE")
    .replace(/\bCIR\b|\bCIRCLE\b/gi, "CIRCLE")
    .replace(/\bPKWY\b|\bPARKWAY\b/gi, "PARKWAY")
    .replace(/\bHWY\b|\bHIGHWAY\b/gi, "HIGHWAY")
    // Remove apartment/unit numbers
    .replace(/\bAPT\b.*\d+|\bUNIT\b.*\d+|\bNO\b\.?\s*\d+|\bSUITE\b.*\d+/gi, "")
    .replace(/\b(APARTMENT|SUITE|UNIT|ROOM)\b\s*(\w|\d)+/gi, "")
    // Remove common punctuation and standardize spacing
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

// Extract address tokens for partial matching
const getAddressTokens = (address) => {
  if (!address || typeof address !== 'string') return [];
  
  const standardized = standardizeAddress(address);
  
  // Split by spaces and filter out short words and numbers-only tokens
  return standardized
    .split(/\s+/)
    .filter(token => 
      token.length > 3 && // Only tokens with more than 3 characters
      !/^\d+$/.test(token) && // Exclude tokens that are just numbers
      !['STREET', 'AVENUE', 'ROAD', 'BOULEVARD', 'LANE', 'DRIVE', 'THE', 'AND'].includes(token) // Exclude common words
    );
};

router.get(
  "/",
  verifyToken,
  attachSocketId,
  checkRole(["Admin", "HRG", "WMM", "FOM", "CAL"]),
  async (req, res) => {
    const io = req.io;
    const socketId = req.socketId;
    const {
      page = 1,
      pageSize = 20,
      filter = "",
      group = "",
      ...advancedFilterData
    } = req.query;
    
    // Ensure page and pageSize are valid integers with fallbacks
    const parsedPage = parseInt(page, 10);
    const parsedPageSize = parseInt(pageSize, 10);
    
    // Use fallback values if parsing results in NaN
    const validPage = isNaN(parsedPage) ? 1 : parsedPage;
    const validPageSize = isNaN(parsedPageSize) ? 20 : parsedPageSize;

    try {
      await req.user.populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      });

      // Log the roles being received
      const userRoles = req.user.roles.map((role) => role.role.name);

      // Determine model names based on all roles
      const modelNames = userRoles.includes("Admin")
        ? ["WmmModel", "HrgModel", "FomModel", "CalModel"]
        : userRoles.map((role) => `${role}Model`);

      const results = await fetchDataServices(
        modelNames,
        filter,
        validPage,
        validPageSize,
        validPageSize, // Pass validPageSize as pageSize
        group,
        null,
        advancedFilterData
      );

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

      const {
        totalPages,
        totalCopies,
        pageSpecificCopies,
        totalCalQty,
        totalCalAmt,
        pageSpecificCalQty,
        pageSpecificCalAmt,
        totalHrgAmt,
        totalFomAmt,
        totalCalPaymtAmt,
        pageSpecificHrgAmt,
        pageSpecificFomAmt,
        pageSpecificCalPaymtAmt,
        totalClients,
        pageSpecificClients
      } = results;

      if (socketId && io) {
        io.to(socketId).emit("data-update", {
          type: "init",
          data: combinedData,
        });
      }

      res.json({
        totalPages,
        combinedData,
        totalCopies,
        pageSpecificCopies,
        totalCalQty,
        totalCalAmt,
        pageSpecificCalQty,
        pageSpecificCalAmt,
        totalHrgAmt,
        totalFomAmt,
        totalCalPaymtAmt,
        pageSpecificHrgAmt,
        pageSpecificFomAmt,
        pageSpecificCalPaymtAmt,
        totalClients,
        pageSpecificClients,
        clientServices,
      });
    } catch (err) {
      console.error("Error in client GET route:", err);
      res.status(500).json({
        error: "Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
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
    const { clientData, roleType, roleData } = req.body;

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

    let roleSpecificClient = null;
    const roleModelMap = {
      WMM: WmmModel,
      HRG: HrgModel,
      FOM: FomModel,
      CAL: CalModel,
    };

    if (roleType && roleModelMap[roleType]) {
      const RoleModel = roleModelMap[roleType];

      // Generate new ID for the role-specific model
      const highestIdRoleSpecific = await RoleModel.findOne().sort({ id: -1 });
      const newRoleSpecificId =
        (highestIdRoleSpecific ? highestIdRoleSpecific.id : 0) + 1;

      const roleSpecificData = {
        id: newRoleSpecificId,
        clientid: newClientId,
        ...roleData,
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

      // Insert role-specific data
      roleSpecificClient = await RoleModel.create(roleSpecificData);
    }

    io.emit("data-update", {
      type: "add",
      data: {
        ...newClient.toObject(),
        services: [],
      },
    });

    res.json({ success: true, client: newClient });
  } catch (err) {
    console.error("Error adding client:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/update/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const user = await UserModel.findById(req.userId).select("username");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { id } = req.params;
    const { clientData, roleType, roleData, isNewRecord, isNewRoleData, recordId } = req.body;

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

    if (roleType === "WMM" && req.body.subscriptionId) {
      const subscriptionId = req.body.subscriptionId;
      
      // Check if subscriptionId is an ObjectId (string with 24 hex chars) or a numeric id
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(subscriptionId);
      
      let query;
      if (isObjectId) {
        // If it's an ObjectId string, only query by _id
        query = { _id: subscriptionId };
      } else {
        // If it's a numeric id, convert to number and query by id
        query = { id: Number(subscriptionId) };
      }
      
      // Update the specific subscription record
      const updatedSubscription = await WmmModel.findOneAndUpdate(
        query,
        {
          ...roleData,
          editdate: new Date(),
          edituser: user.username,
        },
        { new: true }
      );
      
      if (updatedSubscription) {
        updatedRoleSpecificClient = updatedSubscription;
      } else {
        console.error(`Could not find subscription with id ${subscriptionId}`);
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
          const newRoleSpecificData = {
            clientid: id,
            ...roleData,
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
          updatedRoleSpecificClient = await RoleModel.create(newRoleSpecificData);
        }
      }
    }

    // Emit socket event for real-time updates
    io.emit("data-update", {
      type: "update",
      data: updatedClient,
    });

    res.json({ success: true, client: updatedClient });
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete/:id", verifyToken, async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;

    // Delete from ClientModel
    const deletedClient = await ClientModel.findOneAndDelete({ id });

    if (!deletedClient) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Determine which role-specific model to delete from
    const roleModelMap = {
      WMM: WmmModel,
      HRG: HrgModel,
      FOM: FomModel,
      CAL: CalModel,
    };

    // Attempt to delete from each role-specific model
    const deletePromises = Object.values(roleModelMap).map((RoleModel) =>
      RoleModel.findOneAndDelete({ clientid: id })
    );

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    // Emit socket event for real-time updates
    io.emit("data-update", {
      type: "delete",
      data: { id: parseInt(id) },
    });

    res.json({ success: true });
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
      company 
    } = req.body;

    // Track if we have any significant data to search with
    let hasSearchableData = false;

    // Build a query to find potential duplicates
    const query = { $or: [] };

    // Create a scoring pipeline for prioritizing matches
    const scoringPipeline = [];

    // Last name-based matching (highest priority)
    if (lname && lname.length > 1) {
      query.$or.push({ lname: { $regex: new RegExp(lname, "i") } });
      // Also check if last name appears in company name
      query.$or.push({ company: { $regex: new RegExp(lname, "i") } });
      
      // Add scoring for last name matches
      scoringPipeline.push({
        $addFields: {
          lnameMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$lname", null] },
                  { $ne: ["$lname", undefined] },
                  { $eq: [{ $type: "$lname" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$lname",
                      regex: new RegExp(lname, "i"),
                    },
                  },
                ],
              },
              8, // High score for last name match (reduced from 10)
              0,
            ],
          },
        },
      });
      
      // Add scoring for last name in company match
      scoringPipeline.push({
        $addFields: {
          lnameInCompanyMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$company", null] },
                  { $ne: ["$company", undefined] },
                  { $eq: [{ $type: "$company" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$company",
                      regex: new RegExp(lname, "i"),
                    },
                  },
                ],
              },
              4, // Medium score for last name in company match (reduced from 6)
              0,
            ],
          },
        },
      });
      
      hasSearchableData = true;
    }

    // Company name matching (high priority)
    if (company && company.length > 2) {
      query.$or.push({ company: { $regex: new RegExp(company, "i") } });
      // Add scoring for company name matches
      scoringPipeline.push({
        $addFields: {
          companyMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$company", null] },
                  { $ne: ["$company", undefined] },
                  { $eq: [{ $type: "$company" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$company",
                      regex: new RegExp(company, "i"),
                    },
                  },
                ],
              },
              7, // Score for company match (reduced from 8)
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    if (fname && fname.length > 1) {
      query.$or.push({ fname: { $regex: new RegExp(fname, "i") } });
      // Also check if first name appears in company name
      query.$or.push({ company: { $regex: new RegExp(fname, "i") } });

      scoringPipeline.push({
        $addFields: {
          fnameMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$fname", null] },
                  { $ne: ["$fname", null] },
                  { $eq: [{ $type: "$fname" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$fname",
                      regex: new RegExp(fname, "i"),
                    },
                  },
                ],
              },
              8, // Score for first name match (unchanged)
              0,
            ],
          },
        },
      });
      
      // Add scoring for first name in company match
      scoringPipeline.push({
        $addFields: {
          fnameInCompanyMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$company", null] },
                  { $ne: ["$company", undefined] },
                  { $eq: [{ $type: "$company" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$company",
                      regex: new RegExp(fname, "i"),
                    },
                  },
                ],
              },
              4, // Score for first name in company match (reduced from 5)
              0,
            ],
          },
        },
      });
      
      hasSearchableData = true;
    }

    // Address matching with standardization
    // Use the standardized address if provided by the client, otherwise standardize it here
    const clientStandardizedAddress = standardizedAddress || (address ? standardizeAddress(address) : '');
    const addressTokens = getAddressTokens(address);
    
    if (clientStandardizedAddress && clientStandardizedAddress.length > 2) {
      try {
        // Add standardized full address for better matching - use direct regex instead of $function
        query.$or.push({
          address: { $regex: new RegExp(clientStandardizedAddress, "i") }
        });
        
        // For each significant token, create a query
        addressTokens.forEach((token) => {
          if (token && token.length > 3) {
            query.$or.push({
              address: { $regex: new RegExp(token, "i") }
            });
          }
        });

        // Add address component-based matching if address components provided
        if (addressComponents) {
          // Match on specific address components for more precise matching
          if (addressComponents.street1 && addressComponents.street1.length > 3) {
            query.$or.push({ address: { $regex: new RegExp(addressComponents.street1, "i") } });
          }
          
          if (addressComponents.barangay && addressComponents.barangay.length > 2) {
            query.$or.push({ address: { $regex: new RegExp(addressComponents.barangay, "i") } });
            query.$or.push({ barangay: { $regex: new RegExp(addressComponents.barangay, "i") } });
          }
          
          if (addressComponents.city && addressComponents.city.length > 2) {
            query.$or.push({ address: { $regex: new RegExp(addressComponents.city.replace(/^City of\s+/i, ""), "i") } });
            query.$or.push({ city: { $regex: new RegExp(addressComponents.city.replace(/^City of\s+/i, ""), "i") } });
          }
          
          if (addressComponents.province && addressComponents.province.length > 2) {
            query.$or.push({ address: { $regex: new RegExp(addressComponents.province, "i") } });
            query.$or.push({ province: { $regex: new RegExp(addressComponents.province, "i") } });
          }
        }

        // Add scoring for address matches using direct field comparison
        // Instead of standardizing in the database, score based on presence of tokens
        
        // Score for exact address match
        scoringPipeline.push({
          $addFields: {
            addressExactMatch: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$address", null] },
                    { $ne: ["$address", ""] },
                    { $eq: [{ $type: "$address" }, "string"] },
                    {
                      $regexMatch: {
                        input: "$address",
                        regex: new RegExp(clientStandardizedAddress, "i"),
                      },
                    },
                  ],
                },
                7, // Score for exact address match (reduced from 10)
                0,
              ],
            },
          },
        });
        
        // Add token-based scoring
        if (addressTokens.length > 0) {
          const tokenScoring = addressTokens.map((token, index) => ({
            $cond: [
              {
                $and: [
                  { $ne: ["$address", null] },
                  { $ne: ["$address", ""] },
                  { $eq: [{ $type: "$address" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$address",
                      regex: new RegExp(token, "i"),
                    },
                  },
                ],
              },
              Math.max(8 - index, 3), // Increased score for token matches
              0,
            ],
          }));
          
          scoringPipeline.push({
            $addFields: {
              addressTokenMatch: { $sum: tokenScoring },
            },
          });
        }
        
        // Add component-based scoring if address components provided
        if (addressComponents) {
          const componentScoring = [];
          
          if (addressComponents.street1 && addressComponents.street1.length > 3) {
            componentScoring.push({
              $cond: [
                {
                  $and: [
                    { $ne: ["$address", null] },
                    { $ne: ["$address", ""] },
                    { $eq: [{ $type: "$address" }, "string"] },
                    {
                      $regexMatch: {
                        input: "$address",
                        regex: new RegExp(addressComponents.street1, "i"),
                      },
                    },
                  ],
                },
                9, // Increased score for street match
                0,
              ],
            });
          }
          
          if (addressComponents.barangay && addressComponents.barangay.length > 2) {
            componentScoring.push({
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $ne: ["$address", null] },
                        { $ne: ["$address", ""] },
                        { $eq: [{ $type: "$address" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$address",
                            regex: new RegExp(addressComponents.barangay, "i"),
                          },
                        },
                      ],
                    },
                    {
                      $and: [
                        { $ne: ["$barangay", null] },
                        { $ne: ["$barangay", ""] },
                        { $eq: [{ $type: "$barangay" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$barangay",
                            regex: new RegExp(addressComponents.barangay, "i"),
                          },
                        },
                      ],
                    },
                  ],
                },
                5, // Medium score for barangay match
                0,
              ],
            });
          }
          
          if (addressComponents.city && addressComponents.city.length > 2) {
            const cityNoPrefix = addressComponents.city.replace(/^City of\s+/i, "");
            componentScoring.push({
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $ne: ["$address", null] },
                        { $ne: ["$address", ""] },
                        { $eq: [{ $type: "$address" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$address",
                            regex: new RegExp(cityNoPrefix, "i"),
                          },
                        },
                      ],
                    },
                    {
                      $and: [
                        { $ne: ["$city", null] },
                        { $ne: ["$city", ""] },
                        { $eq: [{ $type: "$city" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$city",
                            regex: new RegExp(cityNoPrefix, "i"),
                          },
                        },
                      ],
                    },
                  ],
                },
                5, // Medium score for city match
                0,
              ],
            });
          }
          
          if (addressComponents.province && addressComponents.province.length > 2) {
            componentScoring.push({
              $cond: [
                {
                  $or: [
                    {
                      $and: [
                        { $ne: ["$address", null] },
                        { $ne: ["$address", ""] },
                        { $eq: [{ $type: "$address" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$address",
                            regex: new RegExp(addressComponents.province, "i"),
                          },
                        },
                      ],
                    },
                    {
                      $and: [
                        { $ne: ["$province", null] },
                        { $ne: ["$province", ""] },
                        { $eq: [{ $type: "$province" }, "string"] },
                        {
                          $regexMatch: {
                            input: "$province",
                            regex: new RegExp(addressComponents.province, "i"),
                          },
                        },
                      ],
                    },
                  ],
                },
                4, // Medium score for province match
                0,
              ],
            });
          }
          
          if (componentScoring.length > 0) {
            scoringPipeline.push({
              $addFields: {
                addressComponentMatch: { $sum: componentScoring },
              },
            });
          }
        }
        
        hasSearchableData = true;
      } catch (error) {
        console.error("Error processing address:", error);
        // Continue with the query even if address processing fails
      }
    }

    // Contact-based matching (third priority)
    if (email && email.includes("@")) {
      query.$or.push({ email: { $regex: new RegExp(email, "i") } });
      scoringPipeline.push({
        $addFields: {
          emailMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$email", null] },
                  { $ne: ["$email", undefined] },
                  { $eq: [{ $type: "$email" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$email",
                      regex: new RegExp(email, "i"),
                    },
                  },
                ],
              },
              8, // Increased score for email match (was 3)
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    if (cellno && cellno.length > 3) {
      query.$or.push({ cellno: { $regex: cellno } });
      scoringPipeline.push({
        $addFields: {
          cellnoMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$cellno", null] },
                  { $ne: ["$cellno", undefined] },
                  { $eq: [{ $type: "$cellno" }, "string"] },
                  { $regexMatch: { input: "$cellno", regex: cellno } },
                ],
              },
              8, // Increased score for cell number match (was 3)
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    if (contactnos && contactnos.length > 3) {
      query.$or.push({ contactnos: { $regex: contactnos } });
      scoringPipeline.push({
        $addFields: {
          contactnosMatch: {
            $cond: [
              {
                $and: [
                  { $ne: ["$contactnos", null] },
                  { $ne: ["$contactnos", undefined] },
                  { $eq: [{ $type: "$contactnos" }, "string"] },
                  { $regexMatch: { input: "$contactnos", regex: contactnos } },
                ],
              },
              7, // Increased score for contact numbers match (was 3)
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    // Birthdate matching
    if (bdate) {
      query.$or.push({ bdate: bdate });
      scoringPipeline.push({
        $addFields: {
          bdateMatch: {
            $cond: [
              { $eq: ["$bdate", bdate] },
              10, // Increased score for exact birthdate match (was 4)
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    // Area code matching
    if (acode) {
      query.$or.push({ acode: acode });
      scoringPipeline.push({
        $addFields: {
          acodeMatch: {
            $cond: [
              { $eq: ["$acode", acode] },
              2, // Lower score for acode match
              0,
            ],
          },
        },
      });
      hasSearchableData = true;
    }

    // If we don't have enough criteria, don't bother searching
    if (!hasSearchableData) {
      return res.json({ matches: [] });
    }

    // Create the aggregation pipeline
    const pipeline = [
      { $match: query },
      {
        $project: {
          id: 1,
          lname: 1,
          fname: 1,
          mname: 1,
          sname: 1,
          bdate: 1,
          company: 1,
          address: 1,
          street: 1,
          city: 1,
          barangay: 1,
          zipcode: 1,
          area: 1,
          acode: 1,
          contactnos: 1,
          cellno: 1,
          ofcno: 1,
          email: 1,
          province: 1, // Add province field if used in your schema
        },
      },
    ];

    // Add scoring pipeline stages
    pipeline.push(...scoringPipeline);

    // Calculate total score from all match fields
    pipeline.push({
      $addFields: {
        totalScore: {
          $sum: [
            { $ifNull: ["$fnameMatch", 0] },
            { $ifNull: ["$lnameMatch", 0] },
            { $ifNull: ["$fnameInCompanyMatch", 0] },
            { $ifNull: ["$lnameInCompanyMatch", 0] },
            { $ifNull: ["$companyMatch", 0] },
            { $ifNull: ["$addressExactMatch", 0] },
            { $ifNull: ["$addressTokenMatch", 0] },
            { $ifNull: ["$addressComponentMatch", 0] },
            { $ifNull: ["$emailMatch", 0] },
            { $ifNull: ["$cellnoMatch", 0] },
            { $ifNull: ["$contactnosMatch", 0] },
            { $ifNull: ["$bdateMatch", 0] },
            { $ifNull: ["$acodeMatch", 0] },
          ],
        },
      },
    });

    // Sort by score (highest first)
    pipeline.push({ $sort: { totalScore: -1 } });

    // Limit results (use a more conservative limit under load)
    pipeline.push({ $limit: 15 });

    let clients = [];
    try {
      // Set operation timeout and limit batch size for better performance under load
      const options = {
        maxTimeMS: 5000, // 5 second timeout
        allowDiskUse: true, // Allow using disk for large operations
      };

      // Execute the aggregation pipeline with timeout
      clients = await ClientModel.aggregate(pipeline, options);
    } catch (dbError) {
      console.error("Database error during client search:", dbError);
      // Return empty results rather than failing
      return res.json({
        matches: [],
        error:
          "Search operation timed out, please try with more specific criteria.",
      });
    }

    // If we have matches, check which services each client has
    let clientsWithServices = [...clients];

    if (clients.length > 0) {
      try {
        // Get client IDs for service lookup
        const clientIds = clients
          .map((client) => parseInt(client.id))
          .filter((id) => !isNaN(id));

        if (clientIds.length > 0) {
          // Import service models
          const serviceModels = await Promise.all([
            import("../../models/wmm.mjs")
              .then((m) => m.default)
              .catch(() => null),
            import("../../models/hrg.mjs")
              .then((m) => m.default)
              .catch(() => null),
            import("../../models/fom.mjs")
              .then((m) => m.default)
              .catch(() => null),
            import("../../models/cal.mjs")
              .then((m) => m.default)
              .catch(() => null),
          ]);

          const [WmmModel, HrgModel, FomModel, CalModel] = serviceModels.filter(
            (model) => model !== null
          );

          // Use Promise.all with timeouts to prevent hanging
          const servicePromises = [];

          if (WmmModel) {
            const wmmPromise = WmmModel.distinct("clientid", {
              clientid: { $in: clientIds },
            })
              .maxTimeMS(2000) // 2 second timeout
              .exec()
              .catch((err) => {
                console.error("Error fetching WMM services:", err);
                return [];
              });
            servicePromises.push(wmmPromise);
          } else {
            servicePromises.push(Promise.resolve([]));
          }

          if (HrgModel) {
            const hrgPromise = HrgModel.distinct("clientid", {
              clientid: { $in: clientIds },
            })
              .maxTimeMS(2000)
              .exec()
              .catch((err) => {
                console.error("Error fetching HRG services:", err);
                return [];
              });
            servicePromises.push(hrgPromise);
          } else {
            servicePromises.push(Promise.resolve([]));
          }

          if (FomModel) {
            const fomPromise = FomModel.distinct("clientid", {
              clientid: { $in: clientIds },
            })
              .maxTimeMS(2000)
              .exec()
              .catch((err) => {
                console.error("Error fetching FOM services:", err);
                return [];
              });
            servicePromises.push(fomPromise);
          } else {
            servicePromises.push(Promise.resolve([]));
          }

          if (CalModel) {
            const calPromise = CalModel.distinct("clientid", {
              clientid: { $in: clientIds },
            })
              .maxTimeMS(2000)
              .exec()
              .catch((err) => {
                console.error("Error fetching CAL services:", err);
                return [];
              });
            servicePromises.push(calPromise);
          } else {
            servicePromises.push(Promise.resolve([]));
          }

          // Wait for all service queries with a timeout
          const serviceResults = await Promise.allSettled(servicePromises);
          const [
            wmmClientsResult,
            hrgClientsResult,
            fomClientsResult,
            calClientsResult,
          ] = serviceResults;

          // Extract client IDs from successful promises
          const wmmClients =
            wmmClientsResult.status === "fulfilled"
              ? wmmClientsResult.value
              : [];
          const hrgClients =
            hrgClientsResult.status === "fulfilled"
              ? hrgClientsResult.value
              : [];
          const fomClients =
            fomClientsResult.status === "fulfilled"
              ? fomClientsResult.value
              : [];
          const calClients =
            calClientsResult.status === "fulfilled"
              ? calClientsResult.value
              : [];

          // Add service information to each client
          clientsWithServices = clients.map((client) => {
            const clientId = parseInt(client.id);
            const clientCopy = { ...client, services: [] };

            if (!isNaN(clientId)) {
              if (wmmClients.includes(clientId))
                clientCopy.services.push("WMM");
              if (hrgClients.includes(clientId))
                clientCopy.services.push("HRG");
              if (fomClients.includes(clientId))
                clientCopy.services.push("FOM");
              if (calClients.includes(clientId))
                clientCopy.services.push("CAL");
            }

            return clientCopy;
          });
        }
      } catch (serviceError) {
        console.error("Error fetching client services:", serviceError);
        // Continue with clients without service information
      }
    }

    res.json({ matches: clientsWithServices });
  } catch (err) {
    console.error("Error checking for duplicates:", err);
    // Send a more informative error message
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

    if (userRoles.includes("Admin") || userRoles.includes("WMM")) {
      const wmmData = await WmmModel.find({ clientid: parseInt(id) })
        .sort({ subsdate: -1 })
        .lean();
      roleData.wmmData = wmmData;
    }

    if (userRoles.includes("Admin") || userRoles.includes("HRG")) {
      const hrgData = await HrgModel.find({ clientid: parseInt(id) })
        .sort({ recvdate: -1 })
        .lean();
      roleData.hrgData = hrgData;
    }

    if (userRoles.includes("Admin") || userRoles.includes("FOM")) {
      const fomData = await FomModel.find({ clientid: parseInt(id) })
        .sort({ recvdate: -1 })
        .lean();
      roleData.fomData = fomData;
    }

    if (userRoles.includes("Admin") || userRoles.includes("CAL")) {
      const calData = await CalModel.find({ clientid: parseInt(id) })
        .sort({ recvdate: -1 })
        .lean();
      roleData.calData = calData;
    }

    // Return combined data
    res.json({
      ...client,
      ...roleData,
    });
  } catch (err) {
    console.error("Error fetching client details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

