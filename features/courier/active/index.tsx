
import React from 'react';
import { Order } from '../../../types';
import { Icons } from '../../../constants';
import { OrderCard } from '../../shared/OrderCard';
import { SwipeableWrapper } from '../../../components/SwipeableWrapper';
import { LiquidIconButton } from '../../../components/GlassCard';
import { FloatingBackButton } from '../../../components/FloatingBackButton';

interface ActiveOrdersListProps {
  orders: Order[];
  onOrderClick: (id: string) => void;
  onClose: () => void;
  zIndex?: number;
  backgroundSelector?: string;
}

export const ActiveOrdersList: React.FC<ActiveOrdersListProps> = ({ orders, onOrderClick, onClose, zIndex = 150, backgroundSelector }) => {
  return (
    <SwipeableWrapper onDismiss={onClose} zIndex={zIndex} id="view-active-orders" backgroundSelector={backgroundSelector}>
      {/* FIXED CLOSE BUTTON (MOVED OUTSIDE SCROLL VIEW) */}
      <FloatingBackButton onClick={onClose} />

      <div 
        className="flex-1 overflow-y-auto scrolling-touch relative h-full"
        style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
      >
        
        <div 
            className="px-3"
            style={{ 
                paddingTop: 'calc(env(safe-area-inset-top) + 60px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)'
            }}
        >
            <h1 className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pb-4 px-1">Активные</h1>
            <div className="space-y-4">
              {orders.length > 0 ? (
                // Added displayPrice={order.price}
                orders.map(order => <OrderCard key={order.id} order={order} displayPrice={order.price} onClick={() => onOrderClick(order.id)} />)
              ) : (
                <div className="text-center py-16 text-neutral-600">
                  <p>Нет активных заказов</p>
                </div>
              )}
            </div>
        </div>
      </div>
    </SwipeableWrapper>
  );
};
