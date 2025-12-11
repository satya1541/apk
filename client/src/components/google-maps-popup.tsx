import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  location?: string;
  ipAddress?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    initGoogleMapsCallback: () => void;
  }
}

export function GoogleMapsPopup({ 
  isOpen, 
  onClose, 
  latitude, 
  longitude, 
  location,
  ipAddress 
}: GoogleMapsPopupProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsMapLoaded(false);
      setMapError(null);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      // Small delay to ensure the DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
      return;
    }

    // Check if script is already loading
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      // Script is already loading, wait for it
      const handleLoad = () => {
        existingScript.removeEventListener('load', handleLoad);
        setTimeout(() => {
          initializeMap();
        }, 100);
      };
      existingScript.addEventListener('load', handleLoad);
      return;
    }

    // Load Google Maps script with better error handling
    const apiKey = 'AIzaSyDpyclQV4dQAs4q2UcfnmZ2lwzXPmIVe7E';
    if (!apiKey) {
      setMapError('Google Maps API key not configured');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&loading=async&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    
    // Create a global callback for Google Maps
    window.initGoogleMapsCallback = () => {
      setTimeout(() => {
        initializeMap();
      }, 100);
    };
    
    script.onerror = () => {
      setMapError('Unable to load Google Maps. This may be due to network restrictions, API key issues, or domain limitations. Please try refreshing the page.');
    };

    // Add timeout for loading
    const loadTimeout = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        setMapError('Google Maps loading timed out. Please check your internet connection and try again.');
      }
    }, 10000);

    script.onload = () => {
      clearTimeout(loadTimeout);
      setTimeout(() => {
        if (!window.google || !window.google.maps) {
          setMapError('Google Maps API failed to initialize properly. This may be due to API key restrictions or network issues.');
        }
      }, 2000);
    };

    document.head.appendChild(script);
  }, [isOpen, latitude, longitude]);

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return;

    try {
      // Clear any existing content
      mapRef.current.innerHTML = '';
      
      const position = { lat: latitude, lng: longitude };
      
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: position,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "all",
            elementType: "geometry.fill",
            stylers: [{ saturation: -40 }]
          }
        ]
      });

      // Add marker
      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: location || `Location for ${ipAddress}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#ef4444" stroke="#dc2626" stroke-width="2"/>
              <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(24, 24),
        }
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: system-ui;">
            <h2 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; text-align: center; color: #dc2626;">
              Device Network Location
            </h2>
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">
              ${location || 'Location'}
            </h3>
            ${ipAddress ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">IP: ${ipAddress}</p>` : ''}
            <p style="margin: 0; font-size: 12px; color: #666;">
              Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      // Open info window by default
      infoWindow.open(map, marker);

      setIsMapLoaded(true);
      setMapError(null);
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Location Map
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {location && (
              <span className="block font-medium text-foreground">{location}</span>
            )}
            {ipAddress && (
              <span className="block">IP Address: {ipAddress}</span>
            )}
            <span className="block">Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative h-[500px] w-full">
          {mapError ? (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
              {/* Show static map as fallback */}
              <div className="flex-1 relative overflow-hidden">
                <img 
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-l+ff0000(${longitude},${latitude})/${longitude},${latitude},13/800x400@2x?access_token=pk.eyJ1IjoidGVzdCIsImEiOiJjbGVtMmEzZ2wwMDAwM29wbnl6ZXJ6dTY5In0.JlnaBDcPqCKmQVHY8Iq4Nw`}
                  alt={`Map showing location at ${latitude}, ${longitude}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If static map also fails, show error message
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = target.nextElementSibling as HTMLDivElement;
                    if (errorDiv) errorDiv.style.display = 'flex';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center hidden">
                  <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
                    <MapPin className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Map Service Unavailable</h3>
                    <p className="text-sm text-muted-foreground mb-4">Unable to load map services. Location details are still available above.</p>
                    <div className="text-xs text-muted-foreground">
                      <p>Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                      {location && <p>Location: {location}</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Error message overlay */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Interactive Map Unavailable
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Showing static map as fallback. The interactive Google Maps could not load due to API restrictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !isMapLoaded ? (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading interactive map...</p>
              </div>
            </div>
          ) : null}
          
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ display: mapError ? 'none' : 'block' }}
          />
        </div>

        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Powered by Google Maps
            </div>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}