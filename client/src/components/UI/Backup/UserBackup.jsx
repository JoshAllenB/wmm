import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import backupService from "../../../services/backupService";
import { Button } from "../ShadCN/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ShadCN/card";
import { Progress } from "../ShadCN/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ShadCN/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ShadCN/table";
import {
  Download,
  Database,
  RefreshCw,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const UserBackup = () => {
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [customFilename, setCustomFilename] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch backup list
  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await backupService.listBackups();
      setBackups(response.backups || []);
    } catch (err) {
      console.error("Error fetching backups:", err);
      setError("Failed to load backups");
      toast.error("Failed to load backups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError(null);

    try {
      await backupService.createFullBackup({
        type: "manual",
      });

      toast.success("Backup created successfully!");
      setShowCreateDialog(false);
      await fetchBackups(); // Refresh the list
    } catch (err) {
      console.error("Error creating backup:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to create backup";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Download backup
  const handleDownloadBackup = async (backup) => {
    setSelectedBackup(backup);
    setCustomFilename(`${backup.id}.zip`);
    setShowDownloadDialog(true);
  };

  const confirmDownload = async () => {
    if (!selectedBackup) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      await backupService.downloadBackupWithProgress(
        selectedBackup.id,
        customFilename,
        (progress, loaded, total) => {
          setDownloadProgress(progress);
        }
      );

      toast.success("Backup downloaded successfully!");
      setShowDownloadDialog(false);
      setSelectedBackup(null);
      setCustomFilename("");
    } catch (err) {
      console.error("Error downloading backup:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to download backup";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Format file size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get age of backup
  const getAge = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Get status icon
  const getStatusIcon = (type) => {
    switch (type) {
      case "manual":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "autosave":
        return <Clock className="h-4 w-4 text-green-500" />;
      case "test":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading backups...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database Backup</h2>
          <p className="text-gray-600">Create and download database backups</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchBackups}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Database className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Backup</DialogTitle>
                <DialogDescription>
                  Create a new database backup. This will backup all your data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Full Database Backup
                      </p>
                      <p className="text-sm text-blue-700">
                        This will create a complete backup of all your data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreatingBackup}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                >
                  {isCreatingBackup ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Backup"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Available Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No backups available</p>
              <p className="text-sm">Create your first backup to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-sm">
                      {backup.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(backup.type)}
                        <span className="ml-2 capitalize">{backup.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{backup.sizeFormatted}</TableCell>
                    <TableCell>{formatDate(backup.timestamp)}</TableCell>
                    <TableCell>{getAge(backup.timestamp)}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleDownloadBackup(backup)}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Backup</DialogTitle>
            <DialogDescription>
              Choose a custom filename for your backup download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Backup ID</label>
              <input
                value={selectedBackup?.id || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filename</label>
              <input
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Enter custom filename"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="w-full" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDownloadDialog(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDownload}
              disabled={isDownloading || !customFilename.trim()}
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserBackup;
