import { 
  users, 
  devices, 
  deviceData,
  deviceOfflineEvents,
  adminSettings,
  visitorLogs,
  cleanupSchedule,
  activityLogs,
  type User, 
  type InsertUser,
  type Device,
  type InsertDevice,
  type DeviceData,
  type InsertDeviceData,
  type DeviceOfflineEvent,
  type AdminSetting,
  type InsertAdminSetting,
  type VisitorLog,
  type InsertVisitorLog,
  type CleanupSchedule,
  type InsertCleanupSchedule,
  type ActivityLog,
  type InsertActivityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, count, lt, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device methods
  getDevices(): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice & Partial<Pick<Device, 'status' | 'lastSeen'>>): Promise<Device>;
  updateDevice(id: number, updates: Partial<Device>): Promise<Device | undefined>;
  updateDeviceOrder(id: number, displayOrder: number): Promise<Device | undefined>;
  deleteDevice(id: number): Promise<boolean>;
  resetDeviceAutoIncrement(): Promise<void>;
  getMaxDisplayOrder(): Promise<number>;
  normalizeDisplayOrders(): Promise<void>;
  
  // Device data methods
  getDeviceData(deviceId: string, limit?: number): Promise<DeviceData[]>;
  createDeviceData(data: InsertDeviceData): Promise<DeviceData>;
  getLatestDeviceData(deviceId: string): Promise<DeviceData | undefined>;
  logDeviceOfflineEvent(deviceId: string, offlineAt?: Date): Promise<void>;
  getDeviceOfflineEvents(
    deviceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeviceOfflineEvent[]>;
  
  // History and filtering methods
  getDeviceDataFiltered(
    deviceId: string, 
    limit: number, 
    offset: number, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<DeviceData[]>;
  getDeviceDataCount(
    deviceId: string, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<number>;
  
  // Cleanup methods
  cleanupOldDeviceData(olderThanDays: number): Promise<number>;
  clearAllDeviceData(): Promise<number>;
  
  // Admin settings methods
  getAdminSetting(key: string): Promise<AdminSetting | undefined>;
  setAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting>;
  
  // Visitor tracking methods
  createVisitorLog(log: InsertVisitorLog): Promise<VisitorLog>;
  getVisitorLogs(limit?: number, offset?: number): Promise<VisitorLog[]>;
  getVisitorLogsCount(): Promise<number>;
  getRecentVisitors(hours?: number): Promise<VisitorLog[]>;
  clearVisitorLogs(): Promise<number>;
  
  // Cleanup schedule methods
  getCleanupSchedule(taskName: string): Promise<CleanupSchedule | undefined>;
  createCleanupSchedule(schedule: InsertCleanupSchedule): Promise<CleanupSchedule>;
  updateCleanupSchedule(taskName: string, updates: Partial<Omit<CleanupSchedule, 'id' | 'taskName' | 'createdAt'>>): Promise<void>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByType(eventType: string, limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByDevice(deviceId: string, limit?: number): Promise<ActivityLog[]>;
  clearActivityLogs(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private devices: Map<number, Device>;
  private deviceData: Map<number, DeviceData>;
  private offlineEvents: Map<number, DeviceOfflineEvent>;
  private currentUserId: number;
  private currentDeviceId: number;
  private currentDeviceDataId: number;
  private currentOfflineEventId: number;

  constructor() {
    this.users = new Map();
    this.devices = new Map();
    this.deviceData = new Map();
  this.offlineEvents = new Map();
    this.currentUserId = 1;
    this.currentDeviceId = 1;
    this.currentDeviceDataId = 1;
  this.currentOfflineEventId = 1;
    
    // Initialize with some default devices
    this.initializeDefaultDevices();
    
    // Initialize visitor tracking storage (but no test data)
    this.visitorLogs = new Map();
    this.currentVisitorLogId = 1;
  }

  private initializeDefaultDevices() {
    const defaultDevices = [
      {
        deviceId: "EC64C984BAAC",
        name: "Sensor Node 1",
        mqttBroker: "broker.hivemq.com:1883",
        mqttTopic: "sensors/EC64C984BAAC",
        protocol: "MQTT",
        username: "",
        password: "",
        status: "waiting" as const,
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isActive: true,
        displayOrder: 0,
      },
      {
        deviceId: "EC64C984E8B0",
        name: "Org",
        mqttBroker: "98.130.28.156:8084",
        mqttTopic: "breath/EC64C984E8B0",
        protocol: "WS",
        username: "moambulance",
        password: process.env.MQTT_PASSWORD || "",
        status: "waiting" as const,
        lastSeen: new Date(),
        isActive: true,
        displayOrder: 1,
      },
      {
        deviceId: "EC64C984B274",
        name: "Sensor Node 3",
        mqttBroker: "broker.hivemq.com:1883",
        mqttTopic: "sensors/EC64C984B274",
        protocol: "MQTT",
        username: "",
        password: "",
        status: "waiting" as const,
        lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isActive: true,
        displayOrder: 2,
      },
      {
        deviceId: "EC64C984BAB0",
        name: "Sensor Node 4",
        mqttBroker: "broker.hivemq.com:1883",
        mqttTopic: "sensors/EC64C984BAB0",
        protocol: "MQTT",
        username: "",
        password: "",
        status: "online" as const,
        lastSeen: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        isActive: true,
        displayOrder: 3,
      },
    ];

    defaultDevices.forEach(device => {
      const deviceRecord: Device = {
        id: this.currentDeviceId++,
        ...device,
      };
      this.devices.set(deviceRecord.id, deviceRecord);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Device methods
  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    return Array.from(this.devices.values()).find(
      (device) => device.deviceId === deviceId,
    );
  }

  async createDevice(insertDevice: InsertDevice & Partial<Pick<Device, 'status' | 'lastSeen'>>): Promise<Device> {
    const id = this.currentDeviceId++;
    const maxOrder = await this.getMaxDisplayOrder();
    const device: Device = { 
      ...insertDevice, 
      id,
      status: insertDevice.status || "offline",
      lastSeen: insertDevice.lastSeen || null,
      isActive: insertDevice.isActive !== undefined ? insertDevice.isActive : true,
      username: insertDevice.username || null,
      password: insertDevice.password || null,
      displayOrder: maxOrder + 1,
    };
    this.devices.set(id, device);
    return device;
  }

  async updateDevice(id: number, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updates };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async updateDeviceOrder(id: number, displayOrder: number): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, displayOrder };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async getMaxDisplayOrder(): Promise<number> {
    const allDevices = Array.from(this.devices.values());
    if (allDevices.length === 0) return -1;
    return Math.max(...allDevices.map(d => d.displayOrder || 0));
  }

  async normalizeDisplayOrders(): Promise<void> {
    const allDevices = Array.from(this.devices.values())
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.id - b.id);
    
    allDevices.forEach((device, index) => {
      device.displayOrder = index;
      this.devices.set(device.id, device);
    });
  }

  async deleteDevice(id: number): Promise<boolean> {
    const device = this.devices.get(id);
    if (!device) return false;
    
    // Hard delete - completely remove from memory
    this.devices.delete(id);
    return true;
  }

  async resetDeviceAutoIncrement(): Promise<void> {
    // For memory storage, reset the device counter to the next sequential number
    const maxId = Math.max(0, ...Array.from(this.devices.keys()));
    this.currentDeviceId = maxId + 1;
  }

  // Device data methods
  async getDeviceData(deviceId: string, limit: number = 100): Promise<DeviceData[]> {
    return Array.from(this.deviceData.values())
      .filter(data => data.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createDeviceData(insertData: InsertDeviceData): Promise<DeviceData> {
    const id = this.currentDeviceDataId++;
    const data: DeviceData = { 
      deviceId: insertData.deviceId,
      alcoholLevel: insertData.alcoholLevel ?? 0,
      alertStatus: insertData.alertStatus ?? "Unknown",
      id,
      timestamp: new Date(),
    };
    this.deviceData.set(id, data);
    return data;
  }

  async getLatestDeviceData(deviceId: string): Promise<DeviceData | undefined> {
    const deviceDataArray = Array.from(this.deviceData.values())
      .filter(data => data.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return deviceDataArray[0];
  }

  async logDeviceOfflineEvent(deviceId: string, offlineAt: Date = new Date()): Promise<void> {
    const id = this.currentOfflineEventId++;
    const event: DeviceOfflineEvent = {
      id,
      deviceId,
      offlineAt,
    };
    this.offlineEvents.set(id, event);
  }

  async getDeviceOfflineEvents(
    deviceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeviceOfflineEvent[]> {
    let events = Array.from(this.offlineEvents.values())
      .filter(event => event.deviceId === deviceId);

    if (startDate) {
      events = events.filter(event => event.offlineAt >= startDate);
    }

    if (endDate) {
      events = events.filter(event => event.offlineAt <= endDate);
    }

    return events.sort((a, b) => a.offlineAt.getTime() - b.offlineAt.getTime());
  }

  // History and filtering methods
  async getDeviceDataFiltered(
    deviceId: string, 
    limit: number, 
    offset: number, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<DeviceData[]> {
    let filteredData = Array.from(this.deviceData.values())
      .filter(data => data.deviceId === deviceId);
    
    if (startDate) {
      filteredData = filteredData.filter(data => data.timestamp >= startDate);
    }
    
    if (endDate) {
      filteredData = filteredData.filter(data => data.timestamp <= endDate);
    }
    
    if (alertStatus) {
      filteredData = filteredData.filter(data => data.alertStatus === alertStatus);
    }
    
    return filteredData
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  private getAlertStatus(alcoholLevel: number): string {
    if (alcoholLevel >= 2500) {
      return "Completely Drunk";
    } else if (alcoholLevel >= 1700) {
      return "Moderate Drunk";
    } else {
      return "Normal";
    }
  }

  async getDeviceDataCount(
    deviceId: string, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<number> {
    let filteredData = Array.from(this.deviceData.values())
      .filter(data => data.deviceId === deviceId);
    
    if (startDate) {
      filteredData = filteredData.filter(data => data.timestamp >= startDate);
    }
    
    if (endDate) {
      filteredData = filteredData.filter(data => data.timestamp <= endDate);
    }
    
    if (alertStatus) {
      filteredData = filteredData.filter(data => data.alertStatus === alertStatus);
    }
    
    return filteredData.length;
  }

  async cleanupOldDeviceData(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const oldDataArray = Array.from(this.deviceData.values())
      .filter(data => data.timestamp < cutoffDate);
    
    let deletedCount = 0;
    for (const data of oldDataArray) {
      this.deviceData.delete(data.id);
      deletedCount++;
    }
    
    return deletedCount;
  }

  async clearAllDeviceData(): Promise<number> {
    const currentCount = this.deviceData.size;
    this.deviceData.clear();
    return currentCount;
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    // For memory storage, return PIN 1541 if it's the admin_pin key
    if (key === 'admin_pin') {
      return {
        id: 1,
        settingKey: 'admin_pin',
        settingValue: '1541',
        updatedAt: new Date()
      };
    }
    return undefined;
  }

  async setAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    // For memory storage, just return the setting with an ID
    return {
      id: 1,
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      updatedAt: new Date()
    };
  }

  // Visitor tracking methods - Memory storage implementation
  private visitorLogs: Map<number, VisitorLog> = new Map();
  private currentVisitorLogId: number = 1;

  async createVisitorLog(log: InsertVisitorLog): Promise<VisitorLog> {
    const id = this.currentVisitorLogId++;
    const visitorLog: VisitorLog = {
      id,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent || null,
      browser: log.browser || null,
      browserVersion: log.browserVersion || null,
      operatingSystem: log.operatingSystem || null,
      country: log.country || null,
      region: log.region || null,
      city: log.city || null,
      latitude: log.latitude || null,
      longitude: log.longitude || null,
      timezone: log.timezone || null,
      isp: log.isp || null,
      visitedPage: log.visitedPage || null,
      referrer: log.referrer || null,
      sessionId: log.sessionId || null,
      visitTime: new Date(),
    };
    this.visitorLogs.set(id, visitorLog);
    return visitorLog;
  }

  async getVisitorLogs(limit: number = 100, offset: number = 0): Promise<VisitorLog[]> {
    return Array.from(this.visitorLogs.values())
      .sort((a, b) => b.visitTime.getTime() - a.visitTime.getTime())
      .slice(offset, offset + limit);
  }

  async getVisitorLogsCount(): Promise<number> {
    return this.visitorLogs.size;
  }

  async getRecentVisitors(hours: number = 24): Promise<VisitorLog[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return Array.from(this.visitorLogs.values())
      .filter(log => log.visitTime >= cutoffTime)
      .sort((a, b) => b.visitTime.getTime() - a.visitTime.getTime());
  }

  async clearVisitorLogs(): Promise<number> {
    const count = this.visitorLogs.size;
    this.visitorLogs.clear();
    this.currentVisitorLogId = 1;
    return count;
  }

  // Cleanup schedule methods - Memory storage implementation
  private cleanupSchedules: Map<string, CleanupSchedule> = new Map();
  private currentCleanupScheduleId: number = 1;

  async getCleanupSchedule(taskName: string): Promise<CleanupSchedule | undefined> {
    return Array.from(this.cleanupSchedules.values()).find(schedule => schedule.taskName === taskName);
  }

  async createCleanupSchedule(schedule: InsertCleanupSchedule): Promise<CleanupSchedule> {
    const id = this.currentCleanupScheduleId++;
    const cleanupSched: CleanupSchedule = {
      id,
      taskName: schedule.taskName,
      lastExecutionTime: schedule.lastExecutionTime || null,
      nextScheduledTime: schedule.nextScheduledTime || null,
      intervalDays: schedule.intervalDays || 2,
      executionHour: schedule.executionHour || 0,
      executionMinute: schedule.executionMinute || 0,
      isEnabled: schedule.isEnabled !== undefined ? schedule.isEnabled : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cleanupSchedules.set(schedule.taskName, cleanupSched);
    return cleanupSched;
  }

  async updateCleanupSchedule(taskName: string, updates: Partial<Omit<CleanupSchedule, 'id' | 'taskName' | 'createdAt'>>): Promise<void> {
    const schedule = await this.getCleanupSchedule(taskName);
    if (schedule) {
      const updatedSchedule = { ...schedule, ...updates, updatedAt: new Date() };
      this.cleanupSchedules.set(taskName, updatedSchedule);
    }
  }

  // Activity log methods - Memory storage implementation
  private activityLogs: Map<number, ActivityLog> = new Map();
  private currentActivityLogId: number = 1;

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.currentActivityLogId++;
    const activityLog: ActivityLog = {
      id,
      eventType: log.eventType,
      deviceId: log.deviceId || null,
      deviceName: log.deviceName || null,
      description: log.description,
      metadata: log.metadata || null,
      createdAt: new Date(),
    };
    this.activityLogs.set(id, activityLog);
    
    // Keep only the last 100 entries
    if (this.activityLogs.size > 100) {
      const keysToDelete = Array.from(this.activityLogs.keys()).slice(0, this.activityLogs.size - 100);
      keysToDelete.forEach(key => this.activityLogs.delete(key));
    }
    
    return activityLog;
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getActivityLogsByType(eventType: string, limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.eventType === eventType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getActivityLogsByDevice(deviceId: string, limit: number = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.deviceId === deviceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async clearActivityLogs(): Promise<number> {
    const count = this.activityLogs.size;
    this.activityLogs.clear();
    this.currentActivityLogId = 1;
    return count;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser);
    
    // Get the inserted user
    const [newUser] = await db.select().from(users).where(eq(users.username, insertUser.username));
    return newUser;
  }

  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device || undefined;
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices)
      .where(eq(devices.deviceId, deviceId));
    return device || undefined;
  }

  async createDevice(insertDevice: InsertDevice & Partial<Pick<Device, 'status' | 'lastSeen'>>): Promise<Device> {
    // Find the next sequential ID by getting the maximum ID and adding 1
    const maxIdResult = await db.select({
      maxId: sql<number>`COALESCE(MAX(id), 0)`
    }).from(devices);
    
    const nextSequentialId = (maxIdResult[0]?.maxId || 0) + 1;
    
    // Get max display order to append new device at the end
    const maxOrder = await this.getMaxDisplayOrder();
    
    // Insert device with explicitly set sequential ID
    await db.insert(devices).values({
      id: nextSequentialId,
      ...insertDevice,
      username: insertDevice.username || null,
      password: insertDevice.password || null,
      status: insertDevice.status || "offline",
      lastSeen: insertDevice.lastSeen || null,
      displayOrder: maxOrder + 1,
    });
    
    // Get the inserted device
    const [newDevice] = await db.select().from(devices)
      .where(eq(devices.deviceId, insertDevice.deviceId));
    return newDevice;
  }

  async updateDevice(id: number, updates: Partial<Device>): Promise<Device | undefined> {
    await db.update(devices)
      .set(updates)
      .where(eq(devices.id, id));
    
    const [updatedDevice] = await db.select().from(devices).where(eq(devices.id, id));
    return updatedDevice || undefined;
  }

  async updateDeviceOrder(id: number, displayOrder: number): Promise<Device | undefined> {
    await db.update(devices)
      .set({ displayOrder })
      .where(eq(devices.id, id));
    
    const [updatedDevice] = await db.select().from(devices).where(eq(devices.id, id));
    return updatedDevice || undefined;
  }

  async getMaxDisplayOrder(): Promise<number> {
    const result = await db.select({
      maxOrder: sql<number>`COALESCE(MAX(display_order), -1)`
    }).from(devices);
    return result[0]?.maxOrder ?? -1;
  }

  async normalizeDisplayOrders(): Promise<void> {
    // Get all devices sorted by current displayOrder, then by id as tiebreaker
    const allDevices = await db.select().from(devices)
      .orderBy(asc(devices.displayOrder), asc(devices.id));
    
    // Assign sequential displayOrder values starting from 0
    for (let i = 0; i < allDevices.length; i++) {
      await db.update(devices)
        .set({ displayOrder: i })
        .where(eq(devices.id, allDevices[i].id));
    }
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db.delete(devices)
      .where(eq(devices.id, id));
    
    return true;
  }

  async resetDeviceAutoIncrement(): Promise<void> {
    // Get the maximum ID currently in the devices table
    const maxIdResult = await db.select({
      maxId: sql<number>`COALESCE(MAX(id), 0)`
    }).from(devices);
    
    const nextId = (maxIdResult[0]?.maxId || 0) + 1;
    
    // Reset the auto_increment counter to the next sequential value
    await db.execute(sql`ALTER TABLE devices AUTO_INCREMENT = ${nextId}`);
  }

  async getDeviceData(deviceId: string, limit: number = 100): Promise<DeviceData[]> {
    return await db.select().from(deviceData)
      .where(eq(deviceData.deviceId, deviceId))
      .orderBy(desc(deviceData.timestamp))
      .limit(limit);
  }

  async createDeviceData(insertData: InsertDeviceData): Promise<DeviceData> {
    await db.insert(deviceData).values(insertData);
    
    // Get the latest inserted data for this device
    const [newData] = await db.select().from(deviceData)
      .where(eq(deviceData.deviceId, insertData.deviceId))
      .orderBy(desc(deviceData.timestamp))
      .limit(1);
    return newData;
  }

  async getLatestDeviceData(deviceId: string): Promise<DeviceData | undefined> {
    const [data] = await db.select().from(deviceData)
      .where(eq(deviceData.deviceId, deviceId))
      .orderBy(desc(deviceData.timestamp))
      .limit(1);
    
    return data || undefined;
  }

  async logDeviceOfflineEvent(deviceId: string, offlineAt: Date = new Date()): Promise<void> {
    await db.insert(deviceOfflineEvents).values({
      deviceId,
      offlineAt,
    });
  }

  async getDeviceOfflineEvents(
    deviceId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeviceOfflineEvent[]> {
    const conditions = [eq(deviceOfflineEvents.deviceId, deviceId)];

    if (startDate) {
      conditions.push(gte(deviceOfflineEvents.offlineAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(deviceOfflineEvents.offlineAt, endDate));
    }

    return await db.select().from(deviceOfflineEvents)
      .where(and(...conditions))
      .orderBy(deviceOfflineEvents.offlineAt);
  }

  // History and filtering methods
  async getDeviceDataFiltered(
    deviceId: string, 
    limit: number, 
    offset: number, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<DeviceData[]> {
    const conditions = [eq(deviceData.deviceId, deviceId)];
    
    if (startDate) {
      conditions.push(gte(deviceData.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(deviceData.timestamp, endDate));
    }
    
    if (alertStatus) {
      conditions.push(eq(deviceData.alertStatus, alertStatus));
    }
    
    return await db.select().from(deviceData)
      .where(and(...conditions))
      .orderBy(desc(deviceData.timestamp))
      .limit(limit)
      .offset(offset);
  }

  private getAlertStatus(alcoholLevel: number): string {
    if (alcoholLevel >= 2500) {
      return "Completely Drunk";
    } else if (alcoholLevel >= 1700) {
      return "Moderate Drunk";
    } else {
      return "Normal";
    }
  }

  async getDeviceDataCount(
    deviceId: string, 
    startDate?: Date, 
    endDate?: Date,
    alertStatus?: string
  ): Promise<number> {
    const conditions = [eq(deviceData.deviceId, deviceId)];
    
    if (startDate) {
      conditions.push(gte(deviceData.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(deviceData.timestamp, endDate));
    }
    
    if (alertStatus) {
      conditions.push(eq(deviceData.alertStatus, alertStatus));
    }
    
    const [result] = await db.select({ count: count() }).from(deviceData)
      .where(and(...conditions));
    
    return result.count;
  }

  async cleanupOldDeviceData(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // Simple and fast ORM query
    const result = await db.delete(deviceData)
      .where(lt(deviceData.timestamp, cutoffDate));
    
    return 0; // MySQL2 doesn't provide affectedRows in this format
  }

  async clearAllDeviceData(): Promise<number> {
    // Count first, then delete
    const [countResult] = await db.select({ count: count() }).from(deviceData);
    const totalRecords = countResult.count;
    
    if (totalRecords > 0) {
      await db.delete(deviceData);
    }
    
    return totalRecords;
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    try {
      const [setting] = await db.select().from(adminSettings)
        .where(eq(adminSettings.settingKey, key));
      return setting || undefined;
    } catch (error) {
      // If table doesn't exist, return default PIN for admin_pin key
      if (key === 'admin_pin') {
        return {
          id: 1,
          settingKey: 'admin_pin',
          settingValue: '1541',
          updatedAt: new Date()
        };
      }
      return undefined;
    }
  }

  async setAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    try {
      // Try to update existing setting first
      const existingSetting = await this.getAdminSetting(setting.settingKey);
      
      if (existingSetting) {
        await db.update(adminSettings)
          .set({ 
            settingValue: setting.settingValue,
            updatedAt: new Date()
          })
          .where(eq(adminSettings.settingKey, setting.settingKey));
        
        return {
          ...existingSetting,
          settingValue: setting.settingValue,
          updatedAt: new Date()
        };
      } else {
        // Insert new setting
        await db.insert(adminSettings).values(setting);
        
        // Return the inserted setting
        const [newSetting] = await db.select().from(adminSettings)
          .where(eq(adminSettings.settingKey, setting.settingKey));
        return newSetting;
      }
    } catch (error) {
      // If table doesn't exist, just return the setting with an ID
      return {
        id: 1,
        settingKey: setting.settingKey,
        settingValue: setting.settingValue,
        updatedAt: new Date()
      };
    }
  }

  // Visitor tracking methods - Database storage implementation
  async createVisitorLog(log: InsertVisitorLog): Promise<VisitorLog> {
    try {
      await db.insert(visitorLogs).values({
        ipAddress: log.ipAddress,
        userAgent: log.userAgent || null,
        browser: log.browser || null,
        browserVersion: log.browserVersion || null,
        operatingSystem: log.operatingSystem || null,
        country: log.country || null,
        region: log.region || null,
        city: log.city || null,
        latitude: log.latitude || null,
        longitude: log.longitude || null,
        timezone: log.timezone || null,
        isp: log.isp || null,
        visitedPage: log.visitedPage || null,
        referrer: log.referrer || null,
        sessionId: log.sessionId || null,
      });
      
      // Get the latest inserted visitor log
      const [newLog] = await db.select().from(visitorLogs)
        .where(eq(visitorLogs.ipAddress, log.ipAddress))
        .orderBy(desc(visitorLogs.visitTime))
        .limit(1);
      return newLog;
    } catch (error) {
      console.error('Failed to create visitor log:', error);
      throw error;
    }
  }

  async getVisitorLogs(limit: number = 100, offset: number = 0): Promise<VisitorLog[]> {
    try {
      return await db.select().from(visitorLogs)
        .orderBy(desc(visitorLogs.visitTime))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error('Failed to get visitor logs:', error);
      return [];
    }
  }

  async getVisitorLogsCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() }).from(visitorLogs);
      return result.count;
    } catch (error) {
      console.error('Failed to get visitor logs count:', error);
      return 0;
    }
  }

  async getRecentVisitors(hours: number = 24): Promise<VisitorLog[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      return await db.select().from(visitorLogs)
        .where(gte(visitorLogs.visitTime, cutoffTime))
        .orderBy(desc(visitorLogs.visitTime));
    } catch (error) {
      console.error('Failed to get recent visitors:', error);
      return [];
    }
  }

  async clearVisitorLogs(): Promise<number> {
    try {
      // First get the count of records to be deleted
      const [countResult] = await db.select({ count: count() }).from(visitorLogs);
      const deletedCount = countResult.count;
      
      // Delete all visitor logs
      await db.delete(visitorLogs);
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear visitor logs:', error);
      throw error;
    }
  }

  // Cleanup schedule methods - Database storage implementation
  async getCleanupSchedule(taskName: string): Promise<CleanupSchedule | undefined> {
    try {
      await this.ensureCleanupScheduleTableExists();
      const [schedule] = await db.select().from(cleanupSchedule).where(eq(cleanupSchedule.taskName, taskName));
      return schedule || undefined;
    } catch (error) {
      console.error('Failed to get cleanup schedule:', error);
      return undefined;
    }
  }

  private async ensureCleanupScheduleTableExists(): Promise<void> {
    try {
      // Try to create the table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS cleanup_schedule (
          id INT PRIMARY KEY AUTO_INCREMENT,
          task_name VARCHAR(100) NOT NULL UNIQUE,
          last_execution_time TIMESTAMP NULL,
          next_scheduled_time TIMESTAMP NULL,
          interval_days INT NOT NULL DEFAULT 2,
          execution_hour INT NOT NULL DEFAULT 0,
          execution_minute INT NOT NULL DEFAULT 0,
          is_enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      // Table might already exist, ignore the error
    }
  }

  async createCleanupSchedule(schedule: InsertCleanupSchedule): Promise<CleanupSchedule> {
    try {
      await this.ensureCleanupScheduleTableExists();
      await db.insert(cleanupSchedule).values(schedule);
      
      // Return the inserted schedule
      const [newSchedule] = await db.select().from(cleanupSchedule)
        .where(eq(cleanupSchedule.taskName, schedule.taskName));
      return newSchedule;
    } catch (error) {
      console.error('Failed to create cleanup schedule:', error);
      throw error;
    }
  }

  async updateCleanupSchedule(taskName: string, updates: Partial<Omit<CleanupSchedule, 'id' | 'taskName' | 'createdAt'>>): Promise<void> {
    try {
      await this.ensureCleanupScheduleTableExists();
      await db.update(cleanupSchedule)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(cleanupSchedule.taskName, taskName));
    } catch (error) {
      console.error('Failed to update cleanup schedule:', error);
      throw error;
    }
  }

  // Activity log methods - Database storage implementation
  private async ensureActivityLogsTableExists(): Promise<void> {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          event_type VARCHAR(50) NOT NULL,
          device_id VARCHAR(255),
          device_name VARCHAR(255),
          description TEXT NOT NULL,
          metadata TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_activity_event_type (event_type),
          INDEX idx_activity_created_at (created_at)
        )
      `);
    } catch (error) {
      // Table might already exist, ignore the error
    }
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    try {
      await this.ensureActivityLogsTableExists();
      await db.insert(activityLogs).values({
        eventType: log.eventType,
        deviceId: log.deviceId || null,
        deviceName: log.deviceName || null,
        description: log.description,
        metadata: log.metadata || null,
      });
      
      // Get the latest inserted activity log
      const [newLog] = await db.select().from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(1);
      return newLog;
    } catch (error) {
      console.error('Failed to create activity log:', error);
      throw error;
    }
  }

  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    try {
      await this.ensureActivityLogsTableExists();
      return await db.select().from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      return [];
    }
  }

  async getActivityLogsByType(eventType: string, limit: number = 50): Promise<ActivityLog[]> {
    try {
      await this.ensureActivityLogsTableExists();
      return await db.select().from(activityLogs)
        .where(eq(activityLogs.eventType, eventType))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get activity logs by type:', error);
      return [];
    }
  }

  async getActivityLogsByDevice(deviceId: string, limit: number = 50): Promise<ActivityLog[]> {
    try {
      await this.ensureActivityLogsTableExists();
      return await db.select().from(activityLogs)
        .where(eq(activityLogs.deviceId, deviceId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get activity logs by device:', error);
      return [];
    }
  }

  async clearActivityLogs(): Promise<number> {
    try {
      await this.ensureActivityLogsTableExists();
      const [countResult] = await db.select({ count: count() }).from(activityLogs);
      const deletedCount = countResult.count;
      
      await db.delete(activityLogs);
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to clear activity logs:', error);
      throw error;
    }
  }
}

// Use database storage by default, fallback to memory storage if database fails
let storage: IStorage;

try {
  storage = new DatabaseStorage();
  // Using MySQL database storage
} catch (error) {
  console.log('Failed to connect to MySQL database, falling back to memory storage');
  storage = new MemStorage();
}

export { storage };
