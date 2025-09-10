import crypto from "crypto";
import fs from "fs";
import path from "path";
import PrintQueueModel from "../models/printQueue.mjs";
import PrintQueueItemModel from "../models/printQueueItem.mjs";
import ClientModel from "../models/clients.mjs";

// === Simple persistent logger (safe from bloat) ===
const logFile = path.join(process.cwd(), "print-queue.log");

function log(message, data = null) {
  const timestamp = new Date().toISOString();

  // Avoid bloating logs with large arrays or objects
  let safeData = null;
  if (data) {
    safeData = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        safeData[key] = `Array(${value.length})`; // just length
      } else if (typeof value === "object" && value !== null) {
        safeData[key] = "[Object]"; // mark object
      } else {
        safeData[key] = value;
      }
    }
  }

  const line =
    `[${timestamp}] ${message}` +
    (safeData ? ` | ${JSON.stringify(safeData)}` : "");
  fs.appendFileSync(logFile, line + "\n", "utf8");
  console.log(line); // still see it live in terminal
}

function hashFilter(filterObj) {
  const normalized = JSON.stringify(filterObj || {});
  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .slice(0, 16);
}

export async function createQueue({
  name,
  ownerUserId,
  department,
  visibility = "user",
  actionType = "label",
  templateRefId,
  ttlDays = 30,
}) {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const queue = await PrintQueueModel.create({
    name: name || "Untitled Queue",
    ownerUserId,
    department,
    visibility,
    actionType,
    templateRefId,
    expiresAt,
  });
  log("Queue created", { id: queue._id, ownerUserId, department });
  return queue;
}

export async function getQueue(queueId) {
  const queue = await PrintQueueModel.findById(queueId).lean();
  if (!queue) {
    log("Queue not found", { queueId });
    return null;
  }
  const count = await PrintQueueItemModel.countDocuments({ queueId });
  log("Queue fetched", { queueId, count });
  return { ...queue, counts: { total: count } };
}

export async function enqueueSelection({ queueId, clientIds, userId }) {
  const docs = (clientIds || []).map((id) => ({
    queueId,
    clientId: String(id),
    addedBy: userId,
  }));
  if (docs.length === 0) {
    log("Enqueue skipped (no clients)", { queueId, userId });
    return { addedCount: 0, alreadyInQueueCount: 0, duplicatesSample: [] };
  }

  try {
    const result = await PrintQueueItemModel.bulkWrite(
      docs.map((d) => ({ insertOne: { document: d } })),
      { ordered: false }
    );
    const addedCount = result.insertedCount || 0;
    const alreadyInQueueCount = docs.length - addedCount;
    log("Clients enqueued", { queueId, addedCount, alreadyInQueueCount });
    return { addedCount, alreadyInQueueCount, duplicatesSample: [] };
  } catch (e) {
    let addedCount = 0;
    if (e?.result?.insertedCount) {
      addedCount = e.result.insertedCount;
    }
    const alreadyInQueueCount = docs.length - addedCount;
    log("Enqueue error (duplicates likely)", {
      queueId,
      addedCount,
      alreadyInQueueCount,
    });
    return { addedCount, alreadyInQueueCount, duplicatesSample: [] };
  }
}

export async function enqueueByFilter({ queueId, filterPayload, userId }) {
  const signatureHash = hashFilter(filterPayload);
  await PrintQueueModel.findByIdAndUpdate(queueId, {
    $push: {
      sources: {
        sourceType: "filter",
        filterSnapshot: filterPayload,
        filterSignatureHash: signatureHash,
      },
    },
  });

  const query = buildClientQuery(filterPayload);
  const cursor = ClientModel.find(query).select({ id: 1, _id: 0 }).cursor();

  let batch = [];
  let addedCount = 0;
  let total = 0;
  for await (const doc of cursor) {
    total++;
    batch.push({ queueId, clientId: String(doc.id), addedBy: userId });
    if (batch.length >= 1000) {
      const res = await flushBatch(batch);
      addedCount += res.added;
      batch = [];
    }
  }
  if (batch.length) {
    const res = await flushBatch(batch);
    addedCount += res.added;
  }

  const alreadyInQueueCount = total - addedCount;
  log("Enqueue by filter", { queueId, total, addedCount, alreadyInQueueCount });
  return { addedCount, alreadyInQueueCount, totalMatched: total };
}

async function flushBatch(batch) {
  try {
    const result = await PrintQueueItemModel.bulkWrite(
      batch.map((d) => ({ insertOne: { document: d } })),
      { ordered: false }
    );
    return { added: result.insertedCount || 0 };
  } catch (e) {
    return { added: e?.result?.insertedCount || 0 };
  }
}

