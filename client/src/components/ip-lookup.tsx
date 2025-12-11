import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, MapPin, Globe, Clock, Wifi, Shield, RefreshCw, Search } from 'lucide-react';
import chromeIcon from '@assets/image_1754311046405.png';
import firefoxIcon from '@assets/image_1754311086492.png';
import edgeIcon from '@assets/image_1754311158564.png';
import mobileChromeIcon from '@assets/image_1754311506585.png';
import safariIcon from '@assets/image_1754311725965.png';
import unknownBrowserIcon from '@assets/image_1754311968772.png';

interface IPLookupData {
  query: string;
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
}

interface IPLookupProps {
  initialIP?: string;
  showInput?: boolean;
  compact?: boolean;
}

// Format time in Indian Standard Time
function formatTimeInIST(timezone?: string) {
  if (!timezone) return 'Unknown';
  
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'medium',
      hour12: true
    });
    
    return `Current IST: ${formatter.format(now)}`;
  } catch (error) {
    return 'Unknown';
  }
}

// Get browser icon based on user agent
function getBrowserIcon(userAgent?: string) {
  if (!userAgent) return unknownBrowserIcon;
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('chrome') && ua.includes('mobile')) return mobileChromeIcon;
  if (ua.includes('chrome')) return chromeIcon;
  if (ua.includes('firefox')) return firefoxIcon;
  if (ua.includes('edge')) return edgeIcon;
  if (ua.includes('safari') && !ua.includes('chrome')) return safariIcon;
  
  return unknownBrowserIcon;
}

// Determine IP version
function getIPVersion(ip: string): 'IPv4' | 'IPv6' | 'Unknown' {
  if (ip.includes(':')) return 'IPv6';
  if (ip.includes('.')) return 'IPv4';
  return 'Unknown';
}

