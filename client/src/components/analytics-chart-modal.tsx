import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Thermometer, Leaf } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

interface AnalyticsChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Array<any>;
  chartType: 'line' | 'area';
  dataKey: string;
  color: string;
  icon?: 'temperature' | 'air-quality';
  unit?: string;
  gradientId?: string;
}

export function AnalyticsChartModal({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  chartType,
  dataKey,
  color,
  icon,
  unit = '',
  gradientId
}: AnalyticsChartModalProps) {
  
  const getIcon = () => {
    switch (icon) {
      case 'temperature':
        return <Thermometer className="h-5 w-5 text-blue-500" />;
      case 'air-quality':
        return <Leaf className="h-5 w-5 text-green-500" />;
      default:
        return <Maximize2 className="h-5 w-5 text-teal-600" />;
    }
  };

  const getStats = () => {
    if (data.length === 0) return null;
    
    const values = data.map(d => d[dataKey]).filter(v => typeof v === 'number');
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    return { min, max, avg };
  };

  const stats = getStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[85vh] flex flex-col [&>button]:hidden" data-testid="analytics-chart-modal">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                {getIcon()}
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Detailed analytics view with interactive charts and statistics
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              data-testid="button-close-analytics-chart"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-full flex flex-col">
            {/* Chart Stats */}
            <div className="mb-6 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 rounded" style={{ backgroundColor: color }}></div>
                  <span className="text-gray-700 font-medium">{dataKey.charAt(0).toUpperCase() + dataKey.slice(1)}</span>
                </div>
                <div className="text-gray-500">
                  Data Points: {data.length}
                </div>
                {stats && (
                  <>
                    <div className="text-gray-500">
                      Latest: {data[data.length - 1]?.[dataKey]?.toFixed(1) || 0}{unit}
                    </div>
                    <div className="text-gray-500">
                      Range: {stats.min.toFixed(1)} - {stats.max.toFixed(1)}{unit}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Chart Container */}
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" strokeWidth={1} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={Math.max(0, Math.floor(data.length / 12))}
                    />
                    <YAxis 
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      width={60}
                      label={{ 
                        value: `${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} ${unit}`, 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value}${unit}`, dataKey.charAt(0).toUpperCase() + dataKey.slice(1)]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={dataKey} 
                      stroke={color} 
                      strokeWidth={3}
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                ) : (
                  <AreaChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    {gradientId && (
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                    )}
                    <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" strokeWidth={1} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={Math.max(0, Math.floor(data.length / 12))}
                    />
                    <YAxis 
                      axisLine={true}
                      tickLine={true}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      width={60}
                      label={{ 
                        value: `${dataKey.charAt(0).toUpperCase() + dataKey.slice(1)} ${unit}`, 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle' } 
                      }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value}${unit}`, dataKey.charAt(0).toUpperCase() + dataKey.slice(1)]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={dataKey} 
                      stroke={color} 
                      fillOpacity={1} 
                      fill={gradientId ? `url(#${gradientId})` : color}
                      strokeWidth={2}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            
            {/* Chart Footer */}
            {stats && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg flex-shrink-0">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>
                    Time Range: {data.length > 0 ? `${data[0]?.time} - ${data[data.length - 1]?.time}` : 'No data available'}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span>Min: {stats.min.toFixed(1)}{unit}</span>
                    <span>Max: {stats.max.toFixed(1)}{unit}</span>
                    <span>Avg: {stats.avg.toFixed(1)}{unit}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}