
import React, { useMemo } from 'react';
import { User, Order, OrderStatus } from '../../../types';
import { Icons } from '../../../constants';
import { SenderOrderCard } from '../components/SenderOrderCard';

interface SenderDashboardProps {
  user: User;
  orders: Order[];
  onOrderClick: (id: string) => void;
  onViewAll: () => void;
  onWalletClick: () => void;
  onCreateOrder: () => void;
  onAcceptOffer?: (orderId: string) => void;
  onRejectOffer?: (orderId: string) => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({ 
    user, 
    orders, 
    onOrderClick, 
    onViewAll, 
    onWalletClick, 
    onCreateOrder,
    onAcceptOffer,
    onRejectOffer
}) => {
  
  const negotiatingOrders = useMemo(() => {
    return orders.filter(o => o.status === OrderStatus.NEGOTIATING && o.senderId === user.id);
  }, [orders, user.id]);

  const activeOrders = useMemo(() => {
      return orders.filter(o => 
          o.senderId === user.id && 
          [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.DELIVERING].includes(o.status)
      );
  }, [orders, user.id]);

  const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pt-4 pb-2 px-1 pointer-events-none">
      {children}
    </div>
  );

  return (
    <div 
        className="view-scroll-container w-full h-full overflow-y-auto scrolling-touch px-3"
        style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
    >
        <div className="space-y-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
            
            <SectionHeader>Отправить</SectionHeader>

            <button 
                onClick={onCreateOrder}
                className="w-full relative group overflow-hidden rounded-[28px] p-6 text-left transition-transform active:scale-[0.98] shadow-2xl"
                style={{
                     backgroundColor: '#007AFF59',
                     boxShadow: '0 0 40px #007AFF4D',
                     backdropFilter: 'blur(20px)',
                     WebkitBackdropFilter: 'blur(20px)'
                }}
            >
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-[22px] font-bold text-white mb-1 tracking-tight">Новый заказ</h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        <Icons.Plus />
                    </div>
                </div>
            </button>

            {/* NEGOTIATING ORDERS (Offers) - Moved to top */}
            {negotiatingOrders.length > 0 && (
                <div className="animate-fade-in">
                    <SectionHeader>Предложения</SectionHeader>
                    <div className="space-y-4">
                        {negotiatingOrders.map(order => (
                            <SenderOrderCard 
                                key={order.id} 
                                order={order} 
                                onClick={() => onOrderClick(order.id)} 
                                onAccept={onAcceptOffer ? () => onAcceptOffer(order.id) : undefined}
                                onDecline={onRejectOffer ? () => onRejectOffer(order.id) : undefined}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIVE ORDERS SECTION */}
            {activeOrders.length > 0 && (
                <div className="animate-fade-in">
                    <SectionHeader>В процессе</SectionHeader>
                    <div className="space-y-4">
                        {activeOrders.map(order => (
                            <SenderOrderCard 
                                key={order.id} 
                                order={order} 
                                onClick={() => onOrderClick(order.id)} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {activeOrders.length === 0 && negotiatingOrders.length === 0 && (
                 <div className="px-1 pt-6 pb-20">
                     <div className="p-4 rounded-[20px] bg-[#1C1C1E] flex gap-4 items-start">
                         <div className="text-neutral-500 mt-0.5"><Icons.Info /></div>
                         <p className="text-[14px] text-neutral-500 leading-relaxed font-medium">
                             Здесь появятся ваши активные заказы и предложения от курьеров.
                         </p>
                     </div>
                 </div>
            )}
        </div>
    </div>
  );
};