function buildClientQuery(filterPayload) {
  const { filter, group, advancedFilterData } = filterPayload || {};
  const query = {};
  if (group) query.group = group;
  if (filter?.trim()) {
    const regex = new RegExp(filter.trim(), "i");
    query.$or = [
      { lname: regex },
      { fname: regex },
      { company: regex },
      { address: regex },
      { contactnos: regex },
      { cellno: regex },
      { email: regex },
    ];
  }
  if (advancedFilterData) {
    const {
      startDateYear,
      startDateMonth,
      startDateDay,
      endDateYear,
      endDateMonth,
      endDateDay,
    } = advancedFilterData;
    const hasStart = startDateYear && startDateMonth && startDateDay;
    const hasEnd = endDateYear && endDateMonth && endDateDay;
    if (hasStart || hasEnd) {
      const range = {};
      if (hasStart) {
        const m = String(startDateMonth).padStart(2, "0");
        const d = String(startDateDay).padStart(2, "0");
        range.$gte = `${startDateYear}-${m}-${d}`;
      }
      if (hasEnd) {
        const m = String(endDateMonth).padStart(2, "0");
        const d = String(endDateDay).padStart(2, "0");
        range.$lte = `${endDateYear}-${m}-${d}`;
      }
      query.adddate = range;
    }
  }
  return query;
}

export async function listQueues({ ownerUserId, department }) {
  const q = {
    $or: [{ ownerUserId }, { visibility: "department", department }],
  };
  const queues = await PrintQueueModel.find(q).sort({ updatedAt: -1 }).lean();
  log("Queues listed", { count: queues.length, ownerUserId, department });
  return queues;
}

export async function clearQueue(queueId) {
  await PrintQueueItemModel.deleteMany({ queueId });
  await PrintQueueModel.findByIdAndUpdate(queueId, { status: "completed" });
  log("Queue cleared", { queueId });
  return { success: true };
}

export async function checkPrintHistory(clientIds) {
  try {
    const { default: PrintJobModel } = await import("../models/printJob.mjs");
    const printedJobs = await PrintJobModel.find({
      clientIds: { $in: clientIds },
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    const printedIds = new Set();
    const printHistory = {};
    printedJobs.forEach((job) => {
      job.clientIds.forEach((id) => {
        if (clientIds.includes(id)) {
          printedIds.add(id);
          if (!printHistory[id]) {
            printHistory[id] = {
              lastPrinted: job.completedAt,
              jobId: job._id,
              templateUsed: job.templateRefId,
              printerUsed: job.printerName,
            };
          }
        }
      });
    });

    log("Print history checked", {
      clientIds: clientIds.length,
      printed: printedIds.size,
    });
    return {
      printedIds: Array.from(printedIds),
      printHistory,
      totalPrinted: printedIds.size,
    };
  } catch (error) {
    log("Error checking print history", {
      error: error.message,
      clientIds: clientIds.length,
    });
    return { printedIds: [], printHistory: {}, totalPrinted: 0 };
  }
}

// Record printed items for a queue and append to history
export async function markQueueItemsPrinted({
  queueId,
  clientIds = [],
  userId,
  jobId,
  printerName,
  templateRefId,
  actionType,
}) {
  try {
    if (!queueId || !Array.isArray(clientIds) || clientIds.length === 0) {
      log("markQueueItemsPrinted skipped (invalid input)", {
        queueId,
        clientIds: Array.isArray(clientIds) ? clientIds.length : 0,
      });
      return { updated: 0 };
    }

    const { default: PrintJobModel } = await import("../models/printJob.mjs");

    // Ensure required metadata exists by peeking at the queue if needed
    if (!actionType || !templateRefId) {
      try {
        const { default: PrintQueueModel } = await import(
          "../models/printQueue.mjs"
        );
        const queueDoc = await PrintQueueModel.findById(queueId)
          .select({ actionType: 1, templateRefId: 1 })
          .lean();
        if (queueDoc) {
          actionType = actionType || queueDoc.actionType;
          templateRefId = templateRefId || queueDoc.templateRefId;
        }
      } catch (e) {
        // Non-fatal, will fail at model validation if still missing
      }
    }

    // Upsert a PrintJob record to capture this print action
    const job = await PrintJobModel.create({
      queueId,
      clientIds: clientIds.map((id) => String(id)),
      status: "completed",
      completedAt: new Date(),
      userId,
      jobId,
      printerName,
      templateRefId,
      actionType,
    });

    // Mark queue items as printed for quick duplicate detection
    const updateQuery = {
      queueId,
      clientId: { $in: clientIds.map((id) => String(id)) },
    };

    // Debug: Check what queue items exist
    const existingItems = await PrintQueueItemModel.find(updateQuery).lean();
    log("Found existing queue items", {
      queueId,
      clientIds: clientIds.length,
      foundItems: existingItems.length,
      sampleClientIds: clientIds.slice(0, 3),
    });

    const res = await PrintQueueItemModel.updateMany(updateQuery, {
      $set: { printedAt: new Date(), printedBy: userId, printJobId: job._id },
    });

    log("Queue items marked as printed", {
      queueId,
      count: res?.modifiedCount || 0,
      jobId: job?._id,
    });
    return { updated: res?.modifiedCount || 0, jobId: job?._id };
  } catch (error) {
    log("Error marking queue items as printed", {
      error: error.message,
      queueId,
    });
    throw error;
  }
}
