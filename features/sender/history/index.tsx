
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '../../../types';
import { SenderOrderCard } from '../components/SenderOrderCard';
import { Icons } from '../../../constants';

interface SenderHistoryProps {
  orders: Order[];
  onOrderClick: (id: string) => void;
}

type PeriodFilter = 'all' | 'week' | 'month';
type StatusFilter = 'all' | 'completed' | 'cancelled';

export const SenderHistory: React.FC<SenderHistoryProps> = ({ orders, onOrderClick }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);
  
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

  useEffect(() => {
      return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
  }, []);

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

  const filteredOrders = useMemo(() => {
    // Strictly filter base result to only Completed or Cancelled orders
    let result = orders.filter(o => 
        [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status)
    );

    if (statusFilter !== 'all') {
        result = result.filter(o => {
            if (statusFilter === 'completed') return o.status === OrderStatus.COMPLETED;
            if (statusFilter === 'cancelled') return o.status === OrderStatus.CANCELLED;
            return true;
        });
    }

    const now = Date.now();
    if (periodFilter === 'week') {
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        result = result.filter(o => (now - o.createdAt) < weekMs);
    } else if (periodFilter === 'month') {
        const monthMs = 30 * 24 * 60 * 60 * 1000;
        result = result.filter(o => (now - o.createdAt) < monthMs);
    }

    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  }, [orders, periodFilter, statusFilter]);

  const hasActiveFilters = periodFilter !== 'all' || statusFilter !== 'all';

  const MenuItem = ({ label, icon, active, onClick, separator }: any) => {
      if (separator) return <div className="h-[0.5px] bg-white/10 mx-4 my-1"></div>;
      return (
        <button onClick={onClick} className={`w-full flex items-center px-5 py-3.5 bg-transparent active:bg-white/10 transition-colors`}>
            <div className={`w-5 flex items-center justify-center mr-3 ${active ? 'text-white' : 'opacity-0'}`}><Icons.CheckLight /></div>
            <div className={`text-[20px] mr-3 ${active ? 'text-white' : 'text-neutral-500'}`}>{icon}</div>
            <span className={`text-[15px] font-medium flex-1 text-left ${active ? 'text-white' : 'text-neutral-300'}`}>{label}</span>
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
                        {/* Glare removed to strictly follow the requested style which is cleaner */}
                        <div className="relative z-10">
                            {hasActiveFilters ? (
                                <div className="w-[32px] h-[32px] rounded-full bg-[#0A84FF] flex items-center justify-center text-black shadow-md"><div className="scale-75"><Icons.SortLines /></div></div>
                            ) : (<div className="text-white opacity-90"><Icons.SortLines /></div>)}
                        </div>
                    </button>
            </div>
      </div>

      {showFilters && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={handleCloseFilters}></div>
            <div 
                className={`fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 w-[260px] rounded-[35px] z-50 overflow-hidden flex flex-col origin-top-right ${isClosing ? 'animate-liquid-close' : 'animate-liquid-open'}`}
                style={{
                    ...glassStyle,
                    willChange: 'backdrop-filter, transform',
                    transform: 'translateZ(0)'
                }}
            >
                <div className="py-2">
                    <MenuItem label="За все время" icon={<Icons.History />} active={periodFilter === 'all'} onClick={() => { setPeriodFilter('all'); handleCloseFilters(); }} />
                    <MenuItem label="За месяц" icon={<Icons.Calendar />} active={periodFilter === 'month'} onClick={() => { setPeriodFilter('month'); handleCloseFilters(); }} />
                    <MenuItem label="За неделю" icon={<Icons.Clock />} active={periodFilter === 'week'} onClick={() => { setPeriodFilter('week'); handleCloseFilters(); }} />
                    <MenuItem separator />
                    <MenuItem label="Все завершенные" icon={<Icons.List />} active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); handleCloseFilters(); }} />
                    <MenuItem label="Выполненные" icon={<Icons.Check />} active={statusFilter === 'completed'} onClick={() => { setStatusFilter('completed'); handleCloseFilters(); }} />
                    <MenuItem label="Отмененные" icon={<Icons.X />} active={statusFilter === 'cancelled'} onClick={() => { setStatusFilter('cancelled'); handleCloseFilters(); }} />
                    {hasActiveFilters && (
                        <>
                        <MenuItem separator />
                        <div className="p-3"><button onClick={() => { setPeriodFilter('all'); setStatusFilter('all'); handleCloseFilters(); }} className="w-full py-3 rounded-full bg-white/10 text-[14px] font-medium text-white active:bg-white/20 transition-colors">Сбросить</button></div>
                        </>
                    )}
                </div>
            </div>
          </>
      )}

      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
        <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pt-4 pb-2 px-1 pointer-events-none flex justify-between items-center">
          <span>История отправлений</span>
        </div>
        <div className="space-y-4 pb-20">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <SenderOrderCard 
                key={order.id} 
                order={order} 
                onClick={() => onOrderClick(order.id)} 
              />
            ))
          ) : (
            <div className="px-1">
                <div className="p-8 rounded-[24px] bg-[#1C1C1E] flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-neutral-600">
                        <Icons.History />
                    </div>
                    <p className="text-[16px] font-bold text-white mb-1">История пуста</p>
                    <p className="text-[14px] text-neutral-500">Здесь будут отображаться ваши завершенные и отмененные заказы.</p>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
