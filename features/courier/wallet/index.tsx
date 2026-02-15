
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, Order, OrderStatus, UserRole } from '../../../types';
import { Icons } from '../../../constants';
import { GlassCard, GlassButton } from '../../../components/GlassCard';

interface CourierWalletProps {
  user: User;
  orders: Order[];
  onOrderClick: (id: string) => void;
  onPayCommission: () => void;
}

const DEBT_LIMIT = 5000;

// Reusing the "Ultra-Glass" container style from Profile for consistency
// Updated to match ProfileBlock: #1C1C1E background, no border
const WalletBlock: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div 
        onClick={onClick}
        className={`relative rounded-[24px] bg-[#1C1C1E] overflow-hidden ${className} ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''}`}
    >
        {children}
    </div>
);

type PeriodFilter = 'all' | 'week' | 'month';

export const CourierWallet: React.FC<CourierWalletProps> = ({ user, orders, onOrderClick, onPayCommission }) => {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  // Helper to handle closing animation
  const handleCloseFilters = useCallback(() => {
      setIsClosing(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
          setShowFilters(false);
          setIsClosing(false);
      }, 950);
  }, []);

  const handleOpenFilters = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setShowFilters(true);
      setIsClosing(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
      return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
  }, []);

  // Close filters on scroll
  useEffect(() => {
    if (!showFilters || isClosing) return;

    const handleScroll = () => {
        handleCloseFilters();
    };

    const container = scrollRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
        if (container) {
            container.removeEventListener('scroll', handleScroll);
        }
    };
  }, [showFilters, isClosing, handleCloseFilters]);

  // Device Orientation Logic for Privacy Mode
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      if (beta !== null) {
        if (Math.abs(beta) > 135) {
          setIsBalanceHidden(true);
        } else {
          setIsBalanceHidden(false);
        }
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  const completedOrders = useMemo(() => {
    let result = orders
        .filter(o => o.status === OrderStatus.COMPLETED && o.courierId === user.id)
        .sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));

    const now = Date.now();
    if (periodFilter === 'week') {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        result = result.filter(o => (now - (o.completedAt || o.createdAt)) < weekMs);
    } else if (periodFilter === 'month') {
        const monthMs = 30 * 24 * 60 * 60 * 1000;
        result = result.filter(o => (now - (o.completedAt || o.createdAt)) < monthMs);
    }
    
    return result;
  }, [orders, periodFilter, user.id]);

  const totalEarned = user.walletBalance;
  const debt = user.commissionDebt || 0;
  
  const isBlocked = debt >= DEBT_LIMIT;
  const debtPercentage = Math.min((debt / DEBT_LIMIT) * 100, 100);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}, ${hours}:${minutes}`;
  };

  const hasActiveFilters = periodFilter !== 'all';

   // iOS Context Menu Item Component
  const MenuItem = ({ 
      label, 
      icon, 
      active, 
      onClick, 
      isLast, 
      separator
  }: { 
      label?: string, 
      icon?: React.ReactNode, 
      active?: boolean, 
      onClick?: () => void, 
      isLast?: boolean,
      separator?: boolean
  }) => {
      if (separator) {
          return <div className="h-[0.5px] bg-white/10 mx-10 my-1"></div>;
      }

      return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center px-4 py-3 bg-transparent active:bg-white/10 transition-colors`}
        >
            <div className={`w-5 flex items-center justify-center mr-3 ${active ? 'text-white' : 'opacity-0'}`}>
                <Icons.CheckLight />
            </div>
            <div className={`text-[20px] mr-3 ${active ? 'text-white' : 'text-neutral-500'}`}>
                {icon}
            </div>
            <span className={`text-[15px] font-medium flex-1 text-left ${active ? 'text-white' : 'text-neutral-200'}`}>
                {label}
            </span>
        </button>
      );
  };

  // UPDATED GLASS STYLE TO MATCH MODAL
  const glassStyle = {
      backgroundColor: 'rgba(20, 20, 20, 0.4)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
      border: '0.5px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
  };

  return (
    <div 
        ref={scrollRef} 
        className="view-scroll-container w-full h-full overflow-y-auto scrolling-touch px-3 relative"
        style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
    >
        
        {/* HEADER WITH FLOATING FILTER BUTTON */}
        <div 
          className={`fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-300 ${showFilters && !isClosing ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="absolute top-0 right-0 pt-[calc(env(safe-area-inset-top)+12px)] pr-3 pointer-events-auto">
                    <button
                        onClick={handleOpenFilters}
                        className="pointer-events-auto rounded-full flex items-center justify-center text-white transition-transform relative active:scale-90 duration-200"
                        style={{ 
                            width: 44,
                            height: 44,
                            ...glassStyle,
                            borderRadius: '50%' // Force circle for button
                        }}
                    >
                        <div className="relative z-10">
                            {hasActiveFilters ? (
                                <div className="w-[32px] h-[32px] rounded-full bg-[#0A84FF] flex items-center justify-center text-black shadow-md">
                                    <div className="scale-75"><Icons.SortLines /></div>
                                </div>
                            ) : (
                                <div className="text-white opacity-90">
                                    <Icons.SortLines />
                                </div>
                            )}
                        </div>
                    </button>
            </div>
        </div>

        {/* FILTER DROPDOWN MENU */}
        {showFilters && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={handleCloseFilters}></div>
            <div 
                className={`fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 w-[250px] rounded-[35px] z-50 overflow-hidden flex flex-col origin-top-right ${isClosing ? 'animate-liquid-close' : 'animate-liquid-open'}`}
                style={{
                    ...glassStyle,
                    willChange: 'backdrop-filter, transform',
                    transform: 'translateZ(0)'
                }}
            >
                <MenuItem 
                    label="За все время" 
                    icon={<Icons.History />} 
                    active={periodFilter === 'all'} 
                    onClick={() => { setPeriodFilter('all'); handleCloseFilters(); }} 
                />
                <MenuItem 
                    label="За месяц" 
                    icon={<Icons.Calendar />} 
                    active={periodFilter === 'month'} 
                    onClick={() => { setPeriodFilter('month'); handleCloseFilters(); }} 
                />
                <MenuItem 
                    label="За неделю" 
                    icon={<Icons.Clock />} 
                    active={periodFilter === 'week'} 
                    onClick={() => { setPeriodFilter('week'); handleCloseFilters(); }} 
                />

                {hasActiveFilters && (
                     <>
                     <MenuItem separator />
                     <div className="p-2">
                        <button 
                            onClick={() => { setPeriodFilter('all'); handleCloseFilters(); }}
                            className="w-full py-3 rounded-full bg-white/10 text-[14px] font-medium text-white active:bg-white/20 transition-colors"
                        >
                            Сбросить
                        </button>
                     </div>
                     </>
                )}
            </div>
          </>
      )}

        <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
            {/* HEADER */}
            <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pt-4 pb-2 px-1 pointer-events-none flex justify-between items-center">
                <span>Финансы</span>
            </div>

            {/* BALANCE CARD */}
            <WalletBlock className="p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] mb-4">
                <div className="relative z-10 text-center w-full">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 border border-white/5">
                            <Icons.Wallet />
                        </div>
                        <span className="text-[15px] font-medium text-neutral-400">Общий заработок</span>
                    </div>
                    
                    {isBalanceHidden ? (
                      <div className="h-[48px] flex items-center justify-center gap-3 animate-pulse my-1">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <h1 className="text-[48px] font-bold text-white tracking-tight leading-none mb-1 transition-all duration-300">
                        {totalEarned.toLocaleString()} ₽
                      </h1>
                    )}
                </div>
            </WalletBlock>

            {/* COMMISSION CARD */}
            {user.role === UserRole.COURIER && (
                <WalletBlock className={`p-5 mb-6 relative overflow-hidden transition-colors duration-300 ${isBlocked ? 'border border-[#FF3B30]/30 shadow-[0_0_20px_rgba(255,59,48,0.1)]' : ''}`}>
                    <div className="flex justify-between items-end mb-4 relative z-10">
                        <div>
                            <p className="text-[13px] text-neutral-400 font-semibold uppercase mb-1">Комиссия сервиса</p>
                            <div className="flex items-baseline gap-2">
                                <p className={`text-[28px] font-bold tracking-tight leading-none ${isBlocked ? 'text-[#FF3B30]' : 'text-white'}`}>
                                    {debt.toLocaleString()} ₽
                                </p>
                                <span className="text-[15px] text-neutral-500 font-medium">/ {DEBT_LIMIT.toLocaleString()} ₽</span>
                            </div>
                        </div>
                        {debt > 0 && (
                            <button 
                                onClick={onPayCommission}
                                className={`text-[13px] font-bold px-5 py-2.5 rounded-full border active:scale-95 transition-all shadow-lg ${
                                    isBlocked 
                                    ? 'bg-[#FF3B30] text-white border-[#FF3B30] shadow-[0_0_15px_rgba(255,59,48,0.4)] animate-pulse' 
                                    : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                }`}
                            >
                                Оплатить
                            </button>
                        )}
                    </div>
                    
                    <div className="h-2 w-full bg-[#1C1C1E]/50 border border-white/5 rounded-full overflow-hidden relative z-10">
                        <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isBlocked ? 'bg-[#FF3B30]' : 'bg-[#0A84FF]'}`}
                            style={{ width: `${debtPercentage}%` }}
                        ></div>
                    </div>
                    
                    {isBlocked ? (
                        <div className="mt-3 flex items-start gap-2 bg-[#FF3B30]/10 p-3 rounded-xl border border-[#FF3B30]/20">
                            <div className="text-[#FF3B30] mt-0.5"><Icons.Shield /></div>
                            <p className="text-[13px] text-neutral-500 font-bold leading-snug">
                                Лимит превышен. Доступ к заказам приостановлен до погашения долга.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-3 flex items-start gap-2 p-2 rounded-xl">
                            <div className="text-neutral-500 mt-0.5"><Icons.Info /></div>
                            <p className="text-[13px] text-neutral-500 font-medium leading-snug">
                            Оплата комиссии потребуется только при достижении лимита в {DEBT_LIMIT.toLocaleString()} ₽.
                            </p>
                        </div>
                    )}
                </WalletBlock>
            )}

            {/* TRANSACTIONS LIST */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider">История операций</h3>
                    {hasActiveFilters && <span className="text-[11px] text-[#0A84FF] bg-[#0A84FF]/10 px-2 py-0.5 rounded-full">Фильтр</span>}
                </div>
                
                <div className="space-y-3">
                {completedOrders.length === 0 ? (
                    <div className="py-12 text-center text-neutral-600 text-[15px] font-medium">
                        {hasActiveFilters ? 'По фильтрам ничего не найдено' : 'История пуста'}
                    </div>
                ) : (
                    completedOrders.map(order => (
                        <WalletBlock 
                            key={order.id} 
                            onClick={() => onOrderClick(order.id)}
                            className="flex justify-between items-center py-4 px-5 cursor-pointer"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-full bg-[#30D158]/10 text-[#30D158] flex items-center justify-center border border-[#30D158]/20 shadow-[0_0_10px_rgba(48,209,88,0.15)]">
                                    <Icons.Check />
                                </div>
                                <div>
                                    <p className="text-[16px] font-bold text-white leading-tight mb-0.5 line-clamp-1 pr-2">{order.title}</p>
                                    <p className="text-[13px] text-neutral-500 font-medium">{formatDate(order.completedAt || order.createdAt)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[#30D158] font-bold text-[16px] whitespace-nowrap block">+{order.price} ₽</span>
                                <span className="text-[11px] text-neutral-600 font-medium block mt-0.5">-{Math.floor(order.price * 0.1)} ₽ ком.</span>
                            </div>
                        </WalletBlock>
                    ))
                )}
                </div>
            </div>
        </div>
    </div>
  );
};
