import express from "express";
import http from "http";
import { Server } from "socket.io";
import initWebSocket from "../../websocket.mjs";
import ClientModel from "../../models/clients.mjs";
import verifyToken from "../../userAuth/verifyToken.mjs";
import UserModel from "../../models/userControl/users.mjs";
import { checkRole } from "../users/checkRole.mjs";
import fetchClientServices from "../apiLogic/fetchClientServices.mjs";
import fetchData from "../apiLogic/fetchData.mjs";
import WmmModel from "../../models/wmm.mjs";
import HrgModel from "../../models/hrg.mjs";
import FomModel from "../../models/fom.mjs";

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

const router = express.Router();
initWebSocket(io);

router.get(
  "/",
  verifyToken,
  checkRole(["Admin", "HRG", "WMM", "FOM"]),
  async (req, res) => {
    const io = req.io;
    const { page = 1, pageSize = 20, filter = "" } = req.query;
    const limit = parseInt(pageSize);
    try {
      await req.user.populate({
        path: "roles.role",
        populate: { path: "defaultPermissions" },
      });
      const userRole = req.user.roles[0]?.role.name || "No Role";
      let totalPages, combinedData, totalCopies, pageSpecificCopies;

      if (userRole === "Admin") {
        const results = await Promise.all([
          fetchData("WmmModel", filter, page, limit, pageSize),
          fetchData("HrgModel", filter, page, limit, pageSize),
          fetchData("FomModel", filter, page, limit, pageSize),
          fetchData("CalModel", filter, page, limit, pageSize),
        ]);

        combinedData = results.flatMap((result) => result.combinedData);
        totalPages = Math.max(...results.map((result) => result.totalPages));
        totalCopies = results.reduce(
          (acc, result) => acc + (result.totalCopies || 0),
          0
        );
        pageSpecificCopies = results.reduce(
          (acc, result) => acc + (result.pageSpecificCopies || 0),
          0
        );
      } else if (userRole === "HRG") {
        const result = await Promise.all([
          fetchData("HrgModel", filter, page, limit, pageSize),
          fetchData("FomModel", filter, page, limit, pageSize),
          fetchData("CalModel", filter, page, limit, pageSize),
        ]);
        combinedData = result.flatMap((result) => result.combinedData);
        totalPages = Math.max(...result.map((result) => result.totalPages));
        totalCopies = result.reduce(
          (acc, result) => acc + (result.totalCopies || 0),
          0
        );
        pageSpecificCopies = result.reduce(
          (acc, result) => acc + (result.pageSpecificCopies || 0),
          0
        );
      } else {
        const modelName = `${userRole}Model`;
        ({ totalPages, combinedData, totalCopies, pageSpecificCopies } =
          await fetchData(
            modelName,
            filter,
            parseInt(page),
            parseInt(limit),
            parseInt(pageSize)
          ));
      }

      const clientIds = combinedData.map((client) => client.id);
      const clientServices = await fetchClientServices(clientIds);

      combinedData = combinedData.map((client) => {
        const serviceInfo = clientServices.find(
          (cs) => cs.clientId === client.id
        );
        return {
          ...client,
          services: serviceInfo ? serviceInfo.services : [],
        };
      });

      console.log("TotalCopies:", totalCopies);
      io.emit("data-update", { type: "init", data: combinedData });
      res.json({ totalPages, combinedData, totalCopies, pageSpecificCopies });
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
  try {
    const { clientData, roleType, roleData } = req.body;
    const user = await UserModel.findById(req.userId).populate("roles.role");

    console.log("Received client data:", clientData);
    console.log("Role type:", roleType);
    console.log("Role data:", roleData);

    // Generate new client ID
    const highestIdClient = await ClientModel.findOne().sort({ id: -1 });
    const newClientId = (highestIdClient ? highestIdClient.id : 0) + 1;

    // Create base client
    const baseClientData = {
      id: newClientId,
      ...clientData,
      metadata: {
        addedBy: user.username,
        addedAt: new Date(),
        editedBy: null,
        editedAt: null,
      },
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
        adddate: new Date(),
        adduser: user.username,
      };

      // Insert role-specific data
      roleSpecificClient = await RoleModel.create(roleSpecificData);
    }

    res.json({
      success: true,
      client: newClient,
      roleSpecificClient: roleSpecificClient || null,
    });
  } catch (err) {
    console.error("Error adding client:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: err.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
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
      metadata: {
        ...clientData.metadata,
        editedBy: user.username,
        editedAt: new Date(),
      },
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
          adddate: new Date(),
          adduser: user.username,
        };
        updatedRoleSpecificClient = await RoleModel.create(newRoleSpecificData);
      }
    }

    // Emit socket event for real-time updates
    io.emit("data-update", {
      type: "update",
      data: {
        client: updatedClient,
        roleSpecificClient: updatedRoleSpecificClient,
      },
    });

    res.json({
      success: true,
      client: updatedClient,
      roleSpecificClient: updatedRoleSpecificClient,
    });
  } catch (err) {
    console.error("Error updating client:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: err.message });
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
    io.emit("data-update", { type: "delete", data: { id } });

    res.json({
      message: "Client and associated role-specific data deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting client:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", message: err.message });
  }
});

export default router;
