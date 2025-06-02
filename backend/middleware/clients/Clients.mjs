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

dotenv.config();

const router = express.Router();

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

      // Use the new DataService to fetch data
      const results = await dataService.fetchData({
        modelNames,
        filter,
        page: validPage,
        limit: validPageSize,
        pageSize: validPageSize,
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

      // Send response
      res.json({
        ...results,
        combinedData,
      });

      // Emit socket event if needed
      if (io && socketId) {
        io.to(socketId).emit("dataFetched", {
          message: "Data fetched successfully",
          timestamp: new Date(),
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

    // Log the client creation
    await logClientCreation(req.userId, newClient.toObject());

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

    // Get client data before deletion
    const clientToDelete = await ClientModel.findOne({ id }).lean();

    if (!clientToDelete) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Delete from ClientModel
    const deletedClient = await ClientModel.findOneAndDelete({ id });

    // Log the client deletion
    await logClientDeletion(req.userId, clientToDelete);

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

export default router;

