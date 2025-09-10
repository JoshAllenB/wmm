import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  listPrintQueues,
  getPrintQueue,
  clearPrintQueue,
} from "../Table/Data/utilData.jsx";

const QueueManager = () => {
  const [allQueues, setAllQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [queueDetails, setQueueDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all, open, completed, archived

  const fetchAllQueues = async () => {
    setLoading(true);
    try {
      const data = await listPrintQueues();
      setAllQueues(data);
    } catch (error) {
      console.error("Error fetching queues:", error);
      toast.error("Failed to fetch queues");
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueDetails = async (queueId) => {
    try {
      const details = await getPrintQueue(queueId);
      setQueueDetails(details);
    } catch (error) {
      console.error("Error fetching queue details:", error);
      toast.error("Failed to fetch queue details");
    }
  };

  const clearQueue = async (queueId) => {
    if (!confirm("Are you sure you want to clear this queue?")) return;

    setLoading(true);
    try {
      await clearPrintQueue(queueId);
      await fetchAllQueues();
      if (selectedQueue === queueId) {
        setSelectedQueue(null);
        setQueueDetails(null);
      }
      toast.success("Queue cleared successfully");
    } catch (error) {
      console.error("Error clearing queue:", error);
      toast.error("Failed to clear queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQueues();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchQueueDetails(selectedQueue);
    } else {
      setQueueDetails(null);
    }
  }, [selectedQueue]);

  const filteredQueues = allQueues.filter((queue) => {
    switch (filter) {
      case "open":
        return queue.status === "open";
      case "completed":
        return queue.status === "completed";
      case "archived":
        return queue.status === "archived";
      default:
        return true;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "text-green-600 bg-green-50";
      case "locked":
        return "text-yellow-600 bg-yellow-50";
      case "completed":
        return "text-blue-600 bg-blue-50";
      case "archived":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Queue Manager</h1>
        <p className="text-gray-600">Manage and view all print queues</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: "all", label: "All Queues" },
            { key: "open", label: "Active" },
            { key: "completed", label: "Completed" },
            { key: "archived", label: "Archived" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue List */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">
              Queues ({filteredQueues.length})
            </h2>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredQueues.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No queues found
              </div>
            ) : (
              <div className="divide-y">
                {filteredQueues.map((queue) => (
                  <div
                    key={queue._id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedQueue === queue._id
                        ? "bg-blue-50 border-r-4 border-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedQueue(queue._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {queue.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {queue.actionType} • {queue.department} •{" "}
                          {queue.counts?.total || 0} items
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(queue.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            queue.status
                          )}`}
                        >
                          {queue.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearQueue(queue._id);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                          disabled={loading}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue Details */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Queue Details</h2>
          </div>
          <div className="p-4">
            {!selectedQueue ? (
              <div className="text-center text-gray-500 py-8">
                Select a queue to view details
              </div>
            ) : !queueDetails ? (
              <div className="text-center text-gray-500 py-8">
                Loading queue details...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{queueDetails.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium">{queueDetails.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <p className="font-medium">{queueDetails.actionType}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Department:</span>
                      <p className="font-medium">{queueDetails.department}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <p className="font-medium">
                        {queueDetails.counts?.total || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="font-medium">
                        {new Date(queueDetails.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sources */}
                {queueDetails.sources && queueDetails.sources.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Sources</h3>
                    <div className="space-y-2">
                      {queueDetails.sources.map((source, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded text-sm"
                        >
                          <div className="font-medium">{source.sourceType}</div>
                          {source.filterSnapshot && (
                            <div className="mt-1 text-gray-600">
                              <div>
                                Filter: {source.filterSnapshot.filter || "None"}
                              </div>
                              <div>
                                Group: {source.filterSnapshot.group || "None"}
                              </div>
                              {source.filterSnapshot.advancedFilterData &&
                                Object.keys(
                                  source.filterSnapshot.advancedFilterData
                                ).length > 0 && (
                                  <div>
                                    Advanced:{" "}
                                    {
                                      Object.keys(
                                        source.filterSnapshot.advancedFilterData
                                      ).length
                                    }{" "}
                                    filters
                                  </div>
                                )}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Added: {new Date(source.addedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template Reference */}
                {queueDetails.templateRefId && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Template</h3>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      <div>Template ID: {queueDetails.templateRefId}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueManager;
