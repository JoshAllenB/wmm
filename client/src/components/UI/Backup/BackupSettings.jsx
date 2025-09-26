import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import backupService from "../../../services/backupService";
import { Button } from "../ShadCN/button";
import { Input } from "../ShadCN/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ShadCN/card";
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
  Settings,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Info,
  Save,
  Folder,
  Upload,
} from "lucide-react";

const BackupSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    backupPath: "",
    autosaveEnabled: false,
    autosaveSchedule: "0 12 * * *",
    customTime: "12:00",
    maxBackups: 10,
  });
  const [migrateExisting, setMigrateExisting] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [pathValidation, setPathValidation] = useState({
    isValid: false,
    message: "",
    isChecking: false,
  });
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  // Helper function to parse cron schedule to time
  const parseCronToTime = (cronSchedule) => {
    // Parse "0 12 * * *" format (minute hour * * *)
    const parts = cronSchedule.split(" ");
    if (parts.length >= 2) {
      const minute = parts[0];
      const hour = parts[1];
      return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }
    return "12:00"; // Default fallback
  };

  // Helper function to convert time to cron schedule
  const timeToCron = (time) => {
    // Convert "12:30" to "30 12 * * *"
    const [hour, minute] = time.split(":");
    return `${minute} ${hour} * * *`;
  };

  // Load current settings
  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await backupService.getStatus();
      // Parse the cron schedule to extract time
      const cronSchedule = response.config?.autosaveSchedule || "0 12 * * *";
      const customTime = parseCronToTime(cronSchedule);

      setSettings({
        backupPath: response.config?.backupPath || "",
        autosaveEnabled: response.config?.autosaveEnabled || false,
        autosaveSchedule: cronSchedule,
        customTime: customTime,
        maxBackups: response.config?.maxBackups || 10,
      });
      setMigrationResult(null);

      // Validate the current path
      if (response.config?.backupPath) {
        await validatePath(response.config.backupPath);
      }
    } catch (err) {
      console.error("Error loading backup settings:", err);
      setError("Failed to load backup settings");
      toast.error("Failed to load backup settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Validate backup path
  const validatePath = async (path) => {
    if (!path.trim()) {
      setPathValidation({
        isValid: false,
        message: "Backup path is required",
        isChecking: false,
      });
      return;
    }

    setPathValidation({ isValid: false, message: "", isChecking: true });

    try {
      const response = await backupService.validateBackupPath(path);
      setPathValidation({
        isValid: response.valid,
        message: response.message,
        isChecking: false,
      });
    } catch (err) {
      console.error("Error validating path:", err);
      setPathValidation({
        isValid: false,
        message: "Failed to validate path",
        isChecking: false,
      });
    }
  };

  // Handle path change with validation
  const handlePathChange = (newPath) => {
    setSettings({ ...settings, backupPath: newPath });

    // Debounce validation
    clearTimeout(window.pathValidationTimeout);
    window.pathValidationTimeout = setTimeout(() => {
      validatePath(newPath);
    }, 500);
  };

  // Save settings
  const handleSave = async () => {
    if (!pathValidation.isValid) {
      toast.error("Please fix the backup path before saving");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert custom time to cron schedule
      const cronSchedule = timeToCron(settings.customTime);

      const response = await backupService.updateBackupSettings({
        ...settings,
        autosaveSchedule: cronSchedule,
        migrateExisting,
      });

      if (response.migration) {
        setMigrationResult(response.migration);
        if (response.migration.success) {
          toast.success(`Settings saved! ${response.migration.message}`);
        } else {
          toast.error(
            `Settings saved but migration failed: ${response.migration.error}`
          );
        }
      } else {
        toast.success("Backup settings saved successfully!");
      }

      setIsOpen(false);
      await loadSettings(); // Reload to get updated settings
    } catch (err) {
      console.error("Error saving backup settings:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to save settings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Test path accessibility
  const testPath = async () => {
    if (!settings.backupPath.trim()) {
      toast.error("Please enter a backup path first");
      return;
    }

    await validatePath(settings.backupPath);
  };

  // Open folder picker
  const openFolderPicker = async () => {
    try {
      // 1. Modern browsers (File System Access API)
      if (window.showDirectoryPicker) {
        const directoryHandle = await window.showDirectoryPicker({
          mode: "readwrite",
        });

        // Store the directory handle for future use (optional)
        // For now, we'll use the directory name and let the backend handle path resolution
        const folderName = directoryHandle.name;

        // Show a helpful message about the selected folder
        toast.success(`Selected folder: ${folderName}`);
        handlePathChange(folderName);
        return;
      }

      // 2. Fallback to <input type="file" webkitdirectory />
      if (fileInputRef.current) {
        fileInputRef.current.click();
        return;
      }

      // 3. Last fallback: manual input
      const userPath = prompt(
        "Enter the backup folder path:\n\nExamples:\n- C:\\backups (Windows)\n- /home/username/backups (Linux)\n- /mnt/c/backups (WSL)",
        settings.backupPath || ""
      );
      if (userPath && userPath.trim()) {
        handlePathChange(userPath.trim());
      }
    } catch (error) {
      console.error("Error opening folder picker:", error);
      toast.error("Folder picker not supported. Please enter path manually.");
    }
  };

  // Handler for <input type="file" webkitdirectory />
  const handleWebkitDirPick = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      // Get the full path from the first file's webkitRelativePath
      const fullPath = files[0].webkitRelativePath;
      const folderName = fullPath.split("/")[0];

      // Show a helpful message about the selected folder
      toast.success(`Selected folder: ${folderName}`);
      handlePathChange(folderName);
    }
    // Reset the input so the same folder can be selected again
    e.target.value = "";
  };

  // Get path suggestions based on OS
  const getPathSuggestions = () => {
    const suggestions = [];

    // Detect if we're likely in WSL
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      suggestions.push(
        { label: "Windows C: Drive", path: "/mnt/c/backups" },
        {
          label: "Windows Documents",
          path: "/mnt/c/Users/$(whoami)/Documents/backups",
        },
        {
          label: "Windows Desktop",
          path: "/mnt/c/Users/$(whoami)/Desktop/backups",
        },
        { label: "WSL Home", path: "~/backups" }
      );
    } else {
      // Add Linux/macOS suggestions
      suggestions.push(
        { label: "Home Directory", path: "~/backups" },
        { label: "Documents", path: "~/Documents/backups" },
        { label: "Desktop", path: "~/Desktop/backups" },
        { label: "Downloads", path: "~/Downloads/backups" }
      );
    }

    return suggestions;
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Backup Settings
          </DialogTitle>
          <DialogDescription>
            Configure where backups are saved and enable automatic backups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden file input for webkitdirectory fallback */}
          <input
            ref={fileInputRef}
            type="file"
            webkitdirectory=""
            style={{ display: "none" }}
            onChange={handleWebkitDirPick}
          />

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Backup Path */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Choose Backup Folder</label>

            {/* Folder Picker Button */}
            <div className="flex space-x-2">
              <Button
                onClick={openFolderPicker}
                variant="outline"
                className="flex-1 justify-start"
                disabled={isLoading || isSaving}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {settings.backupPath ? "Change Folder" : "Select Folder"}
              </Button>
              {settings.backupPath && (
                <Button
                  onClick={testPath}
                  variant="outline"
                  size="sm"
                  disabled={isLoading || isSaving || pathValidation.isChecking}
                >
                  {pathValidation.isChecking ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Current Path Display */}
            {settings.backupPath && (
              <div className="bg-gray-50 border rounded p-2 space-y-2">
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    Manual backups folder:
                  </div>
                  <div className="text-sm font-mono text-gray-800 break-all">
                    {settings.backupPath}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    Autosave folder:
                  </div>
                  <div className="text-sm font-mono text-gray-800 break-all">
                    {settings.backupPath}/autosave
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  The system will automatically create the full paths for you
                </div>
              </div>
            )}

            {/* Path Validation Status */}
            {settings.backupPath && (
              <div className="text-xs">
                {pathValidation.isChecking ? (
                  <div className="flex items-center text-blue-600">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Checking folder access...
                  </div>
                ) : pathValidation.isValid ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />✓{" "}
                    {pathValidation.message}
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="h-3 w-3 mr-1" />✗{" "}
                    {pathValidation.message}
                  </div>
                )}
              </div>
            )}

            {/* Migration Option */}
            {settings.backupPath && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="migrateExisting"
                    checked={migrateExisting}
                    onChange={(e) => setMigrateExisting(e.target.checked)}
                    disabled={isLoading || isSaving}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="migrateExisting"
                      className="text-sm font-medium text-blue-800"
                    >
                      Migrate existing backups to new location
                    </label>
                    <div className="text-xs text-blue-600 mt-1">
                      This will copy all existing backups from the current
                      location to the new folder
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Migration Result */}
            {migrationResult && (
              <div
                className={`border rounded p-3 ${
                  migrationResult.success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="text-sm font-medium">
                  {migrationResult.success
                    ? "Migration Successful"
                    : "Migration Failed"}
                </div>
                <div className="text-xs mt-1">
                  {migrationResult.message || migrationResult.error}
                </div>
                {migrationResult.migratedCount && (
                  <div className="text-xs mt-1">
                    Migrated {migrationResult.migratedCount} of{" "}
                    {migrationResult.totalBackups} backups
                  </div>
                )}
              </div>
            )}

            {/* Manual Path Input (Fallback) */}
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                Advanced: Enter path manually
              </summary>
              <div className="mt-2 space-y-2">
                <Input
                  value={settings.backupPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  placeholder="Enter backup directory path"
                  className="text-xs"
                  disabled={isLoading || isSaving}
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Examples:</div>
                  <div>• Windows: C:\backups</div>
                  <div>• Linux/Mac: /home/username/backups</div>
                  <div>• WSL: /mnt/c/backups</div>
                </div>
              </div>
            </details>
          </div>

          {/* Autosave Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autosaveEnabled"
                checked={settings.autosaveEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    autosaveEnabled: e.target.checked,
                  })
                }
                disabled={isLoading || isSaving || !pathValidation.isValid}
                className="rounded border-gray-300"
              />
              <label htmlFor="autosaveEnabled" className="text-sm font-medium">
                Enable automatic backups
              </label>
            </div>

            {!pathValidation.isValid && (
              <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                ⚠️ Set a valid backup folder first
              </div>
            )}

            {settings.autosaveEnabled && (
              <div className="space-y-2 pl-6">
                <div>
                  <label className="text-xs text-gray-600">What time?</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="time"
                      value={settings.customTime}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          customTime: e.target.value,
                        })
                      }
                      disabled={isLoading || isSaving}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    />
                    <span className="text-xs text-gray-500">every day</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 mb-2">
                    Quick presets:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: "2 AM", time: "02:00" },
                      { label: "6 AM", time: "06:00" },
                      { label: "12 PM", time: "12:00" },
                      { label: "6 PM", time: "18:00" },
                      { label: "11 PM", time: "23:00" },
                    ].map((preset) => (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            customTime: preset.time,
                          })
                        }
                        disabled={isLoading || isSaving}
                        className={`text-xs px-2 py-1 rounded border ${
                          settings.customTime === preset.time
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">
                    Keep how many backups?
                  </label>
                  <select
                    value={settings.maxBackups}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxBackups: parseInt(e.target.value),
                      })
                    }
                    disabled={isLoading || isSaving}
                    className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={5}>5 backups</option>
                    <option value={10}>10 backups</option>
                    <option value={20}>20 backups</option>
                    <option value={50}>50 backups</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !pathValidation.isValid}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BackupSettings;
