import crypto from "crypto";
import PrintQueueModel from "../models/printQueue.mjs";
import PrintQueueItemModel from "../models/printQueueItem.mjs";
import ClientModel from "../models/clients.mjs";

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
  return queue;
}

export async function getQueue(queueId) {
  const queue = await PrintQueueModel.findById(queueId).lean();
  if (!queue) return null;
  const count = await PrintQueueItemModel.countDocuments({ queueId });
  return { ...queue, counts: { total: count } };
}

export async function enqueueSelection({ queueId, clientIds, userId }) {
  const docs = (clientIds || []).map((id) => ({
    queueId,
    clientId: String(id),
    addedBy: userId,
  }));
  if (docs.length === 0)
    return { addedCount: 0, alreadyInQueueCount: 0, duplicatesSample: [] };

  try {
    const result = await PrintQueueItemModel.bulkWrite(
      docs.map((d) => ({ insertOne: { document: d } })),
      { ordered: false }
    );
    const addedCount = result.insertedCount || 0;
    const alreadyInQueueCount = docs.length - addedCount;
    let duplicatesSample = [];
    if (alreadyInQueueCount > 0) {
      const existing = await PrintQueueItemModel.find({
        queueId,
        clientId: { $in: docs.map((d) => d.clientId) },
      })
        .limit(10)
        .lean();
      duplicatesSample = existing.map((e) => e.clientId);
    }
    return { addedCount, alreadyInQueueCount, duplicatesSample };
  } catch (e) {
    // bulkWrite with ordered:false will continue past duplicates; count from acknowledged ops
    let addedCount = 0;
    if (e && e.result && typeof e.result.insertedCount === "number") {
      addedCount = e.result.insertedCount;
    }
    const alreadyInQueueCount = docs.length - addedCount;
    return { addedCount, alreadyInQueueCount, duplicatesSample: [] };
  }
}

export async function enqueueByFilter({ queueId, filterPayload, userId }) {
  const signatureHash = hashFilter(filterPayload);
  // Save source on queue
  await PrintQueueModel.findByIdAndUpdate(queueId, {
    $push: {
      sources: {
        sourceType: "filter",
        filterSnapshot: filterPayload,
        filterSignatureHash: signatureHash,
      },
    },
  });

  // Compute matching IDs server-side
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
    let added = 0;
    if (e && e.result && typeof e.result.insertedCount === "number") {
      added = e.result.insertedCount;
    }
    return { added };
  }
}

function buildClientQuery(filterPayload) {
  // Minimal passthrough. Extend based on your existing filtering rules used by clients/fetchall
  // Accept keys like filtering (text), group, advancedFilterData
  const { filter, group, advancedFilterData } = filterPayload || {};
  const query = {};
  if (group) query.group = group;
  if (filter && typeof filter === "string" && filter.trim()) {
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
  // Example: date encoded range from advancedFilterData
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
  return PrintQueueModel.find(q).sort({ updatedAt: -1 }).lean();
}

export async function clearQueue(queueId) {
  await PrintQueueItemModel.deleteMany({ queueId });
  await PrintQueueModel.findByIdAndUpdate(queueId, { status: "completed" });
  return { success: true };
}

export async function checkPrintHistory(clientIds) {
  try {
    // Import PrintJobModel dynamically to avoid circular dependency
    const { default: PrintJobModel } = await import("../models/printJob.mjs");

    // Find print jobs that contain any of these client IDs
    const printedJobs = await PrintJobModel.find({
      clientIds: { $in: clientIds },
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    // Extract which client IDs were printed and when
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

    return {
      printedIds: Array.from(printedIds),
      printHistory,
      totalPrinted: printedIds.size,
    };
  } catch (error) {
    console.error("Error checking print history:", error);
    return {
      printedIds: [],
      printHistory: {},
      totalPrinted: 0,
    };
  }
}
