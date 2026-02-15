
import { useState, useEffect, useRef } from 'react';
import { UserLocation } from '../types';

interface LocationUpdate {
    location: UserLocation;
    city?: string;
}

export const useLocationTracker = (
    enabled: boolean, 
    onUpdate: (data: LocationUpdate) => void
) => {
  const [trackingStarted, setTrackingStarted] = useState(false);
  const isFetchingCityRef = useRef(false);

  // Helper to fetch city name from coordinates (Reverse Geocoding)
  const detectCity = async (lat: number, lng: number): Promise<string | undefined> => {
    if (isFetchingCityRef.current) return undefined;
    
    isFetchingCityRef.current = true;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
        headers: {
            'User-Agent': 'KvantApp/1.0',
            'Accept-Language': 'ru'
        }
      });
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.village || data.address?.state;
    } catch (error) {
      console.warn('Failed to detect city:', error);
      return undefined;
    } finally {
      isFetchingCityRef.current = false;
    }
  };

  useEffect(() => {
    if (!enabled || trackingStarted) return;
    
    if ('geolocation' in navigator) {
        setTrackingStarted(true);
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Determine if we need to fetch city (simple check passed via logic in App usually, but here we do it if we get coords)
                const city = await detectCity(latitude, longitude);
                
                onUpdate({
                    location: {
                        lat: latitude,
                        lng: longitude,
                        lastUpdated: Date.now()
                    },
                    city: city
                });
            },
            (error) => {
                console.warn('Location tracking error:', error.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [enabled, trackingStarted, onUpdate]);
};
