// PrintQueueManager.js
import { generateCp850RawPrintContent } from "./PrintGenerator";

class PrintQueueManager {
  constructor() {
    this.queue = []; // staged print jobs
    this.isFlushing = false; // prevent concurrent flushes
  }

  /**
   * Add a new job to the queue (not sent to printer yet)
   */
  addJob(jobRows, options = {}) {
    const job = {
      id: Date.now() + Math.random(), // unique ID
      rows: jobRows,
      options: {
        startClientId: options.startClientId || "",
        endClientId: options.endClientId || "",
        startPosition: options.startPosition || "left",
        template: options.template || null,
        selectedFields: options.selectedFields || [],
        userRole: options.userRole || "",
        subscriptionType: options.subscriptionType || "WMM",
        rowsPerPage: options.rowsPerPage || 3,
        columnsPerPage: options.columnsPerPage || 2,
        useCp850Encoding: options.useCp850Encoding !== false,
        labelAdjustments: options.labelAdjustments || {
          labelWidthIn: 3.5,
          topMargin: 4,
          rowSpacing: 14,
          col2X: 255,
        },
        afterSpecifiedStart: options.afterSpecifiedStart || false,
        printerName: options.printerName || "",
        useDefaultPrinter: options.useDefaultPrinter || false,
        ...options,
      },
      addedAt: new Date(),
      labelCount: jobRows.length,
    };

    this.queue.push(job);
    return job.id;
  }

  /**
   * Remove a job from the queue by ID
   */
  removeJob(jobId) {
    const index = this.queue.findIndex((job) => job.id === jobId);
    if (index !== -1) {
      const removedJob = this.queue.splice(index, 1)[0];
      return true;
    }
    return false;
  }

  /**
   * Clear all jobs from the queue
   */
  clearQueue() {
    this.queue = [];
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const totalLabels = this.queue.reduce(
      (sum, job) => sum + job.labelCount,
      0
    );
    return {
      jobCount: this.queue.length,
      totalLabels: totalLabels,
      isFlushing: this.isFlushing,
      jobs: this.queue.map((job) => ({
        id: job.id,
        labelCount: job.labelCount,
        addedAt: job.addedAt,
        startClientId: job.options.startClientId,
        endClientId: job.options.endClientId,
        subscriptionType: job.options.subscriptionType,
      })),
    };
  }

  /**
   * Build the raw ESC/P data for everything in the queue
   */
  buildCombinedJob() {
    if (this.queue.length === 0) {
      return [];
    }

    let allCommands = [];
    let isFirstJob = true;
    let currentLabelsPrinted = 0; // Track labels printed so far in this combined job

    for (const job of this.queue) {
      const { rows, options } = job;

      // Calculate the actual start position for this job based on labels printed so far
      const actualStartPosition =
        currentLabelsPrinted % 2 === 1 ? "right" : "left";

      const commands = generateCp850RawPrintContent(
        options.startClientId,
        options.endClientId,
        actualStartPosition, // Use calculated position instead of stored position
        rows,
        options.template,
        null, // leftPosition unused
        null, // topPosition unused
        null, // columnWidth unused
        null, // horizontalSpacing unused
        null, // rowSpacing unused
        null, // labelHeight unused
        options.selectedFields,
        options.userRole,
        options.subscriptionType,
        options.rowsPerPage,
        options.columnsPerPage,
        options.useCp850Encoding,
        options.labelAdjustments,
        options.afterSpecifiedStart
      );

      allCommands = allCommands.concat(commands);
      currentLabelsPrinted += rows.length;
      isFirstJob = false;
    }

    return allCommands;
  }

  /**
   * Finalize and flush to printer
   */
  async flush(finalize = true, printCallback = null) {
    if (this.isFlushing) {
      throw new Error("Print queue is already being flushed");
    }

    if (this.queue.length === 0) {
      throw new Error("No jobs in queue to print");
    }

    this.isFlushing = true;

    try {
      let commands = this.buildCombinedJob();

      if (finalize) {
        // Only add reset/eject *once*, at very end
        commands.push(0x1b, 0x40); // ESC @ reset printer
        commands.push(0x0d, 0x0a); // CRLF
      }

      // Use the provided print callback or default behavior
      if (printCallback && typeof printCallback === "function") {
        await printCallback(commands, this.queue);
      } else {
        throw new Error("No print callback provided");
      }

      // Clear the queue after successful printing
      this.queue = [];

      return {
        success: true,
        jobsPrinted: this.queue.length,
        labelsPrinted: 0, // Queue is now empty
      };
    } catch (error) {
      console.error("Error flushing print queue:", error);
      throw error;
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Get the next start position for a new job
   * This calculates where the next job should start based on total labels in queue
   */
  getNextStartPosition() {
    // Calculate total labels that will be printed before this new job
    const totalLabelsBeforeNewJob = this.queue.reduce(
      (sum, job) => sum + job.labelCount,
      0
    );
    return totalLabelsBeforeNewJob % 2 === 1 ? "right" : "left";
  }

  /**
   * Estimate total print time (rough calculation)
   */
  estimatePrintTime() {
    // Rough estimate: 2 seconds per label
    const totalLabels = this.queue.reduce(
      (sum, job) => sum + job.labelCount,
      0
    );
    return totalLabels * 2;
  }
}

// Singleton instance
export const printQueueManager = new PrintQueueManager();

// Export the class for testing or multiple instances
export { PrintQueueManager };
