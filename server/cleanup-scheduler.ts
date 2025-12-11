import { storage } from "./storage";

class CleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_TASK_NAME = "device_data_cleanup";
  private readonly CLEANUP_INTERVAL_DAYS = 2;
  private readonly CLEANUP_TIME_HOUR = 0; // 12 AM IST (midnight)
  private readonly CLEANUP_TIME_MINUTE = 0;
  private readonly IST_OFFSET_HOURS = 5.5; // IST is UTC+5:30
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

  /**
   * Convert IST time to UTC
   */
  private convertISTToUTC(istHour: number, istMinute: number = 0): { hour: number; minute: number } {
    const istTime = new Date();
    istTime.setHours(istHour, istMinute, 0, 0);
    
    // Convert IST to UTC by subtracting 5.5 hours
    const utcTime = new Date(istTime.getTime() - (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
    
    return {
      hour: utcTime.getHours(),
      minute: utcTime.getMinutes()
    };
  }

  /**
   * Calculate the next scheduled cleanup time in IST
   */
  private calculateNextScheduledTime(): Date {
    const now = new Date();
    
    // Create IST current time
    const istNow = new Date(now.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
    
    // Create next cleanup time in IST - start from today at 12:00 AM + interval days
    const nextCleanupIST = new Date(istNow);
    nextCleanupIST.setHours(this.CLEANUP_TIME_HOUR, this.CLEANUP_TIME_MINUTE, 0, 0);
    
    // Always add the full interval days for new schedules
    nextCleanupIST.setDate(nextCleanupIST.getDate() + this.CLEANUP_INTERVAL_DAYS);
    
    // Convert back to UTC for storage
    return new Date(nextCleanupIST.getTime() - (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
  }

  /**
   * Calculate the next scheduled cleanup time from a given execution time
   */
  private calculateNextScheduledTimeFromLast(lastExecutionTime: Date): Date {
    // Add exactly 2 days (48 hours) to the last execution time - no time adjustment
    return new Date(lastExecutionTime.getTime() + (this.CLEANUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000));
  }

  /**
   * Initialize or get cleanup schedule from database
   */
  private async initializeSchedule(): Promise<void> {
    try {
      let schedule = await storage.getCleanupSchedule(this.CLEANUP_TASK_NAME);
      
      if (!schedule) {
        // Create initial schedule
        const nextScheduledTime = this.calculateNextScheduledTime();
        
        await storage.createCleanupSchedule({
          taskName: this.CLEANUP_TASK_NAME,
          lastExecutionTime: null,
          nextScheduledTime,
          intervalDays: this.CLEANUP_INTERVAL_DAYS,
          executionHour: this.CLEANUP_TIME_HOUR,
          executionMinute: this.CLEANUP_TIME_MINUTE,
          isEnabled: true
        });
        
        // Cleanup schedule initialized
      } else {
        // Cleanup schedule loaded
      }
    } catch (error) {
      console.error('Failed to initialize cleanup schedule:', error);
    }
  }

  /**
   * Check if cleanup should run and execute if needed
   */
  private async checkAndRunCleanup(): Promise<void> {
    try {
      const schedule = await storage.getCleanupSchedule(this.CLEANUP_TASK_NAME);
      
      // Database connection and schedule retrieval working properly
      
      if (!schedule || !schedule.isEnabled || !schedule.nextScheduledTime) {
        return;
      }

      const now = new Date();
      
      // Debug logging to understand time comparison
      const istNow = new Date(now.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
      const scheduleIST = new Date(schedule.nextScheduledTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
      
      // Cleanup timing check completed
      
      if (now >= schedule.nextScheduledTime) {
        console.log('🧹 Running scheduled cleanup - deleting ALL device data...');
        
        // Delete ALL device data
        const deletedCount = await storage.clearAllDeviceData();
        
        // Calculate next cleanup time from current execution time (ensures exactly 2 days)
        const nextScheduledTime = this.calculateNextScheduledTimeFromLast(now);
        
        // Update schedule in database
        await storage.updateCleanupSchedule(this.CLEANUP_TASK_NAME, {
          lastExecutionTime: now,
          nextScheduledTime: nextScheduledTime
        });
        
        const istTime = new Date(now.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
        const nextISTTime = new Date(nextScheduledTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
        
        console.log(`✅ Scheduled cleanup completed at ${istTime.toISOString().replace('T', ' ').substring(0, 19)} IST`);
        console.log(`📊 Deleted ${deletedCount} device data records`);
        console.log(`⏰ Next cleanup scheduled for: ${nextISTTime.toISOString().replace('T', ' ').substring(0, 19)} IST`);
      }
    } catch (error) {
      console.error('Error during scheduled cleanup check:', error);
    }
  }

  /**
   * Start the automatic cleanup scheduler
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      return;
    }

    await this.initializeSchedule();
    
    // Starting persistent cleanup scheduler
    
    // Check immediately on start
    await this.checkAndRunCleanup();
    
    // Schedule recurring checks every minute
    this.intervalId = setInterval(async () => {
      await this.checkAndRunCleanup();
    }, this.CHECK_INTERVAL_MS);

    // Cleanup scheduler started
  }

  /**
   * Stop the automatic cleanup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Cleanup scheduler stopped');
    }
  }

  /**
   * Run cleanup manually (deletes ALL device data)
   */
  async runCleanup(): Promise<number> {
    try {
      console.log('🧹 Running manual cleanup - deleting ALL device data...');
      
      const deletedCount = await storage.clearAllDeviceData();
      const now = new Date();
      const istTime = new Date(now.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
      
      // Calculate next cleanup time from current execution time
      const nextScheduledTime = this.calculateNextScheduledTimeFromLast(now);
      
      // Update last execution time and next scheduled time in database
      await storage.updateCleanupSchedule(this.CLEANUP_TASK_NAME, {
        lastExecutionTime: now,
        nextScheduledTime: nextScheduledTime
      });
      
      const nextISTTime = new Date(nextScheduledTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
      
      console.log(`✅ Manual cleanup completed at ${istTime.toISOString().replace('T', ' ').substring(0, 19)} IST`);
      console.log(`📊 Deleted ${deletedCount} device data records`);
      console.log(`⏰ Next cleanup scheduled for: ${nextISTTime.toISOString().replace('T', ' ').substring(0, 19)} IST`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Manual cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get the current cleanup configuration and status
   */
  async getConfig() {
    try {
      const schedule = await storage.getCleanupSchedule(this.CLEANUP_TASK_NAME);
      
      if (!schedule) {
        return {
          intervalDays: this.CLEANUP_INTERVAL_DAYS,
          executionTime: "12:00 AM IST",
          isRunning: this.intervalId !== null,
          isEnabled: false,
          lastExecution: null,
          nextScheduled: null
        };
      }
      
      const lastExecutionIST = schedule.lastExecutionTime 
        ? new Date(schedule.lastExecutionTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000))
        : null;
      
      const nextScheduledIST = schedule.nextScheduledTime 
        ? new Date(schedule.nextScheduledTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000))
        : null;
      
      return {
        intervalDays: schedule.intervalDays,
        executionTime: `${String(schedule.executionHour).padStart(2, '0')}:${String(schedule.executionMinute).padStart(2, '0')} IST`,
        isRunning: this.intervalId !== null,
        isEnabled: schedule.isEnabled,
        lastExecution: lastExecutionIST ? lastExecutionIST.toISOString().replace('T', ' ').substring(0, 19) + ' IST' : null,
        nextScheduled: nextScheduledIST ? nextScheduledIST.toISOString().replace('T', ' ').substring(0, 19) + ' IST' : null,
        taskName: schedule.taskName
      };
    } catch (error) {
      console.error('Error getting cleanup config:', error);
      return {
        intervalDays: this.CLEANUP_INTERVAL_DAYS,
        executionTime: "12:00 AM IST",
        isRunning: this.intervalId !== null,
        isEnabled: false,
        lastExecution: null,
        nextScheduled: null,
        error: "Failed to load configuration"
      };
    }
  }

  /**
   * Enable or disable the cleanup schedule
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      await storage.updateCleanupSchedule(this.CLEANUP_TASK_NAME, {
        isEnabled: enabled
      });
      console.log(`Cleanup scheduler ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating cleanup schedule status:', error);
      throw error;
    }
  }

  /**
   * Reset the cleanup schedule to fix timing issues
   */
  async resetSchedule(): Promise<void> {
    try {
      // Get current schedule to check if we have a last execution time
      const currentSchedule = await storage.getCleanupSchedule(this.CLEANUP_TASK_NAME);
      
      let nextScheduledTime: Date;
      
      if (currentSchedule && currentSchedule.lastExecutionTime) {
        // Use the fixed calculation method that adds exactly 48 hours from last execution
        nextScheduledTime = this.calculateNextScheduledTimeFromLast(currentSchedule.lastExecutionTime);
        console.log('🔄 Resetting schedule based on last execution time');
      } else {
        // No last execution, use the standard calculation from current time
        nextScheduledTime = this.calculateNextScheduledTime();
        console.log('🔄 Resetting schedule based on current time (no prior execution)');
      }
      
      await storage.updateCleanupSchedule(this.CLEANUP_TASK_NAME, {
        nextScheduledTime: nextScheduledTime,
        isEnabled: true
      });
      
      const nextISTTime = new Date(nextScheduledTime.getTime() + (this.IST_OFFSET_HOURS * 60 * 60 * 1000));
      console.log(`🔄 Cleanup schedule reset - next cleanup: ${nextISTTime.toISOString().replace('T', ' ').substring(0, 19)} IST`);
    } catch (error) {
      console.error('Error resetting cleanup schedule:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const cleanupScheduler = new CleanupScheduler();