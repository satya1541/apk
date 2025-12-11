// Database-backed activity logger for tracking system events
// Uses MySQL storage via the IStorage interface

import { storage } from "./storage";
import type { ActivityLog, InsertActivityLog } from "@shared/schema";

export interface ActivityLogEntry {
  id: number;
  eventType: 'device_online' | 'device_offline' | 'alert_triggered' | 'data_cleanup' | 'device_created' | 'device_deleted' | 'device_updated';
  deviceId?: string | null;
  deviceName?: string | null;
  description: string;
  metadata?: string | null;
  createdAt: Date;
}

class ActivityLogger {
  async log(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<ActivityLog> {
    const insertLog: InsertActivityLog = {
      eventType: entry.eventType,
      deviceId: entry.deviceId || undefined,
      deviceName: entry.deviceName || undefined,
      description: entry.description,
      metadata: entry.metadata ? (typeof entry.metadata === 'string' ? entry.metadata : JSON.stringify(entry.metadata)) : undefined,
    };
    
    return await storage.createActivityLog(insertLog);
  }

  async getLogs(limit: number = 50): Promise<ActivityLog[]> {
    return await storage.getActivityLogs(limit);
  }

  async getLogsByType(eventType: string, limit: number = 50): Promise<ActivityLog[]> {
    return await storage.getActivityLogsByType(eventType, limit);
  }

  async getLogsByDevice(deviceId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await storage.getActivityLogsByDevice(deviceId, limit);
  }

  async clear(): Promise<number> {
    return await storage.clearActivityLogs();
  }
}

export const activityLogger = new ActivityLogger();
