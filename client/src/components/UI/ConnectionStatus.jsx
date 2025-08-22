import React from "react";
import { useSocket } from "../../utils/Websocket/useSocket";
import { Link2, Link2Off } from "lucide-react";

const ConnectionStatus = ({ showDetails = false }) => {
  const {
    connected,
    connectionStatus,
    reconnect,
    isConnecting,
    isReconnecting,
    getReconnectAttempts,
    getMaxReconnectAttempts,
  } = useSocket();

  const getStatusColor = () => {
    if (connected) return "text-green-600";
    if (isConnecting() || isReconnecting()) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusText = () => {
    if (connected) return "Connected";
    if (isConnecting()) return "Connecting...";
    if (isReconnecting()) return "Reconnecting...";
    return "Disconnected";
  };

  const getStatusIcon = () => {
    if (connected) return <Link2 className="w-4 h-4" />;
    if (isConnecting() || isReconnecting())
      return <Link2 className="w-4 h-4 animate-pulse" />;
    return <Link2Off className="w-4 h-4" />;
  };

  // Collapsed version - more compact and icon-focused
  if (!showDetails) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <div className={`p-2 rounded-lg  ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          {/* Status indicator dot */}
          <div
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
              connected
                ? "bg-green-500"
                : isConnecting() || isReconnecting()
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
          ></div>
        </div>
      </div>
    );
  }

  // Expanded version - more detailed and informative
  return (
    <div className={`p-3 rounded-lg border border-opacity-20`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div
            className={`p-1.5 rounded-md ${getStatusColor()} bg-white bg-opacity-80`}
          >
            {getStatusIcon()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">
              {getStatusText()}
            </div>
            <div className="text-xs text-gray-500">
              {connectionStatus.lastConnected && (
                <span>
                  Last:{" "}
                  {new Date(
                    connectionStatus.lastConnected
                  ).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div
          className={`w-3 h-3 rounded-full ${
            connected
              ? "bg-green-500"
              : isConnecting() || isReconnecting()
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        ></div>
      </div>

      {/* Reconnection progress */}
      {isReconnecting() && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Reconnecting...</span>
            <span>
              {getReconnectAttempts() + 1} of {getMaxReconnectAttempts()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-yellow-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${
                  ((getReconnectAttempts() + 1) / getMaxReconnectAttempts()) *
                  100
                }%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Manual reconnect button */}
      {!connected && !isConnecting() && !isReconnecting() && (
        <button
          onClick={reconnect}
          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Reconnect
        </button>
      )}

      {/* Connection details */}
      <div className="text-xs text-gray-500 mt-2 space-y-1">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        {connectionStatus.connectionId && (
          <div className="flex justify-between">
            <span>ID:</span>
            <span className="font-mono text-xs truncate max-w-20">
              {connectionStatus.connectionId.slice(-8)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
