import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Users, Globe, Monitor, Clock, MapPin, Trash2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import chromeIcon from '@assets/image_1754311046405.png';
import firefoxIcon from '@assets/image_1754311086492.png';
import edgeIcon from '@assets/image_1754311158564.png';
import mobileChromeIcon from '@assets/image_1754311506585.png';
import safariIcon from '@assets/image_1754311725965.png';
import unknownBrowserIcon from '@assets/image_1754311968772.png';
import { useWebSocket } from '@/hooks/use-websocket';
import { ClickableIP } from './clickable-ip';
import type { VisitorLog } from '@shared/schema';
interface VisitorTrackingProps {}

interface VisitorStats {
  totalVisitors: number;
  recent24h: number;
  uniqueIps: number;
  countries: number;
  browsers: number;
  topCountries: string[];
  topBrowsers: string[];
}

interface VisitorResponse {
  visitors: VisitorLog[];
  recentVisitors: VisitorLog[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    pages: number;
  };
  stats: {
    totalVisitors: number;
    recentVisitors: number;
    timeRange: string;
  };
}

export function VisitorTracking({}: VisitorTrackingProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);

  // Fetch visitor data
  const { data: visitorData, isLoading: visitorsLoading, error: visitorsError, refetch: refetchVisitors } = useQuery<VisitorResponse>({
    queryKey: ['visitors', refreshKey],
    queryFn: async () => {
      try {
        const response = await fetch('/api/visitors');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn('Error fetching visitor data:', error);
        throw error;
      }
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: 1,
    staleTime: 0
  });

  // Fetch visitor statistics
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<VisitorStats>({
    queryKey: ['visitor-stats', refreshKey],
    queryFn: async () => {
      try {
        const response = await fetch('/api/visitors/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        console.warn('Error fetching visitor stats:', error);
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: 1,
    staleTime: 0
  });

  // WebSocket connection for real-time visitor updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'visitor_update') {
        // Invalidate visitor queries to trigger a refresh
        queryClient.invalidateQueries({ queryKey: ['visitors'] });
        queryClient.invalidateQueries({ queryKey: ['visitor-stats'] });
      }
    }
  });

  // Clear visitors mutation
  const clearVisitorsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/visitors/clear");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-stats'] });
      setShowSuccessMessage(`Successfully cleared ${data.deletedRecords} visitor records`);
      setTimeout(() => setShowSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      console.error('Error clearing visitor logs:', error);
    },
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchVisitors();
    refetchStats();
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const visitTime = new Date(date);
    const diffMs = now.getTime() - visitTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatTimeInIST = (date: string | Date) => {
    const visitTime = new Date(date);
    return visitTime.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getBrowserIcon = (browser: string | null) => {
    if (!browser) return <img src={unknownBrowserIcon} alt="Unknown Browser" className="h-6 w-6 object-contain" />;
    const browserLower = browser.toLowerCase();
    
    // Check for Mobile Chrome first (more specific)
    if (browserLower.includes('mobile') && browserLower.includes('chrome')) {
      return <img src={mobileChromeIcon} alt="Mobile Chrome" className="h-6 w-6 object-contain" />;
    }
    if (browserLower.includes('chrome')) {
      return <img src={chromeIcon} alt="Chrome" className="h-6 w-6 object-contain" />;
    }
    if (browserLower.includes('firefox')) {
      return <img src={firefoxIcon} alt="Firefox" className="h-6 w-6 object-contain" />;
    }
    if (browserLower.includes('edge')) {
      return <img src={edgeIcon} alt="Edge" className="h-6 w-6 object-contain" />;
    }
    if (browserLower.includes('safari')) {
      return <img src={safariIcon} alt="Safari" className="h-6 w-6 object-contain" />;
    }
    
    return <img src={unknownBrowserIcon} alt="Unknown Browser" className="h-6 w-6 object-contain" />;
  };

  const getLocationString = (visitor: VisitorLog) => {
    const parts = [visitor.city, visitor.region, visitor.country].filter(part => part && part !== 'Unknown');
    return parts.length > 0 ? parts.join(', ') : '';
  };

  const getReferrerHostname = (referrer?: string | null) => {
    if (!referrer) return null;
    if (referrer.startsWith('/')) return referrer;
    try {
      const hasProtocol = /^https?:\/\//i.test(referrer);
      const url = hasProtocol ? new URL(referrer) : new URL(`https://${referrer}`);
      return url.hostname || referrer;
    } catch {
      return referrer;
    }
  };

  if (visitorsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (visitorsError || statsError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-500">Error loading visitor data</div>
        <div className="text-sm text-muted-foreground">
          {visitorsError?.message || statsError?.message || 'Unknown error'}
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVisitors || 0}</div>
            <p className="text-xs text-muted-foreground">All time visits</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (24h)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recent24h || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueIps || 0}</div>
            <p className="text-xs text-muted-foreground">Unique addresses</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.countries || 0}</div>
            <p className="text-xs text-muted-foreground">Different countries</p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Details */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Visitor Activity</CardTitle>
              <CardDescription>
                Real-time visitor tracking and location information
              </CardDescription>
              {showSuccessMessage && (
                <div className="text-sm text-green-600 mt-1">
                  {showSuccessMessage}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearVisitorsMutation.mutate()}
                disabled={clearVisitorsMutation.isPending}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                data-testid="button-clear-visitors"
              >
                {clearVisitorsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {clearVisitorsMutation.isPending ? "Clearing..." : "Clear All"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-refresh-visitors">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent">Recent Visitors</TabsTrigger>
              <TabsTrigger value="all">All Visitors</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recent" className="space-y-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {visitorData?.recentVisitors?.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      data-testid={`visitor-recent-${visitor.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getBrowserIcon(visitor.browser)}
                          <div>
                            <div className="font-medium text-sm">
                              {visitor.browser || 'Unknown'} {visitor.browserVersion}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {visitor.operatingSystem || 'Unknown OS'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <ClickableIP ipAddress={visitor.ipAddress} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatTimeAgo(visitor.visitTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeInIST(visitor.visitTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {visitor.visitedPage || '/'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!visitorData?.recentVisitors || visitorData.recentVisitors.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No recent visitors found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {visitorData?.visitors?.map((visitor) => (
                    <div
                      key={visitor.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      data-testid={`visitor-all-${visitor.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getBrowserIcon(visitor.browser)}
                          <div>
                            <div className="font-medium text-sm">
                              {visitor.browser || 'Unknown'} {visitor.browserVersion}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {visitor.operatingSystem || 'Unknown OS'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <ClickableIP ipAddress={visitor.ipAddress} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatTimeAgo(visitor.visitTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeInIST(visitor.visitTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {visitor.visitedPage || '/'}
                        </div>
                        {(() => {
                          const referrerDisplay = getReferrerHostname(visitor.referrer);
                          if (!referrerDisplay) return null;
                          return (
                            <div className="text-xs text-muted-foreground mt-1">
                              from: {referrerDisplay}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                  {(!visitorData?.visitors || visitorData.visitors.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      No visitors found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Countries & Browsers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Top Countries</CardTitle>
            <CardDescription>Most active visitor locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topCountries?.map((country, index) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm">{country}</span>
                  <Badge variant="secondary">#{index + 1}</Badge>
                </div>
              ))}
              {(!stats?.topCountries || stats.topCountries.length === 0) && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Top Browsers</CardTitle>
            <CardDescription>Most popular browsers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topBrowsers?.map((browser, index) => (
                <div key={browser} className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    {getBrowserIcon(browser)}
                    {browser}
                  </span>
                  <Badge variant="secondary">#{index + 1}</Badge>
                </div>
              ))}
              {(!stats?.topBrowsers || stats.topBrowsers.length === 0) && (
                <div className="text-sm text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}