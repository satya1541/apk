import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Thermometer, Leaf, Activity, Maximize2 } from "lucide-react";
import { AnalyticsChartModal } from "@/components/analytics-chart-modal";
import type { Device, DeviceData } from "@shared/schema";

export default function Analytics() {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [temperatureModalOpen, setTemperatureModalOpen] = useState(false);
  const [airQualityModalOpen, setAirQualityModalOpen] = useState(false);

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Mock chart data - in a real app, this would come from the API
  const generateMockData = (points: number) => {
    return Array.from({ length: points }, (_, i) => ({
      time: new Date(Date.now() - (points - i) * 60000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      temperature: Math.random() * 10 + 20,
      humidity: Math.random() * 30 + 40,
      airQuality: Math.random() * 80 + 20,
      co2: Math.random() * 200 + 350,
    }));
  };

  const chartData = useMemo(() => 
    generateMockData(timeRange === "24h" ? 24 : timeRange === "7d" ? 7 : 30),
    [timeRange]
  );

  // Mock activity log
  const activityLog = [
    {
      id: 1,
      deviceId: "EC64C984BAAC",
      message: "Device EC64C984BAAC sent temperature reading: 23.4°C",
      timestamp: "2 minutes ago",
      type: "data",
    },
    {
      id: 2,
      deviceId: "EC64C984E8B0",
      message: "Device EC64C984E8B0 connection timeout",
      timestamp: "5 minutes ago",
      type: "warning",
    },
    {
      id: 3,
      deviceId: "EC64C984BAB0",
      message: "Device EC64C984BAB0 sent air quality data: 42 AQI",
      timestamp: "8 minutes ago",
      type: "data",
    },
    {
      id: 4,
      deviceId: "EC64C984B274",
      message: "Device EC64C984B274 came online",
      timestamp: "12 minutes ago",
      type: "success",
    },
    {
      id: 5,
      deviceId: "EC64C984BAAC",
      message: "Device EC64C984BAAC humidity sensor calibrated",
      timestamp: "15 minutes ago",
      type: "info",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "data":
        return "bg-success";
      case "warning":
        return "bg-warning";
      case "success":
        return "bg-success";
      case "info":
        return "bg-primary";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Data Analytics</h2>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Temperature Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-blue-500" />
                  <span>Temperature Trends</span>
                </CardTitle>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="h-64 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 group relative"
                onClick={() => setTemperatureModalOpen(true)}
                data-testid="temperature-chart-clickable"
              >
                {/* Hover indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="bg-blue-500 text-white p-1 rounded-full">
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                    />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#1976D2" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Air Quality Index */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Leaf className="h-5 w-5 text-green-500" />
                  <span>Air Quality Index</span>
                </CardTitle>
                <Select value="realtime" onValueChange={() => {}}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly Average</SelectItem>
                    <SelectItem value="daily">Daily Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="h-64 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-all duration-200 group relative"
                onClick={() => setAirQualityModalOpen(true)}
                data-testid="air-quality-chart-clickable"
              >
                {/* Hover indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="bg-green-500 text-white p-1 rounded-full">
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="airQualityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#6B7280' }}
                    />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="airQuality" 
                      stroke="#4CAF50" 
                      fillOpacity={1} 
                      fill="url(#airQualityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Device Activity Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLog.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${getActivityIcon(activity.type)}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{activity.deviceId}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {devices.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-600">Add devices in the Admin panel to view analytics.</p>
          </div>
        )}
      </main>

      {/* Chart Modals */}
      <AnalyticsChartModal
        isOpen={temperatureModalOpen}
        onClose={() => setTemperatureModalOpen(false)}
        title="Temperature Trends - Detailed View"
        data={chartData}
        chartType="line"
        dataKey="temperature"
        color="#1976D2"
        icon="temperature"
        unit="°C"
      />

      <AnalyticsChartModal
        isOpen={airQualityModalOpen}
        onClose={() => setAirQualityModalOpen(false)}
        title="Air Quality Index - Detailed View"
        data={chartData}
        chartType="area"
        dataKey="airQuality"
        color="#4CAF50"
        icon="air-quality"
        unit=" AQI"
        gradientId="airQualityGradientModal"
      />
    </div>
  );
}
