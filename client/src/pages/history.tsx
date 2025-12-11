import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download, FileText, History as HistoryIcon, ChevronLeft, ChevronRight, Activity, Wifi, WifiOff, AlertTriangle, Plus, Trash2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


interface DeviceData {
  id: number;
  deviceId: string;
  timestamp: string;
  alcoholLevel: number;
  alertStatus: string;
}

interface Device {
  id: number;
  deviceId: string;
  name: string;
  status: string;
}

interface HistoryResponse {
  data: DeviceData[];
  device: Device;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ActivityLogEntry {
  id: number;
  eventType: 'device_online' | 'device_offline' | 'alert_triggered' | 'data_cleanup' | 'device_created' | 'device_deleted' | 'device_updated';
  deviceId?: string;
  deviceName?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function History() {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportLimit, setExportLimit] = useState("500");
  const [alertFilter, setAlertFilter] = useState<string | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Fetch activity logs
  const { data: activityLogs = [] } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/activity-logs"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch all devices for selection
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Fetch history data for selected device
  const { data: historyData, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ["/api/history/devices", selectedDeviceId, currentPage, startDate, endDate, alertFilter],
    enabled: !!selectedDeviceId,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(alertFilter && { alertStatus: alertFilter })
      });
      
      const response = await fetch(`/api/history/devices/${selectedDeviceId}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch history data");
      return response.json();
    }
  });

  const handleExport = async () => {
    if (!selectedDeviceId) return;
    
    setIsExporting(true);
    try {
      // Export ALL data regardless of filters, only respecting the row limit
      const params = new URLSearchParams({
        ...(exportLimit && { limit: exportLimit })
      });
      
      const response = await fetch(`/api/history/devices/${selectedDeviceId}/export?${params}`);
      if (!response.ok) throw new Error("Failed to export data");
      
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let filename = `device_${selectedDeviceId}_history.xlsx`;
      const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      if (filenameMatch) {
        const encoded = filenameMatch[1] || filenameMatch[2];
        if (encoded) {
          try {
            filename = decodeURIComponent(encoded.replace(/"/g, ""));
          } catch (error) {
            filename = encoded.replace(/"/g, "");
          }
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      // Could add user-visible error message here if needed
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedDeviceId || !historyData?.data || historyData.data.length === 0) return;
    
    setIsExportingPdf(true);
    try {
      // Export ALL data regardless of filters, only respecting the row limit
      const params = new URLSearchParams({
        page: "1",
        limit: exportLimit
      });
      
      const response = await fetch(`/api/history/devices/${selectedDeviceId}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch data for PDF");
      const pdfData: HistoryResponse = await response.json();
      
      const doc = new jsPDF();
      const deviceName = historyData?.device?.name || selectedDeviceId;
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185);
      doc.text("ToxiShield-X", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(`Device History Report`, 14, 30);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Device: ${deviceName}`, 14, 38);
      doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm:ss")}`, 14, 44);
      doc.text(`Total Records: ${pdfData.data.length} (Export Limit: ${exportLimit})`, 14, 50);
      const yOffset = 56;
      
      // Table data with serial number
      const tableData = pdfData.data.map((record, index) => [
        (index + 1).toString(),
        format(new Date(record.timestamp), "MMM dd, yyyy HH:mm:ss"),
        record.alcoholLevel.toString(),
        record.alertStatus
      ]);
      
