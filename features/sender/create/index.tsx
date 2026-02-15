
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Icons } from '../../../constants';
import { SwipeableWrapper } from '../../../components/SwipeableWrapper';
import { ActionSlider } from '../../../components/ActionSlider';
import { useModal } from '../../../hooks/useModal';
import { Order, Coordinates } from '../../../types';
import { FloatingBackButton } from '../../../components/FloatingBackButton';
import { AlertModal } from '../../../components/modals/AlertModal';
import { searchLocations, getAddressFromCoords } from '../../../services/api';

const DRAFT_KEY = 'kvant_order_draft';

// --- CUSTOM ICONS FOR CREATE ORDER MAP ---
const PickupIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative w-8 h-8 flex items-center justify-center">
             <div class="absolute inset-0 bg-[#0A84FF] rounded-full opacity-30 animate-pulse"></div>
             <div class="relative w-6 h-6 bg-[#0A84FF] border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                <span class="text-[10px] font-bold text-white">A</span>
             </div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const DeliveryIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative w-8 h-8 flex items-center justify-center">
             <div class="absolute inset-0 bg-[#30D158] rounded-full opacity-30 animate-pulse"></div>
             <div class="relative w-6 h-6 bg-[#30D158] border-2 border-white rounded-full flex items-center justify-center shadow-lg">
                <span class="text-[10px] font-bold text-white">B</span>
             </div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

const NavigationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);

