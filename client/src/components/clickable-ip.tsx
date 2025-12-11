import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { ExternalLink, MapPin, Globe, Clock, Wifi, Shield, RefreshCw } from 'lucide-react';
import { GoogleMapsPopup } from './google-maps-popup';
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

interface ClickableIPProps {
  ipAddress: string;
  className?: string;
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

export function ClickableIP({ ipAddress, className = "" }: ClickableIPProps) {
  const [showMapPopup, setShowMapPopup] = useState(false);
  
  // Fetch IP lookup data when dialog opens
  const { data: ipData, isLoading, error, refetch } = useQuery<IPLookupData>({
    queryKey: ['ip-lookup', ipAddress],
    queryFn: async () => {
      const response = await fetch(`/api/ip-lookup/${encodeURIComponent(ipAddress)}`);
      if (!response.ok) throw new Error('Failed to fetch IP data');
      
      const data = await response.json();
      if (data.status === 'fail') throw new Error(data.message || 'IP lookup failed');
      
      return data;
    },
    enabled: false, // Only fetch when dialog opens
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  const handleDialogOpen = () => {
    refetch();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button 
          className={`font-mono text-xs bg-muted hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-1 rounded transition-colors cursor-pointer border border-transparent hover:border-blue-300 dark:hover:border-blue-700 break-all text-left leading-tight max-w-full ${className}`}
          onClick={handleDialogOpen}
        >
          {ipAddress}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950 border-0 shadow-2xl">
        <DialogHeader className="text-center pb-6 border-b border-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            IP Address Analysis
          </DialogTitle>
          <DialogDescription className="text-lg text-slate-600 dark:text-slate-300 mt-2">
            Comprehensive network and geolocation insights
          </DialogDescription>
          <div className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg inline-block">
            <span className="font-mono text-sm font-medium break-all">{ipAddress}</span>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading IP information...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 dark:text-red-400 font-medium">
              {error?.message || 'Failed to load IP information'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please check the IP address and try again
            </p>
            <Button onClick={() => refetch()} className="mt-4" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : ipData ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-900/20">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    IP Address
                  </h4>
                  <p className="font-mono text-sm break-all leading-tight">{ipData.query}</p>
                  <Badge variant="outline" className="text-xs">
                    {getIPVersion(ipData.query)}
                  </Badge>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/20 dark:to-emerald-900/20">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h4>
                  <p className="text-sm">
                    {ipData.city}, {ipData.regionName}
                  </p>
                  <p className="text-sm font-medium">
                    {ipData.country} ({ipData.countryCode})
                  </p>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/20 dark:to-violet-900/20">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Zone
                  </h4>
                  <p className="text-sm">{ipData.timezone}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeInIST(ipData.timezone)}</p>
                </div>
              </Card>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Geographic Details */}
              <Card className="p-4">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Geographic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                  {ipData.lat && ipData.lon && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-sm">Coordinates:</span>
                      <button
                        onClick={() => setShowMapPopup(true)}
                        className="block font-mono text-xs bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 mt-1 w-full text-left group"
                        data-testid="button-coordinates-map"
                      >
                        <div className="flex items-center justify-between">
                          <span>{ipData.lat.toFixed(6)}, {ipData.lon.toFixed(6)}</span>
                          <MapPin className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-xs opacity-70 group-hover:opacity-100 transition-opacity">Click to view on map</span>
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Network Information */}
              <Card className="p-4">
                <div className="space-y-3">
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
                </div>
              </Card>
            </div>

            {/* Security Information */}
            <Card className="p-4">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security & Network Type
                </h4>
                <div className="flex flex-wrap gap-2">
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


          </div>
        ) : null}
      </DialogContent>

      {/* Google Maps Popup */}
      {ipData && ipData.lat && ipData.lon && (
        <GoogleMapsPopup
          isOpen={showMapPopup}
          onClose={() => setShowMapPopup(false)}
          latitude={ipData.lat}
          longitude={ipData.lon}
          location={`${ipData.city}, ${ipData.regionName}, ${ipData.country}`}
          ipAddress={ipAddress}
        />
      )}
    </Dialog>
  );
}