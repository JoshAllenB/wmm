import express from "express";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { checkRole } from "../users/checkRole.mjs";
import fetchDataServices from "../apiLogic/fetchDataServices.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";
import attachSocketId from "../apiLogic/attachSocketId.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.get(
  "/",
  verifyToken,
  attachSocketId,
  checkRole(["Admin", "HRG", "WMM", "FOM"]),
  async (req, res) => {
    const io = req.io;
    const socketId = req.socketId;
    const { page = 1, pageSize = 20, filter = "", group = "", ...advancedFilterData } = req.query;
    const limit = parseInt(pageSize);

    try {
      await req.user.populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      });
      const userRole = req.user.roles[0]?.role.name || "No Role";

      const modelNames =
        userRole === "Admin"
          ? ["WmmModel", "HrgModel", "FomModel", "CalModel"]
          : [`${userRole}Model`];

      const results = await fetchDataServices(
        modelNames,
        filter,
        page,
        limit,
        pageSize,
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

    // Handle role-specific data
    let roleSpecificClient = null;
    const roleModelMap = {
      WMM: WmmModel,
      HRG: HrgModel,
      FOM: FomModel,
    };

    if (roleType && roleModelMap[roleType]) {
      const RoleModel = roleModelMap[roleType];

      // Generate new ID for the role-specific model
      const highestIdRoleSpecific = await RoleModel.findOne().sort({ id: -1 });
      const newRoleSpecificId =
        (highestIdRoleSpecific ? highestIdRoleSpecific.id : 0) + 1;

      const roleSpecificData = {
        id: newRoleSpecificId, // Use the new ID for the role-specific data
        clientid: newClientId, // Use the client's ID as the clientid
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
        services: [], // Initialize with empty services
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
    const { clientData, roleType, roleData } = req.body;

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
    };

    if (roleType && roleModelMap[roleType]) {
      const RoleModel = roleModelMap[roleType];

      // Find existing role-specific data
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

export default router;
