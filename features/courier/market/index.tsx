
import React, { useState, useMemo } from 'react';
import { Order, User, UserRole } from '../../../types';
import { Icons } from '../../../constants';
import { CourierOrderCard } from '../components/CourierOrderCard';
import { GlassCard, LiquidIconButton } from '../../../components/GlassCard';

// --- UTILS ---

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

// --- ANIMATION & STYLE HELPERS ---

const getActiveStyle = (color: string, active: boolean) => {
    if (!active) return {};
    return {
        backgroundColor: `${color}33`, 
    };
};

const useSlowBounce = (onClick: () => void) => {
    const [isBouncing, setIsBouncing] = useState(false);
    
    const trigger = () => {
        setIsBouncing(true);
        onClick();
        setTimeout(() => setIsBouncing(false), 250);
    };
    
    return { isBouncing, trigger };
};

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, color }) => {
  const { isBouncing, trigger } = useSlowBounce(onClick);

  return (
    <button
      onClick={trigger}
      style={getActiveStyle(color, active)}
      className={`relative h-10 px-5 rounded-full text-[14px] font-bold transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center gap-2 whitespace-nowrap backdrop-blur-xl transform-gpu overflow-hidden ${
        isBouncing 
          ? 'scale-[0.7]' 
          : (active ? 'scale-[1.02] text-white' : 'bg-white/5 text-neutral-400 scale-100')
      }`}
    >
      {active && (
        <>
          <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
          <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'}}></div>
          <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'}}></div>
        </>
      )}
      <span style={{ color: active ? color : undefined }} className="transition-colors duration-300 relative z-10">{label}</span>
    </button>
  );
};

interface CourierMarketProps {
  orders: Order[];
  activeOrdersCount: number;
  onOrderClick: (id: string) => void;
  onShowActiveOrders: () => void;
  courierStatus: 'active' | 'busy' | string;
  toggleCourierStatus: () => void;
  currentUser: User;
}

const DEBT_LIMIT = 5000;
const MAX_SEARCH_RADIUS_KM = 100;