// --- HELPER COMPONENT TO CONTROL MAP ---
const CreateMapController: React.FC<{
    activeField: 'pickup' | 'delivery';
    pickupCoords?: Coordinates;
    deliveryCoords?: Coordinates;
    onMoveEnd: (center: L.LatLng) => void;
    onMapClick: (coords: L.LatLng) => void;
    forceCenter?: Coordinates; 
}> = ({ activeField, pickupCoords, deliveryCoords, onMoveEnd, onMapClick, forceCenter }) => {
    const map = useMap();
    const isFlying = useRef(false);

    useMapEvents({
        dragstart: () => {},
        dragend: () => {
            if (!isFlying.current) {
                onMoveEnd(map.getCenter());
            }
        },
        click: (e) => {
            onMapClick(e.latlng);
        }
    });

    useEffect(() => {
        if (forceCenter) {
            isFlying.current = true;
            map.flyTo([forceCenter.lat, forceCenter.lng], 16, {
                animate: true,
                duration: 1.5
            });
            setTimeout(() => { isFlying.current = false; }, 1500);
        }
    }, [forceCenter, map]);

    useEffect(() => {
        if (pickupCoords && deliveryCoords && !forceCenter) {
            const bounds = L.latLngBounds(
                [pickupCoords.lat, pickupCoords.lng],
                [deliveryCoords.lat, deliveryCoords.lng]
            );
            map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
    }, [pickupCoords, deliveryCoords, map, forceCenter]);

    return null;
};

// --- NEW PROFESSIONAL ADDRESS INPUT ---

const SuggestionItem: React.FC<{ 
    label: string; 
    isLast: boolean; 
    onClick: () => void 
}> = ({ label, isLast, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="w-full text-left pl-[52px] pr-4 py-3.5 relative active:bg-white/10 transition-colors group"
    >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
            <Icons.MapPin />
        </div>
        <span className="text-[15px] text-white font-medium line-clamp-1">{label}</span>
        {!isLast && <div className="absolute bottom-0 left-[52px] right-0 h-[0.5px] bg-[#38383A]"></div>}
    </button>
);

const AddressRow: React.FC<{
    value: string;
    onChange: (val: string) => void;
    onFocus: () => void;
    onSelectSuggestion: (coords: Coordinates, label: string) => void;
    placeholder: string;
    onClear: () => void;
    isLast?: boolean;
    autoFocus?: boolean;
    label: string;
}> = ({ value, onChange, onFocus, onSelectSuggestion, placeholder, onClear, isLast, autoFocus, label }) => {
    const [suggestions, setSuggestions] = useState<Array<{ label: string, lat: number, lng: number }>>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = useRef<any>(null);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const txt = e.target.value;
        onChange(txt);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        
        if (txt.length > 2) {
            searchTimeout.current = setTimeout(async () => {
                const results = await searchLocations(txt);
                setSuggestions(results);
                setShowSuggestions(true);
            }, 300);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelect = (item: { label: string, lat: number, lng: number }) => {
        onSelectSuggestion({ lat: item.lat, lng: item.lng }, item.label);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center pl-[52px] pr-4 py-1.5">
                <input 
                    value={value}
                    onChange={handleInput}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    className="w-full bg-transparent h-[44px] text-[17px] text-white placeholder-neutral-500 focus:outline-none font-medium" 
                />
                {value.length > 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClear(); setSuggestions([]); }}
                        className="w-5 h-5 rounded-full bg-[#3A3A3C] flex items-center justify-center text-neutral-400 active:text-white transition-colors ml-2"
                    >
                        <div className="scale-[0.4]"><Icons.X /></div>
                    </button>
                )}
            </div>
            
            {/* Shorter Divider line not touching edges */}
            {!isLast && <div className="absolute bottom-0 left-[60px] right-4 h-[0.5px] bg-[#38383A]"></div>}

            {/* DROPDOWN SUGGESTIONS */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[100] overflow-hidden">
                    {suggestions.map((s, idx) => (
                        <SuggestionItem 
                            key={idx} 
                            label={s.label} 
                            isLast={idx === suggestions.length - 1} 
                            onClick={() => handleSelect(s)} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

const getActiveStyle = (color: string, active: boolean) => {
    if (!active) return {};
    return {
        backgroundColor: `${color}33`, 
        // Removed box-shadow glow as requested
        // boxShadow: `0 0 20px ${color}33` 
    };
};

const useSlowBounce = (onClick: () => void) => {
    const [isBouncing, setIsBouncing] = useState(false);
    const trigger = () => { setIsBouncing(true); onClick(); setTimeout(() => setIsBouncing(false), 250); };
    return { isBouncing, trigger };
};

const SizeCapsule: React.FC<{ label: string; desc: string; active: boolean; color: string; onClick: () => void }> = ({ label, desc, active, color, onClick }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);
    return (
        <button type="button" onClick={trigger} style={getActiveStyle(color, active)} className={`flex-1 flex flex-col items-center justify-center py-3.5 px-2 rounded-full backdrop-blur-xl min-w-[80px] transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] transform-gpu ${isBouncing ? 'scale-[0.7]' : (active ? 'scale-[1.02] text-white' : 'bg-white/5 text-neutral-400 scale-100')}`}>
            <div className="text-[16px] font-bold leading-tight" style={{ color: active ? color : undefined }}>{label}</div>
            <div className={`text-[11px] font-medium mt-0.5 transition-colors duration-300 ${active ? 'text-white/80' : 'text-neutral-500'}`}>{desc}</div>
        </button>
    );
};

const OptionCapsule: React.FC<{ label: string; icon: React.ReactNode; active: boolean; onClick: () => void; color?: string }> = ({ label, icon, active, onClick, color = '#30D158' }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);
    return (
        <button type="button" onClick={trigger} style={getActiveStyle(color, active)} className={`flex items-center justify-center px-5 py-3.5 rounded-full backdrop-blur-xl whitespace-nowrap transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] transform-gpu ${isBouncing ? 'scale-[0.7]' : (active ? 'scale-[1.02] text-white' : 'bg-white/5 text-neutral-400 scale-100')}`}>
            <span className={`text-[14px] font-bold transition-colors duration-300 ${active ? 'text-white' : 'text-neutral-300'}`}>{label}</span>
        </button>
    );
};

const GlassInputRow: React.FC<{ label?: string; children: React.ReactElement<any>; isLast?: boolean; alignTop?: boolean }> = ({ label, children, isLast, alignTop }) => (
    <div className="relative pl-4 pr-4 active:bg-[#2C2C2E] transition-colors group">
        <div className={`flex ${alignTop ? 'items-start pt-3.5' : 'items-center'} min-h-[52px]`}>
            {label && (
                <div className={`text-[17px] text-white w-[100px] shrink-0 font-medium flex items-center ${alignTop ? 'mt-0' : ''}`}>
                    {label} 
                    {label !== 'Комментарий' && <span className="text-[#FF3B30] ml-0.5">*</span>}
                </div>
            )}
            <div className="flex-1 relative flex items-center">{children}</div>
        </div>
        {/* Shorter Divider */}
        {!isLast && <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A] pointer-events-none"></div>}
    </div>
);

interface CreateOrderProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  zIndex?: number;
  initialData?: Order | null; // Can also be draft data
  backgroundSelector?: string;
}

export const CreateOrder: React.FC<CreateOrderProps> = ({ onClose, onSubmit, zIndex = 120, initialData, backgroundSelector }) => {
  const { showModal, hideModal } = useModal();
  
  // --- FORM STATE ---
  const [activeField, setActiveField] = useState<'pickup' | 'delivery'>('pickup');
  const [pickup, setPickup] = useState(initialData?.pickupAddress || '');
  const [delivery, setDelivery] = useState(initialData?.deliveryAddress || '');
  const [pickupCoords, setPickupCoords] = useState<Coordinates | undefined>(initialData?.pickupLocation);
  const [deliveryCoords, setDeliveryCoords] = useState<Coordinates | undefined>(initialData?.deliveryLocation);
  const [mapCenterTarget, setMapCenterTarget] = useState<Coordinates | undefined>(undefined);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const getInitialSize = (weight?: string) => {
      if (!weight) return null; 
      if (weight.includes('1 кг')) return 'small';
      if (weight.includes('5 кг')) return 'medium';
      if (weight.includes('20 кг')) return 'large';
      return 'other';
  };
  const [coSize, setCoSize] = useState(getInitialSize(initialData?.weight));
  const [coPrice, setCoPrice] = useState(initialData ? initialData.price.toString() : '');
  const [coPayment, setCoPayment] = useState<'card' | 'cash'>(initialData?.paymentMethod || 'card');
  
  const getInitialOptions = (options?: string[]) => ({
     docs: options?.includes('cat_docs') || false,
     fragile: options?.includes('fragile') || false,
     urgent: options?.includes('urgent') || false,
     doorToDoor: options?.includes('door_to_door') || false, 
     thermo: options?.includes('thermo') || false,
     photo: options?.includes('photo') || false,
     tech: options?.includes('cat_tech') || false,
     gift: options?.includes('cat_gift') || false,
     food: options?.includes('cat_food') || false,
     other: options?.includes('cat_other') || false
  });
  const [coOptions, setCoOptions] = useState(getInitialOptions(initialData?.options));

  // --- DRAFT SAVING EFFECT ---
  useEffect(() => {
      // Only save if it's not a previously submitted order we are editing
      // We assume if it has an ID, it's an existing order
      if (initialData && (initialData as any).id) return; 

      const draft = {
          pickupAddress: pickup,
          deliveryAddress: delivery,
          pickupLocation: pickupCoords,
          deliveryLocation: deliveryCoords,
          title,
          description,
          price: coPrice,
          weight: coSize === 'small' ? 'до 1 кг' : coSize === 'medium' ? 'до 5 кг' : coSize === 'large' ? 'до 20 кг' : 'Свой размер',
          paymentMethod: coPayment,
          options: [] as string[]
      };

      if (coOptions.docs) draft.options.push('cat_docs');
      if (coOptions.fragile) draft.options.push('fragile');
      if (coOptions.urgent) draft.options.push('urgent');
      if (coOptions.doorToDoor) draft.options.push('door_to_door');
      if (coOptions.thermo) draft.options.push('thermo');
      if (coOptions.photo) draft.options.push('photo');
      if (coOptions.tech) draft.options.push('cat_tech');
      if (coOptions.gift) draft.options.push('cat_gift');
      if (coOptions.food) draft.options.push('cat_food');
      if (coOptions.other) draft.options.push('cat_other');

      // Only save if there is at least some data
      if (pickup || delivery || title || coPrice) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
  }, [pickup, delivery, pickupCoords, deliveryCoords, title, description, coPrice, coSize, coPayment, coOptions, initialData]);

  // --- MAP LOGIC ---
  const defaultCenter = { lat: 55.7558, lng: 37.6173 };

  const handleMapMoveEnd = async (center: L.LatLng) => {
      const address = await getAddressFromCoords(center.lat, center.lng);
      if (address) {
          if (activeField === 'pickup') {
              setPickup(address);
              setPickupCoords({ lat: center.lat, lng: center.lng });
          } else {
              setDelivery(address);
              setDeliveryCoords({ lat: center.lat, lng: center.lng });
          }
      }
  };

  const handleMapClick = async (coords: L.LatLng) => {
      setMapCenterTarget({ lat: coords.lat, lng: coords.lng });
  };

  const handleSuggestionSelect = (coords: Coordinates, label: string) => {
      if (activeField === 'pickup') {
          setPickup(label);
          setPickupCoords(coords);
          // Auto switch to delivery if it's empty
          if (!delivery) {
              setActiveField('delivery');
          }
      } else {
          setDelivery(label);
          setDeliveryCoords(coords);
      }
      setMapCenterTarget(coords);
  };

  const handleLocateMe = () => {
      if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
              const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setMapCenterTarget(coords);
              const address = await getAddressFromCoords(coords.lat, coords.lng);
              if (address) {
                  if (activeField === 'pickup') {
                      setPickup(address);
                      setPickupCoords(coords);
                  } else {
                      setDelivery(address);
                      setDeliveryCoords(coords);
                  }
              }
          });
      }
  };

  // --- SUBMIT LOGIC ---
  const handlePublish = () => {
    if (!pickup || !delivery || !title || !coPrice || !coSize) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
        showModal(<AlertModal title="Не все заполнено" message="Пожалуйста, укажите адреса, название, размер и стоимость заказа." type="info" onClose={hideModal} />);
        return;
    }

    const options: string[] = [];
    if (coOptions.docs) options.push('cat_docs');
    if (coOptions.fragile) options.push('fragile');
    if (coOptions.urgent) options.push('urgent');
    if (coOptions.doorToDoor) options.push('door_to_door');
    if (coOptions.thermo) options.push('thermo');
    if (coOptions.photo) options.push('photo');
    if (coOptions.tech) options.push('cat_tech');
    if (coOptions.gift) options.push('cat_gift');
    if (coOptions.food) options.push('cat_food');
    if (coOptions.other) options.push('cat_other');

    onSubmit({
        title,
        description,
        pickupAddress: pickup,
        deliveryAddress: delivery,
        pickupLocation: pickupCoords,
        deliveryLocation: deliveryCoords,
        price: Number(coPrice || 0),
        weight: coSize === 'small' ? 'до 1 кг' : coSize === 'medium' ? 'до 5 кг' : coSize === 'large' ? 'до 20 кг' : 'Свой размер',
        paymentMethod: coPayment,
        options: options
    });
  };

  // --- PRICE SCRUBBER ---
  const scrubStartVal = useRef<number>(0);
  const scrubStartX = useRef<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleScrubStart = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      scrubStartX.current = clientX;
      const currentPrice = parseInt(coPrice.replace(/\D/g, '')) || 0;
      scrubStartVal.current = currentPrice;
      setIsScrubbing(true);
  };

  const handleScrubMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isScrubbing) return;
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const delta = clientX - scrubStartX.current;
      const stepValue = 10;
      const diffSteps = Math.floor(delta / 2);
      let newPrice = scrubStartVal.current + (diffSteps * stepValue);
      if (newPrice < 0) newPrice = 0;
      setCoPrice(newPrice.toString());
  };

  const handleScrubEnd = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      setIsScrubbing(false);
  };

  const IosArrowRight = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
  );

  // Route Path calculation
  const routePath = (pickupCoords && deliveryCoords) 
    ? [ [pickupCoords.lat, pickupCoords.lng], [deliveryCoords.lat, deliveryCoords.lng] ] as [number, number][]
    : [];

  return (
    <SwipeableWrapper onDismiss={onClose} zIndex={zIndex} backgroundSelector={backgroundSelector}>
      <div className="fixed inset-0 flex flex-col bg-black">
        
        {/* --- MAP LAYER (TOP HALF) --- */}
        <div 
            className="absolute top-0 left-0 right-0 h-[45vh] z-0 bg-[#151515]"
            data-no-swipe="true" 
        >
            <MapContainer 
                center={[defaultCenter.lat, defaultCenter.lng]} 
                zoom={11} 
                style={{ width: '100%', height: '100%', background: '#151515' }}
                zoomControl={false}
                attributionControl={false}
                dragging={true}
                touchZoom={true}
                doubleClickZoom={true}
                scrollWheelZoom={true}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                
                {pickupCoords && <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={PickupIcon} zIndexOffset={activeField === 'pickup' ? 100 : 0} />}
                {deliveryCoords && <Marker position={[deliveryCoords.lat, deliveryCoords.lng]} icon={DeliveryIcon} zIndexOffset={activeField === 'delivery' ? 100 : 0} />}
                
                {routePath.length > 0 && <Polyline positions={routePath} pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.3, dashArray: '5, 10' }} />}

                <div className="leaflet-control" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 400, pointerEvents: 'none' }}>
                    <div className={`w-4 h-4 rounded-full border-[3px] shadow-lg transition-colors ${activeField === 'pickup' ? 'border-[#0A84FF] bg-white' : 'border-[#30D158] bg-white'}`}></div>
                </div>

                <CreateMapController 
                    activeField={activeField} 
                    pickupCoords={pickupCoords}
                    deliveryCoords={deliveryCoords}
                    onMoveEnd={handleMapMoveEnd}
                    onMapClick={handleMapClick}
                    forceCenter={mapCenterTarget}
                />
            </MapContainer>

            <div className="absolute right-3 bottom-8 z-[400]">
                <button onClick={handleLocateMe} className="w-10 h-10 rounded-full bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-95">
                    <NavigationIcon />
                </button>
            </div>
            
            <FloatingBackButton onClick={onClose} />
        </div>

        {/* --- SCROLLABLE FORM SHEET (BOTTOM HALF) --- */}
        <div className="absolute inset-x-0 bottom-0 top-[35vh] z-10 overflow-y-auto scrolling-touch rounded-t-[32px] bg-black shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="w-10 h-1.5 bg-neutral-800 rounded-full mx-auto mt-3 mb-1"></div>
            
            <div className="px-3 pb-32 pt-2">
                <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pb-4 px-1">
                    Маршрут
                </div>

                {/* --- 1. PROFESSIONAL ROUTE INPUT BLOCK (iOS Style) --- */}
                <div className="mb-6 rounded-[24px] bg-[#1C1C1E] overflow-visible relative z-20 pt-4 pb-2">
                    {/* Visual Route Line (Left Side) */}
                    <div className="absolute left-4 top-[24px] bottom-[24px] w-4 flex flex-col items-center z-10 pointer-events-none">
                        {/* A Point */}
                        <div className={`w-3 h-3 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF] transition-transform duration-300 ${activeField === 'pickup' ? 'scale-125' : 'scale-100'}`}></div>
                        
                        {/* Connecting Line */}
                        <div className="flex-1 w-[2px] bg-gradient-to-b from-[#0A84FF] via-white/20 to-[#30D158] my-2 rounded-full opacity-50"></div>
                        
                        {/* B Point */}
                        <div className={`w-3 h-3 rounded-sm bg-[#30D158] shadow-[0_0_8px_#30D158] transition-transform duration-300 ${activeField === 'delivery' ? 'scale-125' : 'scale-100'}`}></div>
                    </div>

                    <AddressRow 
                        label="Откуда"
                        value={pickup} 
                        onChange={setPickup} 
                        onFocus={() => { 
                            setActiveField('pickup'); 
                            if(pickupCoords) setMapCenterTarget(pickupCoords);
                        }}
                        onSelectSuggestion={handleSuggestionSelect}
                        onClear={() => { setPickup(''); setPickupCoords(undefined); }}
                        placeholder="Откуда забрать"
                        autoFocus={!initialData} // Auto focus on open for new orders
                    />
                    
                    <AddressRow 
                        label="Куда"
                        value={delivery} 
                        onChange={setDelivery} 
                        onFocus={() => { 
                            setActiveField('delivery');
                            if(deliveryCoords) setMapCenterTarget(deliveryCoords);
                        }}
                        onSelectSuggestion={handleSuggestionSelect}
                        onClear={() => { setDelivery(''); setDeliveryCoords(undefined); }}
                        placeholder="Куда доставить"
                        isLast
                    />
                </div>

                {/* 2. Details Section */}
                <div className="mb-6 rounded-[24px] bg-[#1C1C1E] overflow-hidden">
                    <GlassInputRow label="Что везем">
                        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Ключи" className="w-full bg-transparent h-full py-4 text-[17px] text-white placeholder-neutral-500 focus:outline-none font-medium" />
                    </GlassInputRow>
                    <GlassInputRow isLast alignTop label="Комментарий">
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Детали..." className="w-full bg-transparent pt-0 pb-4 text-[17px] text-white placeholder-neutral-500 focus:outline-none resize-none h-24 align-top -ml-2 font-medium"></textarea>
                    </GlassInputRow>
                </div>

                {/* 3. Size */}
                <div className="mb-6">
                    <div className="px-3 pb-2.5 text-[13px] text-neutral-400 uppercase font-bold tracking-wider">Размер отправления <span className="text-[#FF3B30]">*</span></div>
                    <div className="flex gap-2">
                        <SizeCapsule label="S" desc="до 1 кг" color="#30D158" active={coSize === 'small'} onClick={() => setCoSize('small')} />
                        <SizeCapsule label="M" desc="до 5 кг" color="#0A84FF" active={coSize === 'medium'} onClick={() => setCoSize('medium')} />
                        <SizeCapsule label="L" desc="до 20 кг" color="#FF9F0A" active={coSize === 'large'} onClick={() => setCoSize('large')} />
                        <SizeCapsule label="XL" desc="Другое" color="#FF375F" active={coSize === 'other'} onClick={() => setCoSize('other')} />
                    </div>
                </div>

                {/* 4. Options - Added data-no-swipe to prevent accidental back gestures */}
                <div className="mb-6" data-no-swipe="true">
                     <div className="px-3 pb-2.5 text-[13px] text-neutral-400 uppercase font-bold tracking-wider">Опции</div>
                     <div className="flex overflow-x-auto gap-3 pb-2 -mx-3 px-3 scrollbar-hide">
                        <OptionCapsule label="Документы" icon={<Icons.FileText />} active={coOptions.docs} color="#0A84FF" onClick={() => setCoOptions({...coOptions, docs: !coOptions.docs})} />
                        <OptionCapsule label="Хрупкое" icon={<Icons.Shield />} active={coOptions.fragile} color="#BF5AF2" onClick={() => setCoOptions({...coOptions, fragile: !coOptions.fragile})} />
                        <OptionCapsule label="Срочно" icon={<Icons.Zap />} active={coOptions.urgent} color="#FF3B30" onClick={() => setCoOptions({...coOptions, urgent: !coOptions.urgent})} />
                        <OptionCapsule label="Термо" icon={<Icons.DownloadCloud />} active={coOptions.thermo} color="#64D2FF" onClick={() => setCoOptions({...coOptions, thermo: !coOptions.thermo})} />
                        <OptionCapsule label="Фотоотчет" icon={<Icons.Camera />} active={coOptions.photo} color="#5E5CE6" onClick={() => setCoOptions({...coOptions, photo: !coOptions.photo})} />
                        <OptionCapsule label="До двери" icon={<Icons.Box />} active={coOptions.doorToDoor} color="#0A84FF" onClick={() => setCoOptions({...coOptions, doorToDoor: !coOptions.doorToDoor})} />
                        
                        {/* New Badges */}
                        <OptionCapsule label="Техника" icon={<Icons.Smartphone />} active={coOptions.tech} color="#5E5CE6" onClick={() => setCoOptions({...coOptions, tech: !coOptions.tech})} />
                        <OptionCapsule label="Подарок" icon={<Icons.Gift />} active={coOptions.gift} color="#FF2D55" onClick={() => setCoOptions({...coOptions, gift: !coOptions.gift})} />
                        <OptionCapsule label="Еда" icon={<Icons.ShoppingBag />} active={coOptions.food} color="#FF9F0A" onClick={() => setCoOptions({...coOptions, food: !coOptions.food})} />
                        <OptionCapsule label="Другое" icon={<Icons.Star />} active={coOptions.other} color="#BF5AF2" onClick={() => setCoOptions({...coOptions, other: !coOptions.other})} />
                     </div>
                </div>

                {/* 5. Payment */}
                <div className="mb-6">
                    <div className="px-3 pb-2.5 text-[13px] text-neutral-400 uppercase font-bold tracking-wider text-center">Оплата</div>
                    <div className="flex gap-3 px-3 justify-center pb-2">
                        <OptionCapsule label="Перевод/СБП" icon={<Icons.CreditCard />} active={coPayment === 'card'} onClick={() => setCoPayment('card')} color="#0A84FF" />
                        <OptionCapsule label="Наличными" icon={<Icons.Wallet />} active={coPayment === 'cash'} onClick={() => setCoPayment('cash')} color="#30D158" />
                    </div>
                </div>

                {/* 6. Price Block */}
                <div className="mt-8 mb-4">
                    <div className="relative rounded-[48px] p-6 text-center overflow-hidden group transition-all" style={{ backgroundColor: '#1C1C1E' }}>
                        <p className="text-[13px] text-[#38bdf8] font-bold uppercase tracking-widest mb-1 relative z-10">Бюджет <span className="text-[#FF3B30]">*</span></p>
                        <p className="text-[15px] text-neutral-500 font-medium mb-4 relative z-10">Желаемая стоимость доставки</p>
                        <div className="relative flex items-center justify-center">
                            <input type="number" value={coPrice} onChange={(e) => setCoPrice(e.target.value)} placeholder="0" className="bg-transparent text-[56px] font-bold text-white text-center w-full focus:outline-none placeholder-neutral-700 font-mono tracking-tighter z-10 relative" />
                            <span className="text-[32px] text-neutral-700 font-medium absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">₽</span>
                        </div>
                        <div className="flex justify-center mt-6">
                             <div data-no-swipe="true" className="relative w-32 h-10 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none active:scale-95 transition-transform backdrop-blur-xl transform-gpu" style={{ backgroundColor: '#BF5AF233', boxShadow: '0 0 20px #BF5AF233, inset 0 1px 0 0 rgba(255,255,255,0.2)' }} onTouchStart={handleScrubStart} onTouchMove={handleScrubMove} onTouchEnd={handleScrubEnd} onMouseDown={handleScrubStart} onMouseMove={handleScrubMove} onMouseUp={handleScrubEnd} onMouseLeave={handleScrubEnd}>
                                 <div className="absolute left-3 text-neutral-500 text-[10px] opacity-50"><Icons.ChevronLeft /></div>
                                 <div className="flex gap-1 opacity-40"><div className="w-[1.5px] h-3 bg-white rounded-full"></div><div className="w-[1.5px] h-4 bg-white rounded-full"></div><div className="w-[1.5px] h-3 bg-white rounded-full"></div></div>
                                 <div className="absolute right-3 text-neutral-500 text-[10px] opacity-50"><Icons.ChevronRight /></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Floating Action Button */}
        <div className="absolute left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50">
            <ActionSlider label={initialData && (initialData as any).id ? "Сохранить изменения" : "Опубликовать заказ"} icon={initialData && (initialData as any).id ? <Icons.Check /> : <IosArrowRight />} mainColor="#0A84FF" onConfirm={handlePublish} className="w-full !rounded-full" />
        </div>
      </div>
    </SwipeableWrapper>
  );
};