export function IPLookup({ initialIP, showInput = true, compact = false }: IPLookupProps) {
  const [customIP, setCustomIP] = useState(initialIP || '');
  const [searchIP, setSearchIP] = useState(initialIP || '');

  // Fetch current visitor IP if no initial IP provided
  const { data: currentIP, isLoading: isLoadingCurrentIP, error: currentIPError } = useQuery({
    queryKey: ['current-ip'],
    queryFn: async () => {
      const response = await fetch('/api/ip-lookup/current');
      if (!response.ok) throw new Error('Failed to fetch current IP');
      const data = await response.json();
      if (data.status === 'fail') throw new Error(data.message || 'Failed to get IP');
      return data.query;
    },
    enabled: !initialIP,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Use either provided IP, searched IP, or current IP
  const targetIP = searchIP || initialIP || currentIP;

  // Fetch IP lookup data
  const { data: ipData, isLoading, error, refetch } = useQuery<IPLookupData>({
    queryKey: ['ip-lookup', targetIP],
    queryFn: async () => {
      if (!targetIP) throw new Error('No IP address available');
      
      const response = await fetch(`/api/ip-lookup/${encodeURIComponent(targetIP)}`);
      if (!response.ok) throw new Error('Failed to fetch IP data');
      
      const data = await response.json();
      if (data.status === 'fail') throw new Error(data.message || 'IP lookup failed');
      
      return data;
    },
    enabled: !!targetIP,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  const handleSearch = () => {
    if (customIP.trim()) {
      setSearchIP(customIP.trim());
    }
  };

  const hasError = error || currentIPError;
  const loading = isLoading || isLoadingCurrentIP;

  // Determine card styling based on status
  const getCardStyling = () => {
    if (hasError) {
      return "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800";
    }
    return "bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800";
  };

  const getBadgeVariant = (type: string) => {
    if (hasError) return "destructive";
    return "default";
  };

  if (compact && ipData) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${getCardStyling()}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ipData?.query || 'Unknown IP'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ipData?.city || 'Unknown'}, {ipData?.regionName || 'Unknown'}, {ipData?.country || 'Unknown'}
                  </p>
                </div>
                <Badge variant={getBadgeVariant("info")} className="text-xs">
                  {getIPVersion(ipData.query)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <IPLookupDialog ipData={ipData} />
      </Dialog>
    );
  }

  return (
    <div className="space-y-4">
      {showInput && (
        <Card className="bg-gradient-to-r from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              IP Address Lookup
            </CardTitle>
            <CardDescription>Enter an IP address to get detailed location and ISP information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="ip-input" className="sr-only">IP Address</Label>
                <Input
                  id="ip-input"
                  placeholder="Enter IP address (e.g., 8.8.8.8)"
                  value={customIP}
                  onChange={(e) => setCustomIP(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={!customIP.trim() || loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={`transition-all duration-300 ${getCardStyling()}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {hasError ? 'IP Lookup Failed' : 'IP Information'}
              </CardTitle>
              <CardDescription>
                {hasError 
                  ? 'Unable to retrieve IP information' 
                  : targetIP 
                    ? `Details for ${targetIP}`
                    : 'Loading IP information...'
                }
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="bg-white/50 dark:bg-gray-800/50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
              </div>
            </div>
          ) : hasError ? (
            <div className="text-center py-6">
              <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 dark:text-red-400 font-medium">
                {error?.message || currentIPError?.message || 'Failed to load IP information'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please check the IP address and try again
              </p>
            </div>
          ) : ipData ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span className="font-medium">IP Address</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ipData.query}</p>
                  <Badge variant={getBadgeVariant("info")} className="text-xs">
                    {getIPVersion(ipData.query)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Time Zone</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ipData.timezone}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeInIST(ipData.timezone)}</p>
                </div>
              </div>

              <Separator />

              {/* Location Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Location</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">City:</span>
                    <p>{ipData.city || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region:</span>
                    <p>{ipData.regionName || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Country:</span>
                    <p>{ipData.country || 'Unknown'} ({ipData.countryCode})</p>
                  </div>
                </div>
                {ipData.lat && ipData.lon && (
                  <p className="text-xs text-muted-foreground">
                    Coordinates: {ipData.lat.toFixed(4)}, {ipData.lon.toFixed(4)}
                  </p>
                )}
              </div>

              <Separator />

              {/* ISP Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  <span className="font-medium">Network Information</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">ISP:</span>
                    <p>{ipData.isp || 'Unknown'}</p>
                  </div>
                  {ipData.org && ipData.org !== ipData.isp && (
                    <div>
                      <span className="text-muted-foreground">Organization:</span>
                      <p>{ipData.org}</p>
                    </div>
                  )}
                  {ipData.as && (
                    <div>
                      <span className="text-muted-foreground">AS Number:</span>
                      <p>{ipData.as}</p>
                    </div>
                  )}
                </div>

                {/* Security Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {ipData.mobile && (
                    <Badge variant="secondary" className="text-xs">
                      📱 Mobile Network
                    </Badge>
                  )}
                  {ipData.proxy && (
                    <Badge variant="destructive" className="text-xs">
                      🔒 Proxy Detected
                    </Badge>
                  )}
                  {ipData.hosting && (
                    <Badge variant="outline" className="text-xs">
                      🏢 Hosting Provider
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Action Button */}
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                asChild
              >
                <a 
                  href={`https://whatismyipaddress.com/ip/${ipData.query}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View More Details
                </a>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// Detailed dialog component
function IPLookupDialog({ ipData }: { ipData: IPLookupData }) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Detailed IP Information
        </DialogTitle>
        <DialogDescription>
          Complete lookup details for {ipData.query}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Basic Info
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP Address:</span>
                  <span className="font-mono">{ipData.query}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="text-xs">
                    {getIPVersion(ipData.query)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ZIP Code:</span>
                  <span>{ipData.zip || 'N/A'}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time & Location
              </h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Timezone:</span>
                  <p>{ipData.timezone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current IST:</span>
                  <p className="text-xs">{formatTimeInIST(ipData.timezone)}</p>
                </div>
                {ipData.lat && ipData.lon && (
                  <div>
                    <span className="text-muted-foreground">Coordinates:</span>
                    <p className="font-mono text-xs">{ipData.lat.toFixed(6)}, {ipData.lon.toFixed(6)}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Location Details */}
        <Card className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Geographic Location
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Country:</span>
                <p className="font-medium">{ipData.country}</p>
                <p className="text-xs text-muted-foreground">({ipData.countryCode})</p>
              </div>
              <div>
                <span className="text-muted-foreground">Region:</span>
                <p className="font-medium">{ipData.regionName}</p>
                <p className="text-xs text-muted-foreground">({ipData.region})</p>
              </div>
              <div>
                <span className="text-muted-foreground">City:</span>
                <p className="font-medium">{ipData.city}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Postal Code:</span>
                <p className="font-medium">{ipData.zip || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Network Information */}
        <Card className="p-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network Details
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Internet Service Provider:</span>
                <p className="font-medium">{ipData.isp}</p>
              </div>
              {ipData.org && ipData.org !== ipData.isp && (
                <div>
                  <span className="text-muted-foreground">Organization:</span>
                  <p>{ipData.org}</p>
                </div>
              )}
              {ipData.as && (
                <div>
                  <span className="text-muted-foreground">Autonomous System:</span>
                  <p className="font-mono text-xs">{ipData.as}</p>
                </div>
              )}
            </div>

            {/* Security and Network Type Indicators */}
            <div className="flex flex-wrap gap-2 mt-3">
              {ipData.mobile && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  📱 Mobile Network
                </Badge>
              )}
              {ipData.proxy && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  🔒 Proxy/VPN Detected
                </Badge>
              )}
              {ipData.hosting && (
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  🏢 Hosting Provider
                </Badge>
              )}
              {!ipData.mobile && !ipData.proxy && !ipData.hosting && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  ✅ Residential IP
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* External Link */}
        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
          asChild
        >
          <a 
            href={`https://whatismyipaddress.com/ip/${ipData.query}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Complete Analysis
          </a>
        </Button>
      </div>
    </DialogContent>
  );
}