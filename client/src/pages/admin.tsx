import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorDialog } from "@/components/error-dialog";
import { SuccessDialog } from "@/components/success-dialog";
import { PinProtection } from "@/components/pin-protection";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { VisitorTracking } from "@/components/visitor-tracking";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Trash, RefreshCw, AlertTriangle, Shield, Database, Settings, Zap, Activity, Users, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, MonitorSpeaker, Signal, ChevronUp, ChevronDown } from "lucide-react";
import chiplLogo from '@assets/chipl-logo.png';

import { cn } from "@/lib/utils";
import type { Device, InsertDevice } from "@shared/schema";

// Admin content component that only renders when authenticated
function AdminContent() {
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    details: ""
  });
  const [successDialog, setSuccessDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: ""
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "default"
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const { data: initialDevices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Initialize devices from query
  useEffect(() => {
    if (initialDevices.length > 0) {
      setDevices(initialDevices);
    }
  }, [initialDevices]);

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === "device_update") {
        // Update the specific device in the list
        setDevices(prev => 
          prev.map(device => 
            device.id === message.data.id
              ? message.data
              : device
          )
        );
      } else if (message.type === "device_deleted") {
        // Remove the deleted device from the list immediately
        setDevices(prev => 
          prev.filter(device => device.id !== message.id)
        );
      } else if (message.type === "devices_list") {
        // Initial device list from server
        setDevices(message.data);
      }
    },
  });

  const { data: cleanupStatus, isLoading: isLoadingCleanup } = useQuery<{
    message: string;
    config: {
      intervalDays: number;
      olderThanDays: number;
      isRunning: boolean;
      nextCleanup: string | null;
    };
  }>({
    queryKey: ["/api/cleanup/status"],
  });

  const runCleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/run");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanup/status"] });
      setSuccessDialog({
        isOpen: true,
        title: "Cleanup Completed",
        message: `Successfully cleaned up ${data.deletedRecords} old device data records.`
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to run cleanup";
      setErrorDialog({
        isOpen: true,
        title: "Cleanup Failed",
        message: "Unable to run the cleanup operation. Please try again.",
        details: errorMessage
      });
    },
  });

  const completeCleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cleanup/clear-all");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanup/status"] });
      setSuccessDialog({
        isOpen: true,
        title: "Complete Cleanup Successful",
        message: `All device data has been removed. ${data.deletedRecords} records deleted.`
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to clear all data";
      setErrorDialog({
        isOpen: true,
        title: "Complete Cleanup Failed",
        message: "Unable to clear all device data. Please try again.",
        details: errorMessage
      });
    },
  });

  const createDeviceMutation = useMutation({
    mutationFn: async (device: InsertDevice) => {
      const response = await apiRequest("POST", "/api/devices", device);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsDialogOpen(false);
      setEditingDevice(null);
      setSuccessDialog({
        isOpen: true,
        title: "Device Created",
        message: "The device has been successfully created and is now online."
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to create device";
      setErrorDialog({
        isOpen: true,
        title: "Device Creation Failed",
        message: "Unable to create the device. Please check your configuration and try again.",
        details: errorMessage
      });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: async (device: Device) => {
      const response = await apiRequest("PUT", `/api/devices/${device.id}`, device);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsDialogOpen(false);
      setEditingDevice(null);
      setSuccessDialog({
        isOpen: true,
        title: "Device Updated",
        message: "The device configuration has been successfully updated."
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update device";
      setErrorDialog({
        isOpen: true,
        title: "Device Update Failed",
        message: "Unable to update the device. Please check your configuration and try again.",
        details: errorMessage
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/devices/${id}`);
      return response.json();
    },
    onSuccess: () => {
      // Show success immediately - WebSocket will handle UI update
      setSuccessDialog({
        isOpen: true,
        title: "Device Deleted",
        message: "The device has been successfully removed from the system."
      });
      // Don't wait for query invalidation since WebSocket handles real-time updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete device";
      setErrorDialog({
        isOpen: true,
        title: "Device Deletion Failed",
        message: "Unable to delete the device. Please try again.",
        details: errorMessage
      });
    },
  });

  const reorderDeviceMutation = useMutation({
    mutationFn: async ({ deviceId, direction }: { deviceId: number; direction: 'up' | 'down' }) => {
      const response = await apiRequest("POST", "/api/devices/reorder", { deviceId, direction });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to reorder device";
      setErrorDialog({
        isOpen: true,
        title: "Reorder Failed",
        message: "Unable to change device order. Please try again.",
        details: errorMessage
      });
    },
  });

  const handleReorder = (deviceId: number, direction: 'up' | 'down') => {
    reorderDeviceMutation.mutate({ deviceId, direction });
  };

  const handleFormSubmit = (data: InsertDevice) => {
    if (editingDevice) {
      updateDeviceMutation.mutate({ ...editingDevice, ...data });
    } else {
      createDeviceMutation.mutate(data);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Device",
      message: "Are you sure you want to delete this device? This action cannot be undone.",
      variant: "destructive",
      onConfirm: () => {
        deleteDeviceMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_1px_2px_rgba(16,185,129,0.2)] dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30";
      case "waiting":
        return "bg-amber-50 text-amber-700 border-amber-200 shadow-[0_1px_2px_rgba(251,191,36,0.25)] dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30";
      case "offline":
        return "bg-rose-50 text-rose-700 border-rose-200 shadow-[0_1px_2px_rgba(244,63,94,0.2)] dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/30";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/30";
    }
  };

  const formatLastActivity = (lastSeen: Date | null) => {
    if (!lastSeen) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const waitingDevices = devices.filter(d => d.status === 'waiting').length;
  const totalDevices = devices.length;

  if (isLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-48 sm:w-64 mb-6 sm:mb-8"></div>
            <div className="h-48 sm:h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="mb-8 sm:mb-10">
          <div className="glass-card rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 glass rounded-xl shadow-lg border-2 border-teal-500">
                  <img 
                    src={chiplLogo} 
                    alt="CHIPL Logo" 
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-400">
                    Admin Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Manage devices and system settings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => {
                    setEditingDevice(null);
                    setIsDialogOpen(true);
                  }}
                  variant="solid"
                  className="flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-xl"
                  data-testid="button-add-device"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add New Device</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total Devices */}
          <Card className="glass-enhanced border-0 shadow-xl hover-lift animate-bounce-in stagger-1 overflow-hidden group">
            <CardContent className="p-4 sm:p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center justify-between relative z-10 text-gray-900 dark:text-white">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-white/80 mb-1">Total Devices</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white drop-shadow animate-counter-up">{totalDevices}</h3>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg animate-scale-pulse">
                  <Database className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Online Devices */}
          <Card className="glass-enhanced border-0 shadow-xl hover-lift animate-bounce-in stagger-2 overflow-hidden group">
            <CardContent className="p-4 sm:p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center justify-between relative z-10 text-gray-900 dark:text-white">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-white/80 mb-1">Online</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-emerald-200 drop-shadow animate-counter-up">{onlineDevices}</h3>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg animate-glow-pulse">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Waiting Devices */}
          <Card className="glass-enhanced border-0 shadow-xl hover-lift animate-bounce-in stagger-3 overflow-hidden group">
            <CardContent className="p-4 sm:p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center justify-between relative z-10 text-gray-900 dark:text-white">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-white/80 mb-1">Waiting</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-200 drop-shadow animate-counter-up">{waitingDevices}</h3>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg animate-scale-pulse">
                  <Signal className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offline Devices */}
          <Card className="glass-enhanced border-0 shadow-xl hover-lift animate-bounce-in stagger-4 overflow-hidden group">
            <CardContent className="p-4 sm:p-6 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="flex items-center justify-between relative z-10 text-gray-900 dark:text-white">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-white/80 mb-1">Offline</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-200 drop-shadow animate-counter-up">{offlineDevices}</h3>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl shadow-lg">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass-card border-0 shadow-lg rounded-xl p-1">
            <TabsTrigger value="devices" className="flex items-center gap-2 rounded-lg">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Device Management</span>
              <span className="sm:hidden">Devices</span>
            </TabsTrigger>
            <TabsTrigger value="visitors" className="flex items-center gap-2 rounded-lg">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Visitor Tracking</span>
              <span className="sm:hidden">Visitors</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2 rounded-lg">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System Settings</span>
              <span className="sm:hidden">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            {/* Device Management Section */}
            <Card className="glass-card border-0 shadow-xl rounded-2xl overflow-hidden relative">
          <CardHeader className="p-6 sm:p-8 border-b relative z-10 glass border-gray-200/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Connected Devices</CardTitle>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Monitor and manage your IoT devices</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-16">
                      Order
                    </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Device Name
                    </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                      MQTT Broker
                    </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                      Last Activity
                    </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                  <tbody className="divide-y bg-white dark:bg-white/0 divide-gray-200 dark:divide-white/5">
                  {[...devices].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((device, index, sortedDevices) => (
                      <tr key={device.id} className="transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(device.id, 'up')}
                            disabled={index === 0 || reorderDeviceMutation.isPending}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                            data-testid={`button-reorder-up-${device.id}`}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(device.id, 'down')}
                            disabled={index === sortedDevices.length - 1 || reorderDeviceMutation.isPending}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30"
                            data-testid={`button-reorder-down-${device.id}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.name}
                          </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            ID: {device.id}
                          </div>
                        </div>
                      </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        <div className="max-w-xs truncate" title={device.mqttBroker}>
                          {device.mqttBroker}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          {device.status === "online" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {device.status === "waiting" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          {device.status === "offline" && <XCircle className="h-4 w-4 text-red-500" />}
                          <Badge 
                            variant="outline"
                            className={cn("font-medium", getStatusBadgeStyles(device.status))}
                          >
                            {device.status === "online" ? "Online" : 
                             device.status === "waiting" ? "Waiting" : "Offline"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {formatLastActivity(device.lastSeen)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(device)}
                            className="p-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit device</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(device.id)}
                            className="p-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete device</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {devices.length === 0 && (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No devices configured</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first IoT device</p>
                      <Button
                        onClick={() => {
                          setEditingDevice(null);
                          setIsDialogOpen(true);
                        }}
                        variant="solid"
                        className="text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Device
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visitors">
            {/* Visitor Tracking Section */}
            <VisitorTracking />
          </TabsContent>

          <TabsContent value="system">
            {/* Compact System Settings Layout */}
            <div className="max-w-2xl mx-auto mb-6">
              {/* Compact Manage Cleanup Card */}
              <Card className="border shadow-sm rounded-lg relative overflow-hidden border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70">
                <CardContent className="p-4 relative z-10">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Manage Cleanup</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Automated maintenance and data retention
                    </p>
                  </div>

                  {/* Compact Status Information */}
                  <div className="space-y-2 mb-4">
                    {isLoadingCleanup ? (
                      <>
                        <div className="animate-pulse bg-gray-200 dark:bg-white/10 rounded h-8"></div>
                        <div className="animate-pulse bg-gray-200 dark:bg-white/10 rounded h-8"></div>
                        <div className="animate-pulse bg-gray-200 dark:bg-white/10 rounded h-8"></div>
                      </>
                    ) : cleanupStatus ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {/* Status */}
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Status</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {cleanupStatus.config?.isRunning ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Cleanup Interval */}
                        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Interval</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {cleanupStatus.config?.intervalDays || 2} days
                          </span>
                        </div>

                        {/* Next Cleanup */}
                        {cleanupStatus?.config?.nextCleanup && (
                          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-white/5 rounded border border-gray-200 dark:border-white/10">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Next</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-xs">
                              {new Date(cleanupStatus.config.nextCleanup).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                        <Database className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Unable to load cleanup status</p>
                      </div>
                    )}
                  </div>

                  {/* Compact Run Manual Cleanup Button */}
                  <Button 
                    onClick={() => runCleanupMutation.mutate()}
                    disabled={runCleanupMutation.isPending}
                    variant="solid"
                    className="w-full text-white font-medium py-2 rounded transition-all duration-200 shadow-lg disabled:opacity-90"
                    data-testid="button-run-manual-cleanup"
                  >
                    {runCleanupMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Run Cleanup
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Device Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDevice ? "Edit Device" : "Add New Device"}
              </DialogTitle>
              <DialogDescription>
                {editingDevice 
                  ? "Update the device configuration and connection settings." 
                  : "Configure a new IoT device for monitoring by providing connection details and MQTT settings."}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const protocolValue = formData.get("protocol") as string;
                const data = {
                  name: formData.get("name") as string,
                  deviceId: formData.get("deviceId") as string,
                  mqttBroker: formData.get("mqttBroker") as string,
                  mqttTopic: formData.get("mqttTopic") as string,
                  protocol: (protocolValue || "WS") as "MQTT" | "MQTTS" | "WS" | "WSS",
                  username: (formData.get("username") as string) || null,
                  password: (formData.get("password") as string) || null,
                };
                handleFormSubmit(data);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">Device Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Sensor Node 1"
                  defaultValue={editingDevice?.name || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  name="deviceId"
                  placeholder="device_001"
                  defaultValue={editingDevice?.deviceId || ""}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mqttBroker">MQTT Broker</Label>
                  <Input
                    id="mqttBroker"
                    name="mqttBroker"
                    placeholder="broker.hivemq.com"
                    defaultValue={editingDevice?.mqttBroker || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <select 
                    name="protocol" 
                    defaultValue={editingDevice?.protocol || "WS"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="MQTT">MQTT</option>
                    <option value="MQTTS">MQTTS</option>
                    <option value="WS">WebSocket</option>
                    <option value="WSS">WebSocket Secure</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="mqttTopic">MQTT Topic</Label>
                <Input
                  id="mqttTopic"
                  name="mqttTopic"
                  placeholder="sensors/data"
                  defaultValue={editingDevice?.mqttTopic || ""}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="mqtt_user"
                    defaultValue={editingDevice?.username || ""}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    defaultValue={editingDevice?.password || ""}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingDevice(null);
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}
                  variant="solid"
                  className="w-full sm:w-auto"
                >
                  {createDeviceMutation.isPending || updateDeviceMutation.isPending ? "Saving..." :
                   editingDevice ? "Update Device" : "Create Device"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <SuccessDialog
          isOpen={successDialog.isOpen}
          title={successDialog.title}
          message={successDialog.message}
          onClose={() => setSuccessDialog(prev => ({ ...prev, isOpen: false }))}
        />

        {/* Error Dialog */}
        <ErrorDialog
          isOpen={errorDialog.isOpen}
          title={errorDialog.title}
          message={errorDialog.message}
          details={errorDialog.details}
          onClose={() => setErrorDialog(prev => ({ ...prev, isOpen: false }))}
        />

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText="OK"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />

      </main>
    </div>
  );
}

// Main admin component with PIN protection
export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <PinProtection 
        onSuccess={() => {
          setIsAuthenticated(true);
        }}
        title="Admin Panel Access"
      />
    );
  }

  return <AdminContent />;
}