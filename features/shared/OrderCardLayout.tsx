
import React from 'react';
import { Order } from '../../types';
import { Icons, ORDER_OPTIONS_CONFIG } from '../../constants';

interface OrderCardLayoutProps {
  order: Order;
  onClick: () => void;
  displayPrice: number | string;
  statusBadge?: React.ReactNode;
  actionButtons?: React.ReactNode;
  isNegotiating?: boolean;
  distance?: string; 
}

export const OrderCardLayout: React.FC<OrderCardLayoutProps> = ({ 
    order, 
    onClick, 
    displayPrice, 
    statusBadge, 
    actionButtons,
    isNegotiating,
    distance
}) => {

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    // Format: 14:30
    const timeStr = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();

    if (isToday) {
        return timeStr;
    }

    // Format: 15.10 14:30
    const dateStr = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
    });

    return `${dateStr} ${timeStr}`;
  };

  let mainColor = '#FFFFFF';
  if (isNegotiating) mainColor = '#FF9F0A';
  else if (typeof displayPrice === 'number' && displayPrice > 1000) mainColor = '#30D158';

  const priceBadgeStyle = {
      backgroundColor: `${mainColor}33`,
      // Internal shadow to prevent bleeding
      boxShadow: `inset 0 0 10px ${mainColor}20`, 
      color: mainColor === '#FFFFFF' ? 'white' : mainColor,
  };

  const getWeightBadge = (weightStr: string) => {
      if (weightStr.includes('1 кг')) return { label: 'S', color: '#30D158' };
      if (weightStr.includes('5 кг')) return { label: 'M', color: '#0A84FF' };
      if (weightStr.includes('20 кг')) return { label: 'L', color: '#FF9F0A' };
      return { label: 'XL', color: '#FF375F' };
  };

  const badgeConfig = getWeightBadge(order.weight);
  
  // Use Centralized Config
  const activeOptions = (order.options || [])
    .map(opt => ORDER_OPTIONS_CONFIG[opt])
    .filter(Boolean);

  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer active:scale-[0.98] transition-transform duration-300 rounded-[24px] bg-[#1C1C1E] overflow-hidden`}
    >
      <div className="relative p-5 z-10">
          <div className="flex justify-between items-start mb-3">
             <div className="flex-1 pr-4 min-w-0">
                <h3 className="text-[18px] font-bold text-white leading-tight mb-1.5 truncate tracking-tight">{order.title}</h3>
                
                <div className="flex items-center gap-2.5 flex-wrap">
                   {statusBadge}

                   <div 
                        className="px-2.5 py-[3px] rounded-full border text-[11px] font-bold flex items-center justify-center shadow-sm backdrop-blur-md min-w-[28px]"
                        style={{
                            backgroundColor: `${badgeConfig.color}22`,
                            borderColor: `${badgeConfig.color}33`,
                            color: badgeConfig.color
                        }}
                   >
                        {badgeConfig.label}
                   </div>

                   {distance && (
                       <div className="flex items-center gap-1 bg-white/10 px-2 py-[3px] rounded-full">
                           <div className="text-[10px] text-white/70"><Icons.Navigation /></div>
                           <span className="text-[11px] font-bold text-white">{distance} км</span>
                       </div>
                   )}

                   <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium whitespace-nowrap flex-shrink-0">
                       <span className="opacity-40">•</span>
                       <div className="flex items-center gap-0.5">
                           <div className="scale-[0.6]"><Icons.Clock /></div>
                           <span className="relative top-[0.5px]">{formatTime(order.createdAt)}</span>
                       </div>
                   </div>
                </div>
             </div>
             
             <div className="flex flex-col items-end">
                 <div 
                    style={priceBadgeStyle}
                    className="px-4 py-2 rounded-full backdrop-blur-xl transition-all flex flex-col items-end flex-shrink-0 relative overflow-hidden mb-1"
                 >
                    <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'}}></div>
                    <div className="absolute inset-0 rounded-full pointer-events-none z-0" style={{boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)', maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)', WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'}}></div>

                    <span className="font-bold text-[16px] whitespace-nowrap tracking-tight relative z-10">{displayPrice} ₽</span>
                 </div>
             </div>
          </div>
          
          <div className="flex gap-4 items-stretch px-1 relative">
             <div className="flex flex-col items-center pt-2 min-h-[50px]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] shadow-[0_0_10px_rgba(10,132,255,0.6)] z-10"></div>
                <div className="w-[1px] flex-1 bg-gradient-to-b from-[#0A84FF] to-[#30D158] my-1.5 opacity-40"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#30D158] border border-black/60 shadow-[0_0_10px_rgba(48,209,88,0.4)] z-10"></div>
             </div>
             <div className="flex-1 flex flex-col justify-between gap-4 py-0.5 min-w-0">
                <div className="text-[15px] text-neutral-300 leading-snug font-medium line-clamp-1 overflow-hidden text-ellipsis">{order.pickupAddress}</div>
                <div className="text-[15px] text-neutral-300 leading-snug font-medium line-clamp-1 overflow-hidden text-ellipsis">{order.deliveryAddress}</div>
             </div>
          </div>

          {activeOptions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 w-full">
                {activeOptions.map((opt, idx) => (
                    <div 
                        key={idx}
                        className="h-5 px-2 rounded-full border text-[8px] font-bold flex items-center justify-center shadow-sm backdrop-blur-md"
                        style={{ backgroundColor: `${opt.color}22`, borderColor: `${opt.color}33`, color: opt.color }}
                    >
                        <span className="uppercase tracking-wide">{opt.label}</span>
                    </div>
                ))}
            </div>
          )}
          
          <div className="absolute right-4 bottom-1/2 translate-y-1/2 opacity-20 text-white pointer-events-none">
             <Icons.ChevronRight />
          </div>

          {actionButtons && (
              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 animate-fade-in relative z-20">
                  {actionButtons}
              </div>
          )}
      </div>
    </div>
  );
};
