import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertDeviceDataSchema, insertAdminSettingSchema, type DeviceData, type VisitorLog } from "@shared/schema";
import * as XLSX from 'xlsx';
import { z } from "zod";
import { mqttClient } from "./mqtt-client";
import { cleanupScheduler } from "./cleanup-scheduler";
import { activityLogger } from "./activity-logger";

// Helper function to calculate alert status based on alcohol level
function calculateAlertStatus(alcoholLevel: number): string {
  if (alcoholLevel >= 2500) {
    return "Completely Drunk";
  } else if (alcoholLevel >= 1700) {
    return "Moderate Drunk";
  } else {
    return "Normal";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Store active WebSocket connections for broadcasting
  const clients = new Set<WebSocket>();

  // Function to broadcast device updates to all connected clients
  function broadcastDeviceUpdate(device: any) {
    const message = JSON.stringify({
      type: 'device_update',
      data: device,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Function to broadcast sensor data updates to all connected clients
  function broadcastSensorData(deviceId: string, sensorData: any) {
    const message = JSON.stringify({
      type: 'sensor_data',
      deviceId: deviceId,
      data: sensorData,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Function to broadcast visitor updates to all connected clients
  function broadcastVisitorUpdate(visitor: any) {
    const message = JSON.stringify({
      type: 'visitor_update',
      data: visitor,
      timestamp: new Date().toISOString()
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Connect MQTT service with WebSocket broadcasters
  mqttClient.setWebSocketBroadcaster(broadcastDeviceUpdate);
  mqttClient.setSensorDataBroadcaster(broadcastSensorData);

  // Export visitor broadcaster for use in visitor tracker
  (global as any).broadcastVisitorUpdate = broadcastVisitorUpdate;

  // Device routes
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      
      // Check if device ID already exists
      const existingDevice = await storage.getDeviceByDeviceId(deviceData.deviceId);
      if (existingDevice) {
        return res.status(400).json({ message: "Device ID already exists" });
      }
      
      // Set the device as online when created (assuming it's ready to connect)
      const device = await storage.createDevice({
        ...deviceData,
        status: "online",
        lastSeen: new Date(),
      });

      // Log activity
      await activityLogger.log({
        eventType: 'device_created',
        deviceId: device.deviceId,
        deviceName: device.name,
        description: `Device "${device.name}" (${device.deviceId}) was created`
      });

      // Broadcast new device to all connected WebSocket clients
      broadcastDeviceUpdate(device);
      
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  // Reorder devices endpoint - MUST be before routes with :id or :deviceId params
  const reorderSchema = z.object({
    deviceId: z.number().int().positive(),
    direction: z.enum(['up', 'down'])
  });
  
  app.post("/api/devices/reorder", async (req, res) => {
    try {
      const parseResult = reorderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request: deviceId must be a positive integer and direction must be 'up' or 'down'" });
      }
      
      const { deviceId, direction } = parseResult.data;
      
      // Get all devices sorted by displayOrder
      const allDevices = await storage.getDevices();
      const sortedDevices = [...allDevices].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      
      // Find the current device index
      const currentIndex = sortedDevices.findIndex(d => d.id === deviceId);
      if (currentIndex === -1) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Calculate target index
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Check bounds
      if (targetIndex < 0 || targetIndex >= sortedDevices.length) {
        return res.status(400).json({ message: "Cannot move device further in that direction" });
      }
      
      // Swap display orders by exchanging the actual displayOrder values
      const currentDevice = sortedDevices[currentIndex];
      const swapDevice = sortedDevices[targetIndex];
      
      const currentOrder = currentDevice.displayOrder || 0;
      const swapOrder = swapDevice.displayOrder || 0;
      
      // Use updateDeviceOrder to avoid changing status/lastSeen
      await storage.updateDeviceOrder(currentDevice.id, swapOrder);
      await storage.updateDeviceOrder(swapDevice.id, currentOrder);
      
      // Get updated devices list
      const updatedDevices = await storage.getDevices();
      
      // Broadcast updates
      updatedDevices.forEach(device => broadcastDeviceUpdate(device));
      
      res.json({ message: "Device order updated", devices: updatedDevices });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder devices" });
    }
  });

  // API endpoint to receive device data from external systems
  app.post("/api/devices/:deviceId/data", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Validate deviceId parameter
      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }
      
      const { alcohol_level, timestamp } = req.body;
      
      // Received data for device
      
      // Validate input
      if (alcohol_level === undefined || alcohol_level === null) {
        return res.status(400).json({ message: "alcohol_level is required" });
      }
      
      // Validate device exists
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Found device
      
      // Calculate alert status based on alcohol level
      const alcoholLevelNum = typeof alcohol_level === 'number' ? alcohol_level : parseInt(alcohol_level) || 0;
      const alertStatus = calculateAlertStatus(alcoholLevelNum);
      
      // Store the device data with dedicated columns
      const deviceData = await storage.createDeviceData({
        deviceId: deviceId,
        alcoholLevel: alcoholLevelNum,
        alertStatus: alertStatus,
      });
      
      // Stored device data
      
      // Update device status to online and last seen
      const updatedDevice = await storage.updateDevice(device.id, {
        status: 'online',
        lastSeen: new Date(),
      });
      
      // Updated device status
      
      res.status(201).json({ message: "Data received successfully", data: deviceData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to store device data", error: errorMessage });
    }
  });

  app.put("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }

      const updateSchema = insertDeviceSchema.partial();
      const parsedUpdates = updateSchema.parse(req.body);

      const deviceUpdates = {
        ...parsedUpdates,
        status: 'online',
        lastSeen: new Date(),
      };
      
      const device = await storage.updateDevice(id, deviceUpdates);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Log activity
      await activityLogger.log({
        eventType: 'device_updated',
        deviceId: device.deviceId,
        deviceName: device.name,
        description: `Device "${device.name}" (${device.deviceId}) was updated`
      });

      // Broadcast device status update to all connected WebSocket clients
      broadcastDeviceUpdate(device);
      
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }

      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Log activity before deletion
      await activityLogger.log({
        eventType: 'device_deleted',
        deviceId: device.deviceId,
        deviceName: device.name,
        description: `Device "${device.name}" (${device.deviceId}) was deleted`
      });
      
      // Broadcast device deletion immediately to all connected WebSocket clients
      const deleteMessage = JSON.stringify({
        type: 'device_deleted',
        deviceId: device.deviceId,
        id: device.id,
        timestamp: new Date().toISOString()
      });
      
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(deleteMessage);
        }
      });
      
      // Respond immediately before database operation completes
      res.json({ message: "Device deleted successfully" });
      
      // Delete from database asynchronously 
      storage.deleteDevice(id).catch(() => {
        // Device deletion failed - already broadcasted to clients
      });
      
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Device data routes
  app.get("/api/devices/:deviceId/data", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Validate deviceId parameter
      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }
      
      // Validate and sanitize limit parameter
      const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit as string) || 100));
      const data = await storage.getDeviceData(deviceId, limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device data" });
    }
  });

  app.get("/api/devices/:deviceId/data/latest", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Validate deviceId parameter
      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }
      const data = await storage.getLatestDeviceData(deviceId);
      res.json(data || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch latest device data" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const onlineDevices = devices.filter(d => d.status === "online").length;
      const waitingDevices = devices.filter(d => d.status === "waiting").length;
      const offlineDevices = devices.filter(d => d.status === "offline").length;
      
      // Calculate total messages (mock for now)
      const totalMessages = Math.floor(Math.random() * 2000) + 1000;
      
      res.json({
        onlineDevices,
        waitingDevices,
        offlineDevices,
        totalMessages,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Activity logs route
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
      const eventType = req.query.eventType as string | undefined;
      const deviceId = req.query.deviceId as string | undefined;
      
      let logs;
      if (deviceId) {
        logs = await activityLogger.getLogsByDevice(deviceId, limit);
      } else if (eventType) {
        logs = await activityLogger.getLogsByType(eventType, limit);
      } else {
        logs = await activityLogger.getLogs(limit);
      }
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // History data routes with pagination and date filtering
  app.get("/api/history/devices/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Validate deviceId parameter
      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }
      const { 
        page = "1", 
        limit = "50", 
        startDate, 
        endDate,
        alertStatus
      } = req.query as { 
        page?: string; 
        limit?: string; 
        startDate?: string; 
        endDate?: string;
        alertStatus?: string;
      };
      
      // Validate and sanitize pagination parameters
      const pageNum = Math.max(1, parseInt(page) || 1); // Minimum page 1
      const limitNum = Math.max(1, Math.min(500, parseInt(limit) || 50)); // Between 1 and 500
      const offset = (pageNum - 1) * limitNum;
      
      // Validate device exists
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Get filtered data with pagination
      const data = await storage.getDeviceDataFiltered(
        deviceId, 
        limitNum, 
        offset, 
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        alertStatus
      );
      
      // Get total count for pagination
      const totalCount = await storage.getDeviceDataCount(
        deviceId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        alertStatus
      );
      
      res.json({
        data,
        device,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device history" });
    }
  });

  // Export device data to Excel
  app.get("/api/history/devices/:deviceId/export", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Validate deviceId parameter
      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return res.status(400).json({ message: "Valid device ID is required" });
      }

      const { startDate, endDate, limit } = req.query as {
        startDate?: string;
        endDate?: string;
        limit?: string;
      };
      const exportLimit = Math.min(
        Math.max(parseInt(limit || "1000", 10) || 1000, 100),
        20000
      );
      
      // Validate device exists
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const startDateFilter = startDate ? new Date(startDate) : undefined;
      const endDateFilter = endDate ? new Date(endDate) : undefined;

      // Get all data for export with configurable limit
      const data = await storage.getDeviceDataFiltered(
        deviceId,
        exportLimit,
        0,
        startDateFilter,
        endDateFilter
      );

      const exportRangeStart = startDateFilter || (data.length ? data[data.length - 1].timestamp : undefined);
      const exportRangeEnd = endDateFilter || (data.length ? data[0].timestamp : undefined);
      const offlineEvents = exportRangeStart || exportRangeEnd
        ? await storage.getDeviceOfflineEvents(deviceId, exportRangeStart, exportRangeEnd)
        : [];
      
      // Prepare Excel data
      const sortedOfflineEvents = [...offlineEvents].sort((a, b) => a.offlineAt.getTime() - b.offlineAt.getTime());
      let offlinePointer = 0;
      let latestOffline: Date | null = null;

      const excelData = data.map((item: DeviceData) => {
        while (offlinePointer < sortedOfflineEvents.length && sortedOfflineEvents[offlinePointer].offlineAt <= item.timestamp) {
          latestOffline = sortedOfflineEvents[offlinePointer].offlineAt;
          offlinePointer++;
        }
        
        return {
          'Date': item.timestamp.toISOString().split('T')[0],
          'Time': item.timestamp.toTimeString().split(' ')[0],
          'Timestamp': item.timestamp.toISOString(),
          'Device ID': item.deviceId,
          'Device Name': device.name,
          'Alcohol Level': item.alcoholLevel,
          'Alert Status': item.alertStatus,
          'Last Offline Before Reading': latestOffline ? latestOffline.toISOString() : 'No offline event yet'
        };
      });
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Device Data');

      const offlineSheetRows = sortedOfflineEvents.length
        ? sortedOfflineEvents.map((event) => ({
            'Device ID': device.deviceId,
            'Device Name': device.name,
            'Went Offline At': event.offlineAt.toISOString(),
          }))
        : [{
            'Device ID': device.deviceId,
            'Device Name': device.name,
            'Went Offline At': 'No offline events in selected range',
          }];
      const offlineSheet = XLSX.utils.json_to_sheet(offlineSheetRows);
      XLSX.utils.book_append_sheet(workbook, offlineSheet, 'Offline Events');
      
      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const filename = `${device.name}_${deviceId}_data_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Export-Limit', String(exportLimit));
      res.setHeader('X-Export-Rows', String(data.length));
      
      res.send(excelBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export device data" });
    }
  });

  // Cleanup management routes
  app.get("/api/cleanup/status", async (req, res) => {
    try {
      const config = await cleanupScheduler.getConfig();
      res.json({
        message: "Cleanup scheduler status",
        config: config
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get cleanup status" });
    }
  });

  app.post("/api/cleanup/run", async (req, res) => {
    try {
      const deletedCount = await cleanupScheduler.runCleanup();
      res.json({
        message: "Manual cleanup completed",
        deletedRecords: deletedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to run manual cleanup" });
    }
  });

  app.post("/api/cleanup/clear-all", async (req, res) => {
    try {
      const deletedCount = await storage.clearAllDeviceData();
      res.json({
        message: "All device data cleared",
        deletedRecords: deletedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear all device data" });
    }
  });

  app.post("/api/cleanup/enable", async (req, res) => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "enabled field must be a boolean" });
      }
      
      await cleanupScheduler.setEnabled(enabled);
      res.json({
        message: `Cleanup scheduler ${enabled ? 'enabled' : 'disabled'}`,
        enabled: enabled
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update cleanup scheduler status" });
    }
  });

  app.post("/api/cleanup/reset-schedule", async (req, res) => {
    try {
      await cleanupScheduler.resetSchedule();
      const config = await cleanupScheduler.getConfig();
      res.json({
        message: "Cleanup schedule reset successfully",
        config: config
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset cleanup schedule" });
    }
  });

  // Admin Settings routes
  app.get("/api/admin/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getAdminSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin setting" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    try {
      const validatedData = insertAdminSettingSchema.parse(req.body);
      
      // Special handling for admin PIN - ensure it's exactly 4 digits
      if (validatedData.settingKey === 'admin_pin') {
        const pin = validatedData.settingValue;
        if (!/^\d{4}$/.test(pin)) {
          return res.status(400).json({ 
            message: "Admin PIN must be exactly 4 digits" 
          });
        }
      }
      
      const setting = await storage.setAdminSetting(validatedData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid setting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update admin setting" });
    }
  });

  // Fix device ID sequencing
  app.post("/api/admin/reset-device-autoincrement", async (req, res) => {
    try {
      await storage.resetDeviceAutoIncrement();
      res.json({
        message: "Device auto-increment counter reset to sequential order",
        success: true
      });
    } catch (error) {
      console.error("Error resetting device auto-increment:", error);
      res.status(500).json({ message: "Failed to reset device auto-increment counter" });
    }
  });

  // Cache for admin PIN to improve performance
  let cachedAdminPin: string | null = null;
  let pinCacheExpiry = 0;
  
  // Secure PIN verification endpoint with caching
  app.post("/api/admin/verify-pin", async (req, res) => {
    try {
      const { pin } = req.body;
      
      if (!pin || typeof pin !== 'string') {
        return res.status(400).json({ message: "PIN is required" });
      }
      
      // Check cache first (cache for 5 minutes)
      const now = Date.now();
      if (!cachedAdminPin || now > pinCacheExpiry) {
        const setting = await storage.getAdminSetting('admin_pin');
        if (!setting) {
          return res.status(500).json({ message: "Admin configuration not found" });
        }
        cachedAdminPin = setting.settingValue;
        pinCacheExpiry = now + 5 * 60 * 1000; // Cache for 5 minutes
      }
      
      const isValid = pin === cachedAdminPin;
      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ message: "Failed to verify PIN" });
    }
  });

  // IP Lookup routes (proxy to avoid CORS)
  app.get("/api/ip-lookup/current", async (req, res) => {
    try {
      const response = await fetch('http://ip-api.com/json/');
      if (!response.ok) {
        throw new Error('Failed to fetch current IP');
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        status: 'fail', 
        message: 'Failed to fetch current IP information' 
      });
    }
  });

  app.get("/api/ip-lookup/:ip", async (req, res) => {
    try {
      const { ip } = req.params;
      
      // Validate IP format (comprehensive check)
      if (!ip || typeof ip !== 'string' || ip.length < 7 || ip.length > 45) {
        return res.status(400).json({ 
          status: 'fail', 
          message: 'Invalid IP address format' 
        });
      }
      
      // Additional IP validation - basic IPv4/IPv6 format check
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        return res.status(400).json({ 
          status: 'fail', 
          message: 'Invalid IP address format' 
        });
      }

      const apiUrl = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch IP data');
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        status: 'fail', 
        message: 'Failed to fetch IP lookup information' 
      });
    }
  });

  // Visitor tracking routes
  app.get("/api/visitors", async (req, res) => {
    try {
      const { limit = "100", offset = "0", hours = "24" } = req.query as { 
        limit?: string; 
        offset?: string; 
        hours?: string; 
      };
      
      // Validate and sanitize query parameters
      const limitNum = Math.max(1, Math.min(1000, parseInt(limit) || 100)); // Between 1 and 1000
      const offsetNum = Math.max(0, parseInt(offset) || 0); // Non-negative
      const hoursNum = Math.max(1, Math.min(720, parseInt(hours) || 24)); // Between 1 and 720 hours (30 days)
      
      const visitors = await storage.getVisitorLogs(limitNum, offsetNum);
      const totalCount = await storage.getVisitorLogsCount();
      const recentVisitors = await storage.getRecentVisitors(hoursNum);
      
      const response = {
        visitors,
        recentVisitors,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        },
        stats: {
          totalVisitors: totalCount,
          recentVisitors: recentVisitors.length,
          timeRange: `${hoursNum} hours`
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch visitor logs" });
    }
  });

  app.get("/api/visitors/stats", async (req, res) => {
    try {
      const recentVisitors = await storage.getRecentVisitors(24);
      const totalCount = await storage.getVisitorLogsCount();
      
      // Basic analytics
      const uniqueIps = [...new Set(recentVisitors.map(v => v.ipAddress))].length;
      const countries = [...new Set(recentVisitors.map(v => v.country).filter(Boolean))];
      const browsers = [...new Set(recentVisitors.map(v => v.browser).filter(Boolean))];
      
      const statsResponse = {
        totalVisitors: totalCount,
        recent24h: recentVisitors.length,
        uniqueIps,
        countries: countries.length,
        browsers: browsers.length,
        topCountries: countries.slice(0, 5),
        topBrowsers: browsers.slice(0, 5)
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.json(statsResponse);
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
      res.status(500).json({ message: "Failed to fetch visitor statistics", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/visitors/clear", async (req, res) => {
    try {
      const deletedCount = await storage.clearVisitorLogs();
      res.json({
        message: "All visitor logs cleared",
        deletedRecords: deletedCount
      });
    } catch (error) {
      console.error("Error clearing visitor logs:", error);
      res.status(500).json({ message: "Failed to clear visitor logs", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Initialize admin PIN if it doesn't exist
  (async () => {
    try {
      const existingPin = await storage.getAdminSetting('admin_pin');
      if (!existingPin) {
        await storage.setAdminSetting({
          settingKey: 'admin_pin',
          settingValue: '1541'
        });
      }
    } catch (error) {
      console.log('Admin PIN initialization completed or already exists');
    }
  })();

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });



  wss.on('connection', (ws) => {
    clients.add(ws);

    // Send current device list to newly connected client
    storage.getDevices().then(devices => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'devices_list',
          data: devices,
          timestamp: new Date().toISOString()
        }));
      }
    }).catch(error => {
      console.warn('Error sending initial device list to WebSocket client:', error);
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.warn('WebSocket client error:', error);
      clients.delete(ws);
    });
  });

  // Simulate MQTT data and device status updates
  const simulateDeviceData = async () => {
    try {
      const devices = await storage.getDevices();
      
      for (const device of devices) {
        // Randomly update device status
        if (Math.random() < 0.1) { // 10% chance to change status
          const statuses = ["online", "offline", "waiting"];
          const currentIndex = statuses.indexOf(device.status);
          const newStatus = statuses[(currentIndex + 1) % statuses.length];
          
          await storage.updateDevice(device.id, {
            status: newStatus,
            lastSeen: new Date(),
          });

          // Broadcast status change
          const message = JSON.stringify({
            type: "device_status_update",
            deviceId: device.deviceId,
            status: newStatus,
            lastSeen: new Date(),
          });

          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }

        // Generate sensor data for online devices
        if (device.status === "online" && Math.random() < 0.3) { // 30% chance to send data
          const alcoholLevel = Math.floor(Math.random() * 400 + 100); // 100-500 alcohol level
          const alertStatus = calculateAlertStatus(alcoholLevel);
          
          const sensorData = {
            deviceId: device.deviceId,
            alcoholLevel: alcoholLevel,
            alertStatus: alertStatus,
          };

          // Store the data
          await storage.createDeviceData(sensorData);

          // Update device last seen
          await storage.updateDevice(device.id, {
            lastSeen: new Date(),
          });

          // Broadcast new data
          const message = JSON.stringify({
            type: "device_data_update",
            deviceId: device.deviceId,
            data: sensorData,
          });

          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      }
    } catch (error) {
      // Error simulating device data
    }
  };

  // Start simulation - temporarily disabled due to schema migration
  // setInterval(simulateDeviceData, 5000); // Run every 5 seconds

  return httpServer;
}