      autoTable(doc, {
        startY: yOffset,
        head: [["S.No.", "Timestamp", "Alcohol Level", "Alert Status"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 35, halign: "center" },
          3: { cellWidth: 45 }
        },
        didParseCell: function(data: any) {
          if (data.column.index === 3 && data.section === "body") {
            const status = data.cell.raw;
            if (status === "Normal") {
              data.cell.styles.textColor = [39, 174, 96];
            } else if (status === "Moderate Drunk") {
              data.cell.styles.textColor = [243, 156, 18];
            } else if (status === "Completely Drunk") {
              data.cell.styles.textColor = [231, 76, 60];
            }
          }
        }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | ToxiShield-X IoT Monitoring System`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }
      
      // Download
      const filename = `${deviceName}_history_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      toast({
        title: "PDF exported successfully",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "PDF export failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the PDF",
        variant: "destructive",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
  };


  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 glass-card rounded-2xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <HistoryIcon className="h-6 w-6 text-blue-600" />
            Device History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and export historical sensor data from your IoT devices
          </p>
        </div>

        {/* Activity Log Section */}
        <Card className="mb-6 glass-card shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg dark:text-gray-100 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Activity Log
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActivityLog(!showActivityLog)}
                data-testid="button-toggle-activity-log"
              >
                {showActivityLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          {showActivityLog && (
            <CardContent className="pt-0">
              {activityLogs.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activityLogs.map((log) => {
                    const getIcon = () => {
                      switch (log.eventType) {
                        case 'device_online':
                          return <Wifi className="h-4 w-4 text-green-500" />;
                        case 'device_offline':
                          return <WifiOff className="h-4 w-4 text-red-500" />;
                        case 'alert_triggered':
                          return <AlertTriangle className="h-4 w-4 text-amber-500" />;
                        case 'device_created':
                          return <Plus className="h-4 w-4 text-blue-500" />;
                        case 'device_deleted':
                          return <Trash2 className="h-4 w-4 text-red-500" />;
                        case 'device_updated':
                          return <Settings className="h-4 w-4 text-purple-500" />;
                        default:
                          return <Activity className="h-4 w-4 text-gray-500" />;
                      }
                    };
                    
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                        data-testid={`activity-log-${log.id}`}
                      >
                        <div className="mt-0.5" data-testid={`activity-icon-${log.id}`}>{getIcon()}</div>
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm text-gray-900 dark:text-gray-100 truncate"
                            data-testid={`activity-description-${log.id}`}
                          >
                            {log.description}
                          </p>
                          <p 
                            className="text-xs text-gray-500 dark:text-gray-400"
                            data-testid={`activity-timestamp-${log.id}`}
                          >
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {log.eventType && (
                          <span 
                            className="text-xs text-gray-400 dark:text-gray-500"
                            data-testid={`activity-type-${log.id}`}
                          >
                            {log.eventType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Alert Status Indicators */}
        {selectedDeviceId && historyData && (
          <div className="mb-6 flex gap-3 flex-wrap">
            <button
              onClick={() => {
                setAlertFilter(alertFilter === "Normal" ? null : "Normal");
                setCurrentPage(1);
              }}
              className={`glass-button flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                alertFilter === "Normal"
                  ? "ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
              }`}
              data-testid="filter-normal"
            >
              <div className={`w-4 h-4 rounded-full bg-green-500 ${alertFilter === "Normal" ? "shadow-lg shadow-green-500/50" : ""}`}></div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Normal</div>
            </button>

            <button
              onClick={() => {
                setAlertFilter(alertFilter === "Moderate Drunk" ? null : "Moderate Drunk");
                setCurrentPage(1);
              }}
              className={`glass-button flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                alertFilter === "Moderate Drunk"
                  ? "ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
              }`}
              data-testid="filter-moderate-drunk"
            >
              <div className={`w-4 h-4 rounded-full bg-yellow-500 ${alertFilter === "Moderate Drunk" ? "shadow-lg shadow-yellow-500/50" : ""}`}></div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Moderate Drunk</div>
            </button>

            <button
              onClick={() => {
                setAlertFilter(alertFilter === "Completely Drunk" ? null : "Completely Drunk");
                setCurrentPage(1);
              }}
              className={`glass-button flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                alertFilter === "Completely Drunk"
                  ? "ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
              }`}
              data-testid="filter-completely-drunk"
            >
              <div className={`w-4 h-4 rounded-full bg-red-500 ${alertFilter === "Completely Drunk" ? "shadow-lg shadow-red-500/50" : ""}`}></div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Completely Drunk</div>
            </button>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 glass-card shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg dark:text-gray-100">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Device
                </label>
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a device..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.name} ({device.deviceId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-0">
                  Quick Actions
                </label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setCurrentPage(1);
                    setAlertFilter(null);
                    setExportLimit("500");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Rows to Export
                </label>
                <Select value={exportLimit} onValueChange={setExportLimit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose row limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">500 rows (fastest)</SelectItem>
                    <SelectItem value="1000">1,000 rows</SelectItem>
                    <SelectItem value="5000">5,000 rows</SelectItem>
                    <SelectItem value="10000">10,000 rows</SelectItem>
                    <SelectItem value="20000">20,000 rows</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lower limits download quicker; raise only when needed.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-0">
                  Export
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    disabled={!selectedDeviceId || isExporting}
                    variant="solid"
                    className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                    data-testid="button-export-excel"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "..." : "Excel"}
                  </Button>
                  <Button
                    onClick={handleExportPdf}
                    disabled={!selectedDeviceId || isExportingPdf || !historyData?.data?.length}
                    variant="outline"
                    className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-export-pdf"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isExportingPdf ? "..." : "PDF"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {selectedDeviceId && (
          <Card className="glass-card shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg dark:text-gray-100">
                    {historyData?.device.name} ({historyData?.device.deviceId})
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {historyData?.pagination.total} {alertFilter ? 'filtered' : 'total'} records
                  </p>
                </div>
                
                {historyData && historyData.pagination.pages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {historyData.pagination.page} of {historyData.pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(historyData.pagination.pages, prev + 1))}
                      disabled={currentPage === historyData.pagination.pages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  Error loading data. Please try again.
                </div>
              ) : !historyData?.data || historyData.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {alertFilter ? `No ${alertFilter} records found.` : "No data found for the selected filters."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alcohol Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alert Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.data.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {formatDate(record.timestamp)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-lg font-semibold text-blue-600">
                              {record.alcoholLevel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.alertStatus === "Normal" 
                                ? "bg-green-100 text-green-800"
                                : record.alertStatus === "Moderate Drunk"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {record.alertStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!selectedDeviceId && (
          <Card>
            <CardContent className="text-center py-12">
              <HistoryIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a Device
              </h3>
              <p className="text-gray-600">
                Choose a device from the dropdown above to view its historical data.
              </p>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}