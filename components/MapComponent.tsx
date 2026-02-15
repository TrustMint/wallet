
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, OrderStatus } from '../types';
import { Icons } from '../constants';

// --- ICONS ---
const CarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
);

const WalkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v6l-3 4-2.5-1.5 2-3.5"/><path d="M13 4h-2l-3 3-1 4.5"/><path d="M10 16.5 13 20"/><circle cx="13" cy="4" r="2"/></svg>
);

// Map Pin Icon
const NavigationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);

// Кастомные маркеры
const createCustomIcon = (type: 'pickup' | 'delivery' | 'courier') => {
    let html = '';
    
    if (type === 'pickup') {
        html = `
            <div class="relative w-8 h-8 flex items-center justify-center">
                <div class="absolute inset-0 bg-[#0A84FF] rounded-full opacity-30 animate-pulse"></div>
                <div class="relative w-6 h-6 bg-[#0A84FF] border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                    <span class="text-[10px] font-bold text-white">A</span>
                </div>
            </div>
        `;
    } else if (type === 'delivery') {
        html = `
            <div class="relative w-8 h-8 flex items-center justify-center">
                <div class="absolute inset-0 bg-[#30D158] rounded-full opacity-30 animate-pulse"></div>
                <div class="relative w-6 h-6 bg-[#30D158] border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                    <span class="text-[10px] font-bold text-white">B</span>
                </div>
            </div>
        `;
    } else if (type === 'courier') {
        html = `
            <div class="relative w-12 h-12 flex items-center justify-center transition-all duration-500 ease-linear">
                <div class="absolute inset-0 bg-[#FFD60A] rounded-full opacity-20 animate-ping"></div>
                <div class="relative w-9 h-9 bg-[#1C1C1E] border-2 border-[#FFD60A] rounded-full flex items-center justify-center shadow-xl z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
                </div>
            </div>
        `;
    }

    return L.divIcon({
        className: 'custom-div-icon',
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

// Контроллер карты (Zoom, Route, Location)
const MapController: React.FC<{ 
    start: Coordinates; 
    end: Coordinates; 
    mode: 'car' | 'foot';
    onRouteFound: (coords: [number, number][]) => void;
    bottomPadding: number;
    requestLocation: boolean;
    onLocationFound: () => void;
    userLocation?: Coordinates;
}> = ({ start, end, mode, onRouteFound, bottomPadding, requestLocation, onLocationFound, userLocation }) => {
    const map = useMap();
    const isFetchingRef = useRef(false);

    // Обработка кнопки "Где я"
    useEffect(() => {
        if (requestLocation && userLocation) {
            map.flyTo([userLocation.lat, userLocation.lng], 16, {
                animate: true,
                duration: 1.5
            });
            onLocationFound();
        }
    }, [requestLocation, userLocation, map, onLocationFound]);

    // Построение маршрута и FitBounds
    useEffect(() => {
        if (!start || !end) return;

        // 1. Fit Bounds with Padding
        const bounds = L.latLngBounds([
            [start.lat, start.lng],
            [end.lat, end.lng]
        ]);
        
        // PADDING: [top-left, bottom-right]
        // Увеличиваем паддинг снизу, чтобы контент карты был СТРОГО над шторкой.
        // bottomPadding - это высота шторки. Добавляем 80px запаса.
        map.fitBounds(bounds, { 
            paddingTopLeft: [50, 50],
            paddingBottomRight: [50, bottomPadding + 80], 
            animate: true, 
            duration: 1 
        });

        // 2. Fetch OSRM Route
        const fetchRoute = async () => {
            // Разрешаем повторный запрос при смене режима (авто/пешком)
            isFetchingRef.current = true;

            try {
                const profile = mode === 'car' ? 'driving' : 'foot';
                // OSRM Public Server
                const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
                
                const response = await fetch(url);
                const data = await response.json();

                if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                    const geometry = data.routes[0].geometry;
                    // Leaflet uses [lat, lng], GeoJSON uses [lng, lat]
                    const latLngs = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                    onRouteFound(latLngs);
                } else {
                    // Fallback to straight line
                    onRouteFound([[start.lat, start.lng], [end.lat, end.lng]]);
                }
            } catch (e) {
                console.warn('Routing failed', e);
                onRouteFound([[start.lat, start.lng], [end.lat, end.lng]]);
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchRoute();

    }, [start.lat, start.lng, end.lat, end.lng, mode, map, onRouteFound, bottomPadding]);

    return null;
};

interface MapComponentProps {
    pickup?: Coordinates;
    delivery?: Coordinates;
    courier?: Coordinates;
    status?: OrderStatus;
    className?: string;
    isCourierView?: boolean;
    bottomSheetHeight?: number; // Высота шторки для смещения центра карты
    
    // New props for external control (Lifting State Up)
    routeMode?: 'car' | 'foot';
    onRouteModeChange?: (mode: 'car' | 'foot') => void;
    triggerLocate?: boolean;
    onLocateHandled?: () => void;
    hideControls?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({ 
    pickup, 
    delivery, 
    courier, 
    status,
    className = '', 
    isCourierView = false,
    bottomSheetHeight = 400,
    routeMode: externalRouteMode,
    onRouteModeChange,
    triggerLocate,
    onLocateHandled,
    hideControls = false
}) => {
    const [internalRouteMode, setInternalRouteMode] = useState<'car' | 'foot'>('car');
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [internalLocateTrigger, setInternalLocateTrigger] = useState(false);
    
    // Use external state if provided, otherwise internal
    const mode = externalRouteMode || internalRouteMode;
    const locateTrigger = triggerLocate !== undefined ? triggerLocate : internalLocateTrigger;
    
    const handleModeChange = (newMode: 'car' | 'foot') => {
        if (onRouteModeChange) onRouteModeChange(newMode);
        else setInternalRouteMode(newMode);
    };

    const handleLocateHandled = () => {
        if (onLocateHandled) onLocateHandled();
        else setInternalLocateTrigger(false);
    };
    
    // Используем центр Москвы по умолчанию
    const defaultCenter: [number, number] = [55.7558, 37.6173]; 

    // Логика определения маршрута
    const routeConfig = useMemo(() => {
        if (isCourierView && status === OrderStatus.ACCEPTED && courier && pickup) {
            return { start: courier, end: pickup, phase: 'to_pickup' };
        }
        if (isCourierView && status === OrderStatus.PICKED_UP && delivery) {
            return { start: courier || pickup!, end: delivery, phase: 'to_delivery' };
        }
        // Default: A -> B
        if (pickup && delivery) {
            return { start: pickup, end: delivery, phase: 'preview' };
        }
        return null;
    }, [pickup, delivery, courier, status, isCourierView]);

    const stopPropagation = (e: any) => {
        e.stopPropagation();
    };

    // Current user position logic (either courier for themselves, or courier position for sender)
    const userLocationToFlyTo = isCourierView ? courier : (courier || pickup);

    return (
        <div 
            className={`relative w-full h-full overflow-hidden ${className}`}
            data-no-swipe="true" 
            onTouchStart={stopPropagation}
            onTouchMove={stopPropagation}
            onTouchEnd={stopPropagation}
        >
            <MapContainer 
                center={defaultCenter} 
                zoom={11} 
                style={{ width: '100%', height: '100%', background: '#151515', zIndex: 0 }}
                zoomControl={false}
                attributionControl={false}
                dragging={true}
                touchZoom={true}
                doubleClickZoom={true}
                scrollWheelZoom={true}
            >
                {/* Dark Matter Tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />

                {pickup && (
                    <Marker position={[pickup.lat, pickup.lng]} icon={createCustomIcon('pickup')} />
                )}

                {delivery && (
                    <Marker position={[delivery.lat, delivery.lng]} icon={createCustomIcon('delivery')} />
                )}

                {courier && (
                    <Marker position={[courier.lat, courier.lng]} icon={createCustomIcon('courier')} zIndexOffset={100} />
                )}

                {/* Маршрут */}
                {routePath.length > 0 && (
                    <>
                        <Polyline 
                            positions={routePath} 
                            pathOptions={{ 
                                color: mode === 'car' ? '#0A84FF' : '#30D158', 
                                weight: 8, 
                                opacity: 0.3 
                            }} 
                        />
                        <Polyline 
                            positions={routePath} 
                            pathOptions={{ 
                                color: mode === 'car' ? '#0A84FF' : '#30D158', 
                                weight: 4, 
                                opacity: 1,
                                dashArray: mode === 'foot' ? '1, 10' : undefined 
                            }} 
                        />
                    </>
                )}

                {routeConfig && (
                    <MapController 
                        start={routeConfig.start} 
                        end={routeConfig.end} 
                        mode={mode}
                        onRouteFound={setRoutePath}
                        bottomPadding={bottomSheetHeight}
                        requestLocation={locateTrigger}
                        onLocationFound={handleLocateHandled}
                        userLocation={userLocationToFlyTo}
                    />
                )}
            </MapContainer>
            
            {/* Controls Overlay (Right Side) - ONLY IF NOT HIDDEN */}
            {!hideControls && (
                <div 
                    className="absolute right-4 flex flex-col gap-3 z-[500]"
                    style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
                >
                    {/* 1. Mode Switcher (Only Courier) */}
                    {isCourierView && (
                        <div className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full p-1.5 flex flex-col gap-2 shadow-lg">
                            <button 
                                onClick={() => handleModeChange('car')}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    mode === 'car' 
                                    ? 'bg-[#0A84FF] text-white shadow-md' 
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <CarIcon />
                            </button>
                            <button 
                                onClick={() => handleModeChange('foot')}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                    mode === 'foot' 
                                    ? 'bg-[#30D158] text-white shadow-md' 
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <WalkIcon />
                            </button>
                        </div>
                    )}

                    {/* 2. Locate Button */}
                    <button
                        onClick={() => setInternalLocateTrigger(true)}
                        className="w-[52px] h-[52px] bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                    >
                        <NavigationIcon />
                    </button>
                </div>
            )}
        </div>
    );
};
