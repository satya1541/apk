import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DeviceCard, clearChartDataCache } from "@/components/device-card";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useSoundAlert } from "@/hooks/use-sound-alert";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Device, DeviceData } from "@shared/schema";

// Track if dashboard has been mounted before in this session
let hasAnimatedOnce = false;

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [devices, setDevices] = useState<Device[]>([]);
  const [shouldAnimate, setShouldAnimate] = useState(!hasAnimatedOnce);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("soundAlertsEnabled");
    return saved !== null ? saved === "true" : true;
  });
  
  // Use React Query cache for deviceData to persist across navigations
  const cachedDeviceData = queryClient.getQueryData<Record<string, DeviceData>>(['deviceData']) || {};
  const [deviceData, setDeviceDataState] = useState<Record<string, DeviceData>>(cachedDeviceData);
  
  // Sync deviceData to React Query cache
  const setDeviceData = useCallback((updater: Record<string, DeviceData> | ((prev: Record<string, DeviceData>) => Record<string, DeviceData>)) => {
    setDeviceDataState(prev => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      queryClient.setQueryData(['deviceData'], newData);
      return newData;
    });
  }, [queryClient]);
  
  // Mark animation as done after first mount
  useEffect(() => {
    if (!hasAnimatedOnce) {
      hasAnimatedOnce = true;
    }
  }, []);
  
  const { checkAndAlert } = useSoundAlert();
  const soundEnabledRef = useRef(soundEnabled);
  
  // Keep ref in sync with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const { data: initialDevices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem("soundAlertsEnabled", String(soundEnabled));
  }, [soundEnabled]);

  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      if (message.type === "device_update") {
        setDevices(prev => 
          prev.map(device => 
            device.id === message.data.id
              ? message.data
              : device
          )
        );
      } else if (message.type === "device_deleted") {
        setDevices(prev => 
          prev.filter(device => device.id !== message.id)
        );
        setDeviceData(prev => {
          const { [message.deviceId]: deleted, ...remaining } = prev;
          return remaining;
        });
        // Clean up chart data cache for deleted device
        clearChartDataCache(message.deviceId);
      } else if (message.type === "sensor_data") {
        const { deviceId, data } = message;
        const alcoholLevel = data.alcoholLevel || data.alcohol_level || 0;
        const alertStatus = data.alertStatus || data.Alert || 'Unknown';
        
        // Play sound alert if enabled
        if (soundEnabledRef.current) {
          checkAndAlert(alcoholLevel, alertStatus, deviceId);
        }
        
        setDeviceData(prev => {
          const newData = {
            ...prev,
            [deviceId]: {
              id: Date.now(),
              deviceId: deviceId,
              timestamp: data.timestamp || new Date().toISOString(),
              alcoholLevel: alcoholLevel,
              alertStatus: alertStatus
            },
          };

          return newData;
        });
        
        setDevices(prev => 
          prev.map(device => 
            device.deviceId === deviceId
              ? { ...device, lastSeen: new Date(data.timestamp || new Date().toISOString()), status: 'online' }
              : device
          )
        );
      } else if (message.type === "devices_list") {
        setDevices(message.data);
      }
    },
  });

  // Check for offline devices every 30 seconds
  useEffect(() => {
    const OFFLINE_THRESHOLD_MS = 60000; // 60 seconds without data = offline
    
    const checkOfflineDevices = () => {
      const now = Date.now();
      setDevices(prev => 
        prev.map(device => {
          if (device.lastSeen) {
            const lastSeenTime = new Date(device.lastSeen).getTime();
            const timeSinceLastSeen = now - lastSeenTime;
            if (timeSinceLastSeen > OFFLINE_THRESHOLD_MS && device.status === 'online') {
              return { ...device, status: 'offline' };
            }
          }
          return device;
        })
      );
    };

    const intervalId = setInterval(checkOfflineDevices, 30000);
    // Run once immediately
    checkOfflineDevices();
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (initialDevices) {
      setDevices(initialDevices);
      
      const fetchDeviceData = async () => {
        try {
          const dataPromises = initialDevices.map(async (device) => {
            try {
              const response = await fetch(`/api/devices/${device.deviceId}/data/latest`);
              if (!response.ok) {
                console.warn(`Failed to fetch data for device ${device.deviceId}:`, response.statusText);
                return { deviceId: device.deviceId, data: null };
              }
              const data = await response.json();
              return { deviceId: device.deviceId, data };
            } catch (error) {
              console.warn(`Error fetching data for device ${device.deviceId}:`, error);
              return { deviceId: device.deviceId, data: null };
            }
          });

          const results = await Promise.all(dataPromises);
          
          const deviceDataMap: { [key: string]: any } = {};
          results.forEach(result => {
            if (result.data) {
              deviceDataMap[result.deviceId] = result.data;
            }
          });
          
          if (Object.keys(deviceDataMap).length > 0) {
            setDeviceData(prev => ({ ...prev, ...deviceDataMap }));
          }
        } catch (error) {
          console.error('Failed to fetch device data:', error);
        }
      };

      fetchDeviceData();
    }
  }, [initialDevices]);

  const handleRefreshDevice = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}/data/latest`);
      if (!response.ok) {
        console.warn(`Failed to refresh device ${deviceId}: ${response.statusText}`);
        return;
      }
      const data = await response.json();
      if (data) {
        setDeviceData(prev => ({
          ...prev,
          [deviceId]: data,
        }));
      }
    } catch (error) {
      console.warn(`Error refreshing device ${deviceId}:`, error);
    }
  }, []);

  // Memoize device cards to prevent unnecessary re-renders
  // Sort devices by displayOrder field (configurable from admin panel)
  const deviceCards = useMemo(() => {
    const sortedDevices = [...devices].sort((a, b) => {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    return sortedDevices.map((device, index) => (
      <div
        key={device.id}
        className={shouldAnimate ? "animate-fade-in-scale" : ""}
        style={shouldAnimate ? { animationDelay: `${index * 0.1}s` } : undefined}
      >
        <DeviceCard
          device={device}
          latestData={deviceData[device.deviceId]}
          onRefresh={handleRefreshDevice}
        />
      </div>
    ));
  }, [devices, deviceData, handleRefreshDevice, shouldAnimate]);

  if (devicesLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-64 mb-8 animate-shimmer-wave"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-96 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-fade-in-scale" style={{ animationDelay: `${i * 0.1}s` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
        {/* Page Title with Status Indicator */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Device Status
          </h1>
          {devices.length > 0 && (
            <div className="flex items-center gap-2" data-testid="status-indicator">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="status-online-count">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {devices.filter(d => d.status === 'online').length} Online
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="status-offline-count">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {devices.filter(d => d.status === 'offline').length} Offline
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`ml-auto ${soundEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
            title={soundEnabled ? 'Sound alerts enabled (click to disable)' : 'Sound alerts disabled (click to enable)'}
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        {/* Device Monitoring Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {deviceCards}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-block p-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No devices found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add devices in the Admin panel to start monitoring
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