export const CourierMarket: React.FC<CourierMarketProps> = ({ orders, activeOrdersCount, onOrderClick, onShowActiveOrders, courierStatus, toggleCourierStatus, currentUser }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'heavy' | 'high_price' | 'cash' | 'card' | 'docs' | 'thermo'>('all');
  
  const isBlocked = currentUser.role === UserRole.COURIER && currentUser.commissionDebt >= DEBT_LIMIT;
  const isBusy = courierStatus === 'busy';

  const filteredOrders = useMemo(() => {
    if (isBlocked) return [];

    let available = orders.filter(o => !o.courierId);
    available = available.filter(o => (o.counterOffers?.length || 0) < 3);
    
    if (activeFilter === 'urgent') available = available.filter(o => o.options?.includes('urgent'));
    else if (activeFilter === 'heavy') available = available.filter(o => parseFloat(o.weight) > 5);
    else if (activeFilter === 'high_price') available = available.filter(o => o.price >= 1000);
    else if (activeFilter === 'cash') available = available.filter(o => o.paymentMethod === 'cash');
    else if (activeFilter === 'card') available = available.filter(o => o.paymentMethod === 'card');
    else if (activeFilter === 'thermo') available = available.filter(o => o.options?.includes('thermo'));
    else if (activeFilter === 'docs') available = available.filter(o => 
        o.options?.includes('cat_docs') || 
        o.title.toLowerCase().includes('документ') || 
        o.title.toLowerCase().includes('договор')
    );

    const userLat = currentUser.location?.lat;
    const userLng = currentUser.location?.lng;

    if (userLat && userLng) {
        const withDistance = available.map(o => {
            let dist = 9999;
            if (o.pickupLocation) {
                dist = getDistanceFromLatLonInKm(userLat, userLng, o.pickupLocation.lat, o.pickupLocation.lng);
            }
            return { ...o, distanceKm: dist };
        });
        const nearby = withDistance.filter(o => o.distanceKm <= MAX_SEARCH_RADIUS_KM);
        return nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
        return available.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [orders, activeFilter, isBlocked, currentUser.location]);

  const { isBouncing: isStatusBouncing, trigger: triggerStatus } = useSlowBounce(toggleCourierStatus);

  const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pt-4 pb-2 px-1 pointer-events-none">
      {children}
    </div>
  );

  if (isBlocked) {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-black relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[#FF3B30]/5 blur-[100px] rounded-full pointer-events-none"></div>
               <GlassCard className="w-full max-w-sm p-8 !border-[0.5px] border-[#FF3B30]/30 shadow-[0_0_50px_rgba(255,59,48,0.15)] flex flex-col items-center">
                   <div className="w-20 h-20 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mb-6 text-[#FF3B30] border border-[#FF3B30]/20 shadow-[0_0_20px_rgba(255,59,48,0.2)]">
                       <Icons.Shield />
                   </div>
                   <h2 className="text-[24px] font-bold text-white mb-2">Доступ ограничен</h2>
                   <p className="text-[15px] text-neutral-400 leading-relaxed mb-6">Ваш долг по комиссии превысил лимит <span className="text-white font-bold">{DEBT_LIMIT} ₽</span>.<br/>Для продолжения работы необходимо погасить задолженность.</p>
                   <div className="w-full p-4 rounded-xl bg-[#1C1C1E] border border-white/5 mb-2">
                        <p className="text-[13px] text-neutral-500 uppercase font-semibold mb-1">Ваш долг</p>
                        <p className="text-[32px] font-bold text-[#FF3B30]">{currentUser.commissionDebt.toLocaleString()} ₽</p>
                   </div>
                   <p className="text-[12px] text-neutral-600 mt-4">Перейдите в раздел "Финансы" для оплаты</p>
               </GlassCard>
          </div>
      )
  }

  return (
    <>
        <div 
            className="view-scroll-container w-full h-full overflow-y-auto scrolling-touch relative"
            style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
        >
        <div 
            className="px-3 transition-all duration-300 min-h-full relative"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
            {isBusy && (
                <div 
                    className="absolute inset-0 z-40 bg-white/5 backdrop-blur-[5px] transition-all duration-300"
                ></div>
            )}

            {currentUser.role === UserRole.COURIER && (
                <div className="flex justify-center mb-1 relative z-50">
                <button 
                    onClick={triggerStatus}
                    style={getActiveStyle(courierStatus === 'active' ? '#30D158' : '#FF3B30', true)}
                    className={`relative h-10 px-5 rounded-full text-[14px] font-bold flex items-center gap-2 backdrop-blur-xl shadow-lg transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] transform-gpu overflow-hidden ${isStatusBouncing ? 'scale-[0.85]' : 'scale-100'}`}
                >
                    <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'}}></div>
                    <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'}}></div>
                    <div className={`w-2 h-2 rounded-full relative z-10 ${courierStatus === 'active' ? 'bg-[#30D158] shadow-[0_0_8px_#30D158]' : 'bg-[#FF3B30] shadow-[0_0_8px_#FF3B30]'}`}></div>
                    <span className="text-white relative z-10">
                        {courierStatus === 'active' ? 'Активен' : 'Занят'} 
                        {currentUser.city && (
                            <>
                                <span className="opacity-30 mx-1.5 font-normal">|</span>
                                <span className="opacity-90">{currentUser.city}</span>
                            </>
                        )}
                    </span>
                </button>
            </div>
            )}

            <SectionHeader>Доступные заказы</SectionHeader>

            <div className="overflow-x-auto scrolling-touch pb-6 scrollbar-hide -mx-3 px-3">
            <div className="flex gap-2 w-max">
                <FilterChip label="Все" color="#0A84FF" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
                <FilterChip label="Дорогие" color="#30D158" active={activeFilter === 'high_price'} onClick={() => setActiveFilter('high_price')} />
                <FilterChip label="Наличные" color="#FFD60A" active={activeFilter === 'cash'} onClick={() => setActiveFilter('cash')} />
                <FilterChip label="Безнал" color="#BF5AF2" active={activeFilter === 'card'} onClick={() => setActiveFilter('card')} />
                <FilterChip label="Срочно" color="#FF3B30" active={activeFilter === 'urgent'} onClick={() => setActiveFilter('urgent')} />
                <FilterChip label="Тяжелые" color="#FF9F0A" active={activeFilter === 'heavy'} onClick={() => setActiveFilter('heavy')} />
                <FilterChip label="Документы" color="#5E5CE6" active={activeFilter === 'docs'} onClick={() => setActiveFilter('docs')} />
                <FilterChip label="Термосумка" color="#64D2FF" active={activeFilter === 'thermo'} onClick={() => setActiveFilter('thermo')} />
            </div>
            </div>

            <div className="space-y-4">
                {filteredOrders.map(order => (
                    <CourierOrderCard 
                        key={order.id} 
                        order={order} 
                        distance={ (order as any).distanceKm ? (order as any).distanceKm.toFixed(1) : undefined }
                        onClick={() => onOrderClick(order.id)} 
                    />
                ))}
            </div>
            {filteredOrders.length === 0 && (
            <div className="text-center py-16 text-neutral-600">
                <p>Нет доступных заказов поблизости</p>
                {!currentUser.location && <p className="text-[12px] text-neutral-700 mt-2">Включите геолокацию для поиска</p>}
            </div>
            )}
        </div>

        <div 
            className="fixed right-3 z-[60] flex flex-col items-end gap-3 pointer-events-none"
            style={{ bottom: 'calc(110px + env(safe-area-inset-bottom))' }}
        >
            {activeOrdersCount > 0 && (
                <LiquidIconButton 
                    onClick={onShowActiveOrders}
                    icon={<div className="relative z-10 text-neutral-500 scale-110"><Icons.Zap /></div>}
                    badge={activeOrdersCount}
                    animationType="grow"
                />
            )}
        </div>
    </div>
    </>
  );
};
