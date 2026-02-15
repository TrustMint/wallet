
import React from 'react';
import { Order, OrderStatus } from '../../../types';
import { Icons } from '../../../constants';
import { OrderCardLayout } from '../../shared/OrderCardLayout';
import { useModal } from '../../../hooks/useModal';
import { GlassButton } from '../../../components/GlassCard';

interface SenderOrderCardProps {
  order: Order;
  onClick: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const SenderOrderCard: React.FC<SenderOrderCardProps> = ({ order, onClick, onAccept, onDecline }) => {
  const { showModal, hideModal } = useModal();
  const isNegotiating = order.status === OrderStatus.NEGOTIATING;

  // Logic to display the counter offer price if negotiating
  const latestOffer = isNegotiating && order.counterOffers.length > 0 
    ? order.counterOffers[order.counterOffers.length - 1] 
    : null;

  const displayPrice = latestOffer ? latestOffer.proposedPrice : order.price;

  // Logic for Status Badge
  const getStatusBadgeConfig = (status: OrderStatus) => {
      switch (status) {
          case OrderStatus.COMPLETED: 
              return { label: 'Выполнен', color: '#30D158' };
          case OrderStatus.CANCELLED: 
              return { label: 'Отменен', color: '#FF3B30' };
          case OrderStatus.ACCEPTED:
          case OrderStatus.PICKED_UP:
          case OrderStatus.DELIVERING:
              return { label: 'В процессе', color: '#0A84FF' };
          case OrderStatus.PENDING:
              return { label: 'Поиск', color: '#FF9F0A' };
          case OrderStatus.NEGOTIATING:
              return { label: 'Торг', color: '#BF5AF2' };
          default: 
              return null;
      }
  };

  const statusConfig = getStatusBadgeConfig(order.status);

  const statusBadge = statusConfig ? (
       <div 
            className="px-2.5 py-[3px] rounded-full border text-[11px] font-bold flex items-center justify-center shadow-sm backdrop-blur-md"
            style={{
                backgroundColor: `${statusConfig.color}22`,
                borderColor: `${statusConfig.color}33`,
                color: statusConfig.color
            }}
       >
            {statusConfig.label}
       </div>
  ) : null;

  // --- CONFIRMATION HANDLERS ---

  const handleAcceptClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      showModal(
          <div className="p-6 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#30D158]/10 flex items-center justify-center mx-auto mb-4 text-[#30D158] border border-[#30D158]/20 shadow-[0_0_20px_rgba(48,209,88,0.15)]">
                  <Icons.Check />
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2 tracking-tight">Принять предложение?</h3>
              <p className="text-[15px] text-neutral-400 mb-8 leading-relaxed">
                  Стоимость доставки составит <span className="text-white font-bold">{displayPrice} ₽</span>. Курьер будет назначен сразу после подтверждения.
              </p>
              <div className="space-y-3">
                  <GlassButton 
                      variant="success" 
                      onClick={() => { 
                          if (onAccept) onAccept(); 
                          hideModal(); 
                      }} 
                      className="!rounded-full h-[56px] shadow-[0_0_20px_rgba(48,209,88,0.3)]"
                  >
                      Подтвердить
                  </GlassButton>
                  <button 
                      onClick={hideModal} 
                      className="w-full py-3 text-[15px] text-neutral-500 font-medium hover:text-white transition-colors active:scale-95"
                  >
                      Отмена
                  </button>
              </div>
          </div>
      );
  };

  const handleDeclineClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      showModal(
          <div className="p-6 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4 text-[#FF3B30] border border-[#FF3B30]/20 shadow-[0_0_20px_rgba(255,59,48,0.15)]">
                  <Icons.X />
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2 tracking-tight">Отклонить?</h3>
              <p className="text-[15px] text-neutral-400 mb-8 leading-relaxed">
                  Вы сможете дождаться других предложений от курьеров или изменить параметры заказа.
              </p>
              <div className="space-y-3">
                  <GlassButton 
                      variant="danger" 
                      onClick={() => { 
                          if (onDecline) onDecline(); 
                          hideModal(); 
                      }} 
                      className="!rounded-full h-[56px] shadow-[0_0_20px_rgba(255,59,48,0.3)]"
                  >
                      Отклонить
                  </GlassButton>
                  <button 
                      onClick={hideModal} 
                      className="w-full py-3 text-[15px] text-neutral-500 font-medium hover:text-white transition-colors active:scale-95"
                  >
                      Отмена
                  </button>
              </div>
          </div>
      );
  };

  const actionButtons = (isNegotiating && onAccept && onDecline) ? (
      <>
          {/* Accept Button - Fully Rounded Pill */}
          <button 
              onClick={handleAcceptClick}
              className="flex-1 py-3 px-4 rounded-full bg-[#30D158]/20 border border-[#30D158]/30 flex items-center justify-center gap-2 text-white active:scale-95 transition-all shadow-[0_0_15px_rgba(48,209,88,0.15)] hover:bg-[#30D158]/30"
          >
              <div className="text-[#30D158]"><Icons.Check /></div>
              <span className="text-[14px] font-bold">Принять {displayPrice} ₽</span>
          </button>
          
          {/* Decline Button - Fully Rounded Circle */}
          <button 
              onClick={handleDeclineClick}
              className="w-[50px] h-[50px] rounded-full bg-[#FF3B30]/20 border border-[#FF3B30]/30 flex items-center justify-center text-[#FF3B30] active:scale-95 transition-all shadow-[0_0_15px_rgba(255,59,48,0.15)] hover:bg-[#FF3B30]/30 shrink-0"
          >
              <Icons.X />
          </button>
      </>
  ) : null;

  return (
    <OrderCardLayout
        order={order}
        onClick={onClick}
        displayPrice={displayPrice}
        statusBadge={statusBadge}
        actionButtons={actionButtons}
        isNegotiating={isNegotiating}
    />
  );
};
