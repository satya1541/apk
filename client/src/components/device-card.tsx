import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useEffect, useRef } from "react";
import { ChartModal } from "@/components/chart-modal";
import type { Device, DeviceData } from "@shared/schema";

interface DeviceCardProps {
  device: Device;
  latestData?: DeviceData | null;
  onRefresh?: (deviceId: string) => void;
}

interface ChartDataPoint {
  time: string;
  value: number;
  timestamp: number;
}

// Global cache to persist chart data across component unmounts
// Exported so it can be cleaned up when devices are deleted
export const chartDataCache: Record<string, ChartDataPoint[]> = {};

// Helper function to clear cache for a specific device
export function clearChartDataCache(deviceId: string) {
  delete chartDataCache[deviceId];
}

export function DeviceCard({ device, latestData, onRefresh }: DeviceCardProps) {
  // Initialize from cache if available
  const [chartData, setChartData] = useState<ChartDataPoint[]>(() => {
    return chartDataCache[device.deviceId] || [];
  });
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [statusAnimation, setStatusAnimation] = useState<string>("");
  const prevStatusRef = useRef<string>(device.status);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Track status changes and trigger animations
  useEffect(() => {
    if (prevStatusRef.current !== device.status) {
      // Status has changed - trigger animation for any transition
      setStatusAnimation('animate-status-change');
      
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setStatusAnimation('');
      }, 600);
      
      prevStatusRef.current = device.status;
      return () => clearTimeout(timer);
    }
  }, [device.status]);

  useEffect(() => {
    if (latestData?.alcoholLevel !== undefined) {
      const alcoholLevel = latestData.alcoholLevel;
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

      setChartData(prev => {
        const newPoint: ChartDataPoint = {
          time: timeStr,
          value: alcoholLevel,
          timestamp: now.getTime()
        };

        const updatedData = [...prev, newPoint].slice(-30);
        // Sync to global cache so data persists across navigations
        chartDataCache[device.deviceId] = updatedData;
        return updatedData;
      });
    }
  }, [latestData?.alcoholLevel, latestData?.timestamp, device.deviceId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "waiting":
        return "bg-yellow-500 animate-pulse";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "online":
        return "success" as const;
      case "waiting":
        return "warning" as const;
      case "offline":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const formatLastSeen = (lastSeen: Date | null) => {
    if (!lastSeen) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.(device.deviceId);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const hasData = latestData && device.status === "online";

  // Get status indicator class with persistent animation
  const getStatusIndicatorClass = (status: string) => {
    // Apply pulse animation to online and waiting states
    if (status === "online" || status === "waiting") {
      return "status-indicator-pulse";
    }
    return "";
  };

  return (
    <Card className={cn(
      "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl overflow-visible transition-all duration-300",
      statusAnimation
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative">
              <div className={cn(
                "w-3 h-3 rounded-full",
                getStatusColor(device.status),
                getStatusIndicatorClass(device.status)
              )} />
            </div>
            
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {device.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate font-mono">{device.deviceId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <Badge 
              variant={getStatusBadgeVariant(device.status)} 
              className="text-xs font-semibold"
            >
              {device.status === "online" ? "Active" : 
               device.status === "waiting" ? "Waiting" : "Offline"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className={cn(
                "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                isRefreshing && "animate-spin"
              )}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Alcohol Value:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {hasData ? (latestData?.alcoholLevel ?? 0) : '-'}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Last Seen:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatLastSeen(device.lastSeen)}
            </span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="h-64">
            {hasData ? (
              <div 
                className="w-full h-full p-4 flex flex-col cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsChartModalOpen(true)}
                data-testid="chart-container-clickable"
              >
                {/* Chart Header */}
                <div className="mb-2 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Sensor Data Trend
                    </h4>
                    
                    {/* Chart Type Selector */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setChartType('line'); }}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          chartType === 'line' 
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        )}
                        data-testid="chart-type-line"
                        title="Line Chart"
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setChartType('bar'); }}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          chartType === 'bar' 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        )}
                        data-testid="chart-type-bar"
                        title="Bar Chart"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setChartType('pie'); }}
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          chartType === 'pie' 
                            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        )}
                        data-testid="chart-type-pie"
                        title="Pie Chart"
                      >
                        <PieChartIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-0.5 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-500 dark:text-gray-400">Alcohol Level</span>
                    </div>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="flex-1 min-h-0 relative">
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <LineChart
                          data={chartData.length > 0 ? chartData : [
                            { time: new Date().toLocaleTimeString(), value: 0 }
                          ]}
                          margin={{ top: 5, right: 15, left: 15, bottom: 25 }}
                        >
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#e5e7eb'} strokeWidth={0.5} opacity={isDarkMode ? 0.8 : 0.5} />
                          <XAxis 
                            dataKey="time" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#d1d5db' : '#6b7280' }}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#d1d5db' : '#6b7280' }}
                            width={35}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                              border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e5e7eb',
                              borderRadius: '12px',
                              boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.1)',
                              color: isDarkMode ? '#f0f0f0' : '#1f2937'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="url(#colorValue)" 
                            strokeWidth={3}
                            dot={false}
                            activeDot={false}
                            connectNulls={true}
                          />
                        </LineChart>
                      ) : chartType === 'bar' ? (
                        <BarChart
                          data={chartData.length > 0 ? chartData : [
                            { time: new Date().toLocaleTimeString(), value: 0 }
                          ]}
                          margin={{ top: 5, right: 15, left: 15, bottom: 25 }}
                        >
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#4b5563' : '#e5e7eb'} strokeWidth={0.5} opacity={isDarkMode ? 0.8 : 0.5} />
                          <XAxis 
                            dataKey="time" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#d1d5db' : '#6b7280' }}
                            interval="preserveStartEnd"
                            height={20}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#d1d5db' : '#6b7280' }}
                            width={35}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                              border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e5e7eb',
                              borderRadius: '12px',
                              boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.1)',
                              color: isDarkMode ? '#f0f0f0' : '#1f2937'
                            }}
                          />
                          <Bar dataKey="value" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      ) : (
                        <PieChart>
                          <Pie
                            data={chartData.length > 0 ? chartData.slice(-5).map((d, i) => ({
                              name: d.time,
                              value: d.value
                            })) : [{ name: 'No Data', value: 1 }]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${value}`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {(chartData.length > 0 ? chartData.slice(-5) : [{ name: 'No Data', value: 1 }]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                              border: isDarkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e5e7eb',
                              borderRadius: '12px',
                              boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.1)',
                              color: isDarkMode ? '#f0f0f0' : '#1f2937'
                            }}
                          />
                        </PieChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Footer */}
        {hasData && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                  Alcohol Value: {latestData?.alcoholLevel ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 dark:text-green-500">
                  Status: {latestData?.alertStatus || "Normal"}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Chart Modal */}
      <ChartModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        title="Sensor Data Trend - Detailed View"
        data={chartData}
        deviceName={device.name}
      />
    </Card>
  );
}
