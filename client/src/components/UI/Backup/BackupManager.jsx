import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import backupService from "../../../services/backupService";
import { Button } from "../ShadCN/button";
import { Input } from "../ShadCN/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ShadCN/card";
import { Progress } from "../ShadCN/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ShadCN/select";
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
  Trash2,
  RefreshCw,
  Settings,
  FileText,
  Clock,
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const BackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState("all");
  const [backupType, setBackupType] = useState("manual");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupToDelete, setBackupToDelete] = useState(null);
  const [customFilename, setCustomFilename] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch backup status and list
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statusResponse, backupsResponse] = await Promise.all([
        backupService.getStatus(),
        backupService.listBackups(),
      ]);

      setStatus(statusResponse);
      setBackups(backupsResponse.backups || []);
    } catch (err) {
      console.error("Error fetching backup data:", err);
      setError("Failed to load backup data");
      toast.error("Failed to load backup data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError(null);

    try {
      let result;
      if (selectedDatabase === "all") {
        result = await backupService.createFullBackup({
          type: backupType,
        });
      } else {
        result = await backupService.createDatabaseBackup(selectedDatabase, {
          type: backupType,
        });
      }

      toast.success("Backup created successfully!");
      setShowCreateDialog(false);
      await fetchData(); // Refresh the list
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

  // Delete backup
  const handleDeleteBackup = (backup) => {
    setBackupToDelete(backup);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
      await backupService.deleteBackup(backupToDelete.id);
      toast.success("Backup deleted successfully!");
      setShowDeleteDialog(false);
      setBackupToDelete(null);
      await fetchData(); // Refresh the list
    } catch (err) {
      console.error("Error deleting backup:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to delete backup";
      toast.error(errorMessage);
    }
  };

  // Cleanup old backups
  const handleCleanup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clean up old backups? This will delete backups beyond the retention limit."
      )
    ) {
      return;
    }

    try {
      const result = await backupService.cleanupBackups();
      toast.success(
        `Cleanup completed: ${result.result.deleted} backups deleted`
      );
      await fetchData(); // Refresh the list
    } catch (err) {
      console.error("Error cleaning up backups:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to cleanup backups";
      toast.error(errorMessage);
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
        return <Settings className="h-4 w-4 text-blue-500" />;
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
        <span className="ml-2">Loading backup data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Database Backup Manager
          </h2>
          <p className="text-gray-600">Manage and download database backups</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchData}
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
                  Create a new database backup. Choose the database and backup
                  type.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Database</label>
                  <Select
                    value={selectedDatabase}
                    onValueChange={setSelectedDatabase}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Databases</SelectItem>
                      {status?.config?.databases?.map((db) => (
                        <SelectItem key={db} value={db}>
                          {db}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Backup Type</label>
                  <Select value={backupType} onValueChange={setBackupType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
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

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Database className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Backups
                  </p>
                  <p className="text-2xl font-bold">
                    {status.stats.totalBackups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Total Size
                  </p>
                  <p className="text-2xl font-bold">
                    {status.stats.totalSizeFormatted}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">
                    Max Backups
                  </p>
                  <p className="text-2xl font-bold">
                    {status.config.maxBackups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-2xl font-bold capitalize">
                    {status.status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Backups</span>
            <Button
              onClick={handleCleanup}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old
            </Button>
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
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleDownloadBackup(backup)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handleDeleteBackup(backup)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
              <Input
                value={selectedBackup?.id || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Filename</label>
              <Input
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Enter custom filename"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Delete Backup
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {backupToDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Database className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Backup ID: {backupToDelete.id}
                    </p>
                    <p className="text-sm text-red-700">
                      Type: {backupToDelete.type} • Size:{" "}
                      {backupToDelete.sizeFormatted}
                    </p>
                    <p className="text-sm text-red-700">
                      Created: {formatDate(backupToDelete.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setBackupToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteBackup}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupManager;
