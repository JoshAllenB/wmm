import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import backupService from "../../../services/backupService";
import { Button } from "../ShadCN/button";
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
import { Settings, RefreshCw, Save } from "lucide-react";

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
  const [error, setError] = useState(null);

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
      // No client path validation
    } catch (err) {
      console.error("Error loading backup settings:", err);
      setError("Failed to load backup settings");
      toast.error("Failed to load backup settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Removed client path handling

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Convert custom time to cron schedule
      const cronSchedule = timeToCron(settings.customTime);

      await backupService.updateBackupSettings({
        autosaveEnabled: settings.autosaveEnabled,
        autosaveSchedule: cronSchedule,
        maxBackups: settings.maxBackups,
      });
      toast.success("Backup settings saved successfully!");

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

  // Removed folder picker and validation

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
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              <span>{error}</span>
            </div>
          )}

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
                disabled={isLoading || isSaving}
                className="rounded border-gray-300"
              />
              <label htmlFor="autosaveEnabled" className="text-sm font-medium">
                Enable automatic backups
              </label>
            </div>

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
          <Button onClick={handleSave} disabled={isSaving}>
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
