import React from "react";
import { toast } from "react-hot-toast";
import {
  createPrintQueue,
  listPrintQueues,
  getPrintQueue,
  enqueueSelectionToQueue,
  enqueueFilterToQueue,
  clearPrintQueue,
  checkPrintHistory,
} from "../Table/Data/utilData.jsx";

const PrintQueueDev = () => {
  const [queues, setQueues] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [newQueueName, setNewQueueName] = React.useState("");
  const [activeQueueId, setActiveQueueId] = React.useState("");
  const [idsInput, setIdsInput] = React.useState("");
  const [filterJson, setFilterJson] = React.useState(
    '{"filter":"","group":"","advancedFilterData":{}}'
  );
  const [queueInfo, setQueueInfo] = React.useState(null);

  const refreshQueues = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listPrintQueues();
      setQueues(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const createQueueClick = async () => {
    setLoading(true);
    setError("");
    try {
      const q = await createPrintQueue({ name: newQueueName || undefined });
      setActiveQueueId(q._id);
      await refreshQueues();
      toast.success(`Created queue: ${q.name}`);
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message;
      setError(errorMsg);
      toast.error(`Failed to create queue: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const viewQueue = async () => {
    if (!activeQueueId) return;
    setLoading(true);
    setError("");
    try {
      const info = await getPrintQueue(activeQueueId);
      setQueueInfo(info);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const enqueueIds = async () => {
    if (!activeQueueId) return;
    const ids = idsInput
      .split(/[\s,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      toast.error("Please enter some IDs to enqueue");
      return;
    }

    // Check print history first
    try {
      const historyResult = await checkPrintHistory(ids);
      if (historyResult.totalPrinted > 0) {
        const printedIds = historyResult.printedIds.slice(0, 10);
        const message = `${
          historyResult.totalPrinted
        } of these IDs have already been printed:\n${printedIds.join(", ")}${
          historyResult.totalPrinted > 10
            ? `\n...and ${historyResult.totalPrinted - 10} more`
            : ""
        }\n\nDo you want to continue adding them to the queue?`;

        if (!confirm(message)) {
          return;
        }
      }
    } catch (e) {
      console.warn("Could not check print history:", e);
      // Continue anyway if history check fails
    }

    setLoading(true);
    setError("");
    try {
      const res = await enqueueSelectionToQueue(activeQueueId, ids);
      await viewQueue();
      toast.success(
        `Added: ${res.addedCount}, Already in queue: ${res.alreadyInQueueCount}`
      );
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message;
      setError(errorMsg);
      toast.error(`Failed to enqueue IDs: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const enqueueFilter = async () => {
    if (!activeQueueId) return;
    setLoading(true);
    setError("");
    try {
      const payload = JSON.parse(filterJson || "{}");
      const res = await enqueueFilterToQueue(activeQueueId, payload);
      await viewQueue();
      toast.success(
        `Matched: ${res.totalMatched}, Added: ${res.addedCount}, Already in queue: ${res.alreadyInQueueCount}`
      );
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message;
      setError(errorMsg);
      toast.error(`Failed to enqueue filter: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const clearQueueClick = async () => {
    if (!activeQueueId) return;

    if (!confirm("Are you sure you want to clear this queue?")) return;

    setLoading(true);
    setError("");
    try {
      await clearPrintQueue(activeQueueId);
      await viewQueue();
      toast.success("Queue cleared successfully");
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e.message;
      setError(errorMsg);
      toast.error(`Failed to clear queue: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshQueues();
  }, []);

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="font-semibold mb-2">Print Queue Dev</h3>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="flex gap-2 items-center mb-3">
        <input
          value={newQueueName}
          onChange={(e) => setNewQueueName(e.target.value)}
          placeholder="Queue name"
          className="border px-2 py-1 rounded"
        />
        <button
          onClick={createQueueClick}
          className="px-3 py-1 bg-blue-600 text-white rounded"
          disabled={loading}
        >
          Create Queue
        </button>
        <button
          onClick={refreshQueues}
          className="px-3 py-1 bg-gray-200 rounded"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="mb-3">
        <label className="text-sm">Active Queue</label>
        <select
          value={activeQueueId}
          onChange={(e) => setActiveQueueId(e.target.value)}
          className="border px-2 py-1 rounded ml-2"
        >
          <option value="">-- select --</option>
          {queues.map((q) => (
            <option key={q._id} value={q._id}>
              {q.name} ({q.status})
            </option>
          ))}
        </select>
        <button
          onClick={viewQueue}
          className="ml-2 px-3 py-1 bg-gray-200 rounded"
          disabled={!activeQueueId || loading}
        >
          View
        </button>
        <button
          onClick={clearQueueClick}
          className="ml-2 px-3 py-1 bg-rose-500 text-white rounded"
          disabled={!activeQueueId || loading}
        >
          Clear Queue
        </button>
      </div>

      {queueInfo && (
        <div className="text-sm mb-4">
          <div>ID: {queueInfo._id}</div>
          <div>Name: {queueInfo.name}</div>
          <div>Status: {queueInfo.status}</div>
          <div>Total in queue: {queueInfo.counts?.total || 0}</div>
        </div>
      )}

      <div className="mb-4">
        <div className="font-medium mb-1">Enqueue IDs</div>
        <textarea
          value={idsInput}
          onChange={(e) => setIdsInput(e.target.value)}
          placeholder="Enter IDs separated by comma or whitespace"
          className="w-full border rounded p-2 h-20"
        />
        <button
          onClick={enqueueIds}
          className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
          disabled={!activeQueueId || loading}
        >
          Enqueue Selection
        </button>
      </div>

      <div className="mb-2">
        <div className="font-medium mb-1">Enqueue by Filter JSON</div>
        <textarea
          value={filterJson}
          onChange={(e) => setFilterJson(e.target.value)}
          className="w-full border rounded p-2 h-28 font-mono text-xs"
        />
        <button
          onClick={enqueueFilter}
          className="mt-2 px-3 py-1 bg-purple-600 text-white rounded"
          disabled={!activeQueueId || loading}
        >
          Enqueue Filter
        </button>
      </div>
    </div>
  );
};

export default PrintQueueDev;
