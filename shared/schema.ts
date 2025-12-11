import { mysqlTable, varchar, int, boolean, timestamp, text, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
});

export const devices = mysqlTable("devices", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: varchar("device_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  mqttBroker: varchar("mqtt_broker", { length: 255 }).notNull(),
  mqttTopic: varchar("mqtt_topic", { length: 255 }).notNull(),
  protocol: varchar("protocol", { length: 10 }).notNull().default("MQTT"), // MQTT, MQTTS, WS, WSS
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("offline"), // online, offline, waiting
  lastSeen: timestamp("last_seen"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: int("display_order").notNull().default(0),
});

export const deviceData = mysqlTable("device_data", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  alcoholLevel: int("alcohol_level").notNull().default(0),
  alertStatus: varchar("alert_status", { length: 50 }).notNull().default("Unknown"),
}, (table) => ({
  deviceIdIdx: index("idx_device_id").on(table.deviceId),
  timestampIdx: index("idx_timestamp").on(table.timestamp),
  deviceTimestampIdx: index("idx_device_timestamp").on(table.deviceId, table.timestamp),
}));

export const deviceOfflineEvents = mysqlTable("device_offline_events", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: varchar("device_id", { length: 255 }).notNull(),
  offlineAt: timestamp("offline_at").notNull().defaultNow(),
}, (table) => ({
  deviceIdIdx: index("idx_offline_device_id").on(table.deviceId),
  offlineAtIdx: index("idx_offline_at").on(table.offlineAt),
}));

export const adminSettings = mysqlTable("admin_settings", {
  id: int("id").primaryKey().autoincrement(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const visitorLogs = mysqlTable("visitor_logs", {
  id: int("id").primaryKey().autoincrement(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv6 support
  userAgent: text("user_agent"),
  browser: varchar("browser", { length: 100 }),
  browserVersion: varchar("browser_version", { length: 50 }),
  operatingSystem: varchar("operating_system", { length: 100 }),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  timezone: varchar("timezone", { length: 100 }),
  isp: varchar("isp", { length: 255 }),
  visitedPage: varchar("visited_page", { length: 500 }),
  referrer: varchar("referrer", { length: 500 }),
  sessionId: varchar("session_id", { length: 100 }),
  visitTime: timestamp("visit_time").notNull().defaultNow(),
});

export const cleanupSchedule = mysqlTable("cleanup_schedule", {
  id: int("id").primaryKey().autoincrement(),
  taskName: varchar("task_name", { length: 100 }).notNull().unique(),
  lastExecutionTime: timestamp("last_execution_time"),
  nextScheduledTime: timestamp("next_scheduled_time"),
  intervalDays: int("interval_days").notNull().default(2),
  executionHour: int("execution_hour").notNull().default(0), // 0-23 (24-hour format)
  executionMinute: int("execution_minute").notNull().default(0), // 0-59
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").primaryKey().autoincrement(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // device_online, device_offline, alert_triggered, data_cleanup, etc.
  deviceId: varchar("device_id", { length: 255 }),
  deviceName: varchar("device_name", { length: 255 }),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  eventTypeIdx: index("idx_activity_event_type").on(table.eventType),
  createdAtIdx: index("idx_activity_created_at").on(table.createdAt),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  lastSeen: true,
}).extend({
  deviceId: z.string().min(1, "Device ID is required"),
  name: z.string().min(1, "Device name is required"),
  mqttBroker: z.string().min(1, "MQTT broker is required"),
  mqttTopic: z.string().min(1, "MQTT topic is required"),
  protocol: z.enum(["MQTT", "MQTTS", "WS", "WSS"]).default("MQTT"),
});

export const insertDeviceDataSchema = createInsertSchema(deviceData).omit({
  id: true,
  timestamp: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertVisitorLogSchema = createInsertSchema(visitorLogs).omit({
  id: true,
  visitTime: true,
});

export const insertCleanupScheduleSchema = createInsertSchema(cleanupSchedule).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type DeviceData = typeof deviceData.$inferSelect;
export type InsertDeviceData = z.infer<typeof insertDeviceDataSchema>;
export type DeviceOfflineEvent = typeof deviceOfflineEvents.$inferSelect;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
export type VisitorLog = typeof visitorLogs.$inferSelect;
export type InsertVisitorLog = z.infer<typeof insertVisitorLogSchema>;
export type CleanupSchedule = typeof cleanupSchedule.$inferSelect;
export type InsertCleanupSchedule = z.infer<typeof insertCleanupScheduleSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
