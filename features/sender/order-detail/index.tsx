
import React, { useState, useEffect } from 'react';
import { Order, User, OrderStatus, Coordinates } from '../../../types';
import { Icons, ORDER_OPTIONS_CONFIG } from '../../../constants';
import { SwipeableWrapper } from '../../../components/SwipeableWrapper';
import { useModal } from '../../../hooks/useModal';
import { SenderReportModal } from '../../../components/modals/SenderReportModal';
import { FloatingBackButton } from '../../../components/FloatingBackButton';
import { LeaveReviewSenderModal } from '../../../components/modals/LeaveReviewSenderModal';
import { getUserProfile, createReview, subscribeToProfile } from '../../../services/api';
import { getUnreadCount } from '../../../services/chatApi'; 
import { supabase } from '../../../lib/supabaseClient';
import { MapComponent } from '../../../components/MapComponent';

// Map Control Icon - Restored to Map Pin
const NavigationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);

const Badge: React.FC<{ icon: any, label: string, colorHex: string }> = ({ icon, label, colorHex }) => (
    <div className="px-2 py-1 rounded-full border text-[9px] font-bold flex items-center gap-1.5 uppercase tracking-wide" style={{ backgroundColor: `${colorHex}22`, borderColor: `${colorHex}33`, color: colorHex }}>
        {label}
    </div>
);

const GlassActionButton: React.FC<{ label: string; icon?: React.ReactNode; onClick: () => void; color: string; flexClass?: string }> = ({ label, icon, onClick, color, flexClass = 'flex-1' }) => {
    return (
        <button 
            type="button" 
            onClick={onClick} 
            style={{ 
                backgroundColor: color, // Fully opaque
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
            }} 
            className={`${flexClass} px-6 rounded-full font-bold text-[17px] text-white flex items-center justify-center gap-2 active:scale-95 transition-transform overflow-hidden relative`}
        >
            <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
            {icon && <span>{icon}</span>}
            {label}
        </button>
    );
};

const ContactButton: React.FC<{ icon: React.ReactNode; onClick: () => void; color: string; disabled?: boolean; badgeCount?: number }> = ({ icon, onClick, color, disabled, badgeCount }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform active:scale-90 relative ${disabled ? 'opacity-40 grayscale cursor-not-allowed pointer-events-none' : ''}`}>
        <div className="absolute inset-0 rounded-full overflow-hidden backdrop-blur-xl" style={{ backgroundColor: `${color}33` }}>
             <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
        </div>
        <div className="relative z-10">{icon}</div>
        {badgeCount !== undefined && badgeCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-black shadow-sm pointer-events-none z-20">
                {badgeCount > 9 ? '9+' : badgeCount}
            </div>
        )}
    </button>
);

const CourierProfileGlass: React.FC<{ courier: User | null, isContactAllowed: boolean, orderId: string, onOpenChat: (id: string) => void }> = ({ courier, isContactAllowed, orderId, onOpenChat }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!isContactAllowed) return;
        const fetchUnread = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) {
                const count = await getUnreadCount(orderId, data.session.user.id);
                setUnreadCount(count);
            }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 3000);
        return () => clearInterval(interval);
    }, [orderId, isContactAllowed]);

    if (!courier) return <div className="p-5 text-center text-neutral-500">Загрузка данных курьера...</div>;

    const handleCall = () => { if (courier.phone) { window.location.href = `tel:${courier.phone}`; } else { alert("Номер курьера скрыт"); } };

    const handleMessage = () => {
        onOpenChat(orderId);
    };

    return (
        <div className="p-4 flex items-center justify-between relative">
             <div className="flex items-center gap-4">
                 <div className="relative">
                     <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg border-2 border-white/10 relative z-10 overflow-hidden"><img src={courier.avatar} alt="Courier" className="w-full h-full object-cover" /></div>
                     <div className="absolute -bottom-1 -right-1 z-20 bg-[#30D158] text-[10px] text-black font-bold px-1.5 py-0.5 rounded-full border border-black shadow-sm">{courier.rating.toFixed(1)}</div>
                 </div>
                 <div><p className="text-[17px] font-bold text-white leading-tight">{courier.name}</p><p className="text-[13px] text-neutral-400 mt-1">Курьер</p></div>
             </div>
             <div className="flex gap-3">
                 <ContactButton icon={<Icons.Phone />} onClick={handleCall} color="#30D158" disabled={!isContactAllowed} />
                 <ContactButton icon={<Icons.Message />} onClick={handleMessage} color="#0A84FF" disabled={!isContactAllowed} badgeCount={unreadCount} />
             </div>
        </div>
    );
};

const SenderOrderStatusTracker: React.FC<{ status: OrderStatus; completedAt?: number }> = ({ status, completedAt }) => {
    const [animationFinished, setAnimationFinished] = useState(() => {
        if (status === OrderStatus.COMPLETED && completedAt) {
            const timeSinceCompletion = Date.now() - completedAt;
            return timeSinceCompletion > 3000; 
        }
        return false;
    });

    useEffect(() => {
        if (status === OrderStatus.COMPLETED && !animationFinished) {
            const timer = setTimeout(() => { setAnimationFinished(true); }, 3000); 
            return () => clearTimeout(timer);
        } else if (status !== OrderStatus.COMPLETED) {
            setAnimationFinished(false);
        }
    }, [status, completedAt, animationFinished]);

    const steps = [
        { id: OrderStatus.ACCEPTED, label: 'Курьер назначен', subLabel: 'Ожидайте прибытия', icon: <Icons.User />, activeColor: '#0A84FF'},
        { id: OrderStatus.PICKED_UP, label: 'Курьер забрал груз', subLabel: 'В пути к получателю', icon: <Icons.Box />, activeColor: '#0A84FF'},
        { id: OrderStatus.COMPLETED, label: 'Груз вручен', subLabel: 'Заказ успешно выполнен', icon: <Icons.Check />, activeColor: '#30D158'},
    ];

    let activeIndex = 0;
    if (status === OrderStatus.PICKED_UP || status === OrderStatus.DELIVERING) activeIndex = 1;
    if (status === OrderStatus.COMPLETED) activeIndex = 2;

    return (
        <div className="py-6 px-4 relative"><div className="space-y-8">{steps.map((step, index) => {
            const isRealCompleted = index < activeIndex;
            const isRealActive = index === activeIndex;
            const isFinished = step.id === OrderStatus.COMPLETED && animationFinished && isRealActive;
            const showAsCompleted = isRealCompleted || isFinished;
            const showAsActive = isRealActive && !isFinished;
            let iconClassName = 'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden';
            let iconStyle = {};
            if (showAsCompleted) { iconStyle = { backgroundColor: '#30D15833', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }; iconClassName += ' text-white'; } else if (showAsActive) { iconStyle = { backgroundColor: `${step.activeColor}99`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }; iconClassName += ' text-white scale-110'; } else { iconClassName += ' bg-white/5 border border-white/10 text-neutral-600'; }
            const liveBadgeStyle = { backgroundColor: '#30D15833', boxShadow: '0 0 15px #30D15833, inset 0 1px 0 0 rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' };
            return (<div key={step.id} className={`flex items-center gap-5 relative group transition-all duration-700 ${index > activeIndex ? 'opacity-40 grayscale' : 'opacity-100'}`}>{index < steps.length - 1 && (<div className={`absolute left-7 top-14 bottom-[-32px] w-[2px] transition-colors duration-500 -z-10 ${index < activeIndex ? 'bg-[#30D158]/50' : 'bg-white/10'}`}></div>)}<div className="relative flex-shrink-0 z-10">{showAsActive && (<div className={`absolute inset-0 rounded-full bg-[${step.activeColor}] opacity-40 animate-ping`}></div>)}<div className={iconClassName} style={iconStyle}>{(showAsActive || showAsCompleted) && <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>}<div className="relative z-10">{showAsCompleted ? <Icons.Check /> : step.icon}</div></div></div><div className={`flex flex-col transition-all duration-500 ${showAsActive ? 'translate-x-0 opacity-100' : 'translate-x-0'}`}><div className="flex items-center gap-2"><span className={`text-[17px] font-bold leading-tight tracking-tight transition-colors ${showAsActive ? 'text-white' : showAsCompleted ? 'text-[#30D158]' : 'text-neutral-500'}`}>{step.label}</span>{showAsActive && (<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full animate-pulse" style={liveBadgeStyle}><div className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_5px_#30D158]"></div><span className="text-[10px] font-bold text-[#30D158] tracking-wider">В ПУТИ</span></div>)}</div><span className={`text-[13px] font-medium mt-1 leading-snug ${showAsActive ? 'text-neutral-300' : 'text-neutral-600'}`}>{step.subLabel}</span></div></div>);
        })}</div></div>
    );
};

// CLEAN INFO ROW - No internal lines
const InfoRow: React.FC<{ 
    label: string; 
    value: React.ReactNode; 
    onClick?: () => void;
    valueClassName?: string;
}> = ({ label, value, onClick, valueClassName = 'text-white' }) => (
    <div 
        onClick={onClick}
        className={`relative flex justify-between items-start py-3 px-4 min-h-[44px] active:bg-[#38383A]/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
        <span className="text-[15px] text-neutral-500 font-medium shrink-0 mr-4 max-w-[40%]">{label}</span>
        <span className={`text-[15px] font-medium ${valueClassName} text-right flex-1 break-words whitespace-pre-wrap leading-snug`}>{value}</span>
    </div>
);

interface SenderOrderDetailProps {
  order: Order;
  onClose: () => void;
  onCancelOrder: (orderId: string) => void;
  onUpdateOrder: (orderId: string, updates: Partial<Order>) => void;
  onEdit: (order: Order) => void;
  onReview: () => void;
  onOpenChat: (orderId: string) => void;
  zIndex?: number;
  backgroundSelector?: string;
}

export const SenderOrderDetail: React.FC<SenderOrderDetailProps> = ({ order, onClose, onCancelOrder, onUpdateOrder, onEdit, onReview, onOpenChat, zIndex = 200, backgroundSelector }) => {
  const { showModal, hideModal } = useModal();
  const [courier, setCourier] = useState<User | null>(null);
  const [courierLocation, setCourierLocation] = useState<Coordinates | undefined>(undefined);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  const [locateTrigger, setLocateTrigger] = useState(false);

  const isSearchPhase = order.status === OrderStatus.PENDING || order.status === OrderStatus.NEGOTIATING;
  const isActivePhase = [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.DELIVERING].includes(order.status);
  const isCompleted = order.status === OrderStatus.COMPLETED;

  useEffect(() => {
      if (order.courierId) {
          getUserProfile(order.courierId).then(profile => {
              setCourier(profile);
              if (profile?.location) {
                  setCourierLocation(profile.location);
              }
          });

          const unsubscribe = subscribeToProfile(order.courierId, (updatedProfile) => {
              if (updatedProfile.location) {
                  setCourierLocation(updatedProfile.location);
              }
          });
          return () => { unsubscribe(); }
      }
  }, [order.courierId]);

  const handleReportProblem = () => { showModal(<SenderReportModal onClose={hideModal} />); };

  const handleLeaveReview = async () => { showModal(<LeaveReviewSenderModal order={order} onSubmit={async (review) => { try { const { data: { user } } = await supabase.auth.getUser(); if (user && order.courierId) { await createReview({ orderId: order.id, authorId: user.id, targetId: order.courierId, rating: review.rating, comment: review.comment }); onUpdateOrder(order.id, { isReviewed: true }); onReview(); } } catch (e) { console.error("Error creating review", e); alert("Ошибка при отправке отзыва"); } }} onClose={hideModal} />); };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
    });
  };

  const openNavigator = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    const query = encodeURIComponent(address);
    window.open(`https://yandex.ru/maps/?text=${query}`, '_blank');
  };

  const renderOptions = () => {
    if (!order.options || order.options.length === 0) return <div className="text-[13px] text-neutral-500">Нет опций</div>;
    const activeOptions = order.options.map(opt => ORDER_OPTIONS_CONFIG[opt]).filter(Boolean);
    return (
        <div className="flex gap-2 flex-wrap">
            {activeOptions.map((opt, i) => (<Badge key={i} icon={opt.icon} label={opt.label} colorHex={opt.color} />))}
        </div>
    );
  };

  return (
    <SwipeableWrapper onDismiss={onClose} zIndex={zIndex} id="view-order-detail" backgroundSelector={backgroundSelector}>
      
      <div className="fixed inset-0 z-0">
          <MapComponent 
              pickup={order.pickupLocation} 
              delivery={order.deliveryLocation} 
              courier={courierLocation}
              isCourierView={false} 
              bottomSheetHeight={window.innerHeight * 0.6}
              hideControls={true}
              triggerLocate={locateTrigger}
              onLocateHandled={() => setLocateTrigger(false)}
          />
      </div>

      <div 
          className="absolute right-4 flex flex-col gap-3 z-[50]"
          style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
      >
          <button
              onClick={() => setLocateTrigger(true)}
              className="w-[52px] h-[52px] bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform pointer-events-auto"
          >
              <NavigationIcon />
          </button>
      </div>

      <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-1 pointer-events-none"></div>

      <FloatingBackButton onClick={onClose} />

      <div className="relative z-10 w-full h-full overflow-y-auto scrolling-touch" style={{ overscrollBehaviorY: 'none' }}>
        
        <div className="w-full h-[45vh] pointer-events-none"></div>
        
        <div 
            className="min-h-[60vh] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden pb-20 backdrop-blur-[5px] pointer-events-auto"
            style={{
                backgroundColor: 'rgba(20, 20, 20, 0.4)',
            }}
        >
            <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 bg-neutral-600/50 rounded-full"></div>
            </div>

            <div className="px-0 pb-4 mt-2">
                
                {/* 1. COURIER BLOCK (If active) */}
                {(isActivePhase || isCompleted) && (
                    <>
                        <CourierProfileGlass courier={courier} isContactAllowed={isActivePhase} orderId={order.id} onOpenChat={onOpenChat} />
                        
                        {/* LINE 1 */}
                        <div className="h-[0.5px] bg-white/10 mx-6 my-6"></div>
                        
                        <div className="px-4 mb-3"><h3 className="text-[15px] font-bold text-neutral-500">История заказа</h3></div>
                        <SenderOrderStatusTracker status={order.status} completedAt={order.completedAt} />
                        
                        {isCompleted && (
                            <>
                                {/* LINE 2 (Before buttons if completed) */}
                                <div className="h-[0.5px] bg-white/10 mx-6 my-6"></div>
                                <div className="px-5 pb-6 flex gap-3"><div className="flex-1 h-[76px] rounded-full backdrop-blur-xl text-[#30D158] flex items-center justify-center gap-2 overflow-hidden relative" style={{ backgroundColor: '#30D15833' }}><div className="absolute inset-0 bg-white/5 pointer-events-none"></div><Icons.Check /><span className="font-bold">Выполнено</span></div>{!order.isReviewed ? (<button onClick={handleLeaveReview} className="flex-1 h-[76px] rounded-full backdrop-blur-xl text-[#FFD60A] flex items-center justify-center gap-2 active:scale-95 transition-transform overflow-hidden relative" style={{ backgroundColor: '#FFD60A33' }}><div className="absolute inset-0 bg-white/5 pointer-events-none"></div><Icons.Star /><span className="font-bold">Оценить</span></button>) : (<div className="flex-1 h-[76px] flex items-center justify-center text-[13px] text-center text-neutral-500 font-medium bg-white/5 rounded-full border border-white/5">Отзыв отправлен</div>)}</div>
                            </>
                        )}

                        {/* LINE 3 (Before Addresses if Courier Block Exists) */}
                        <div className="h-[0.5px] bg-white/10 mx-6 my-6"></div>
                    </>
                )}

                {/* 2. ADDRESSES */}
                <div className="relative px-0">
                    <h3 className="text-[15px] font-bold text-neutral-500 mb-3 px-4">Адреса</h3>
                    
                    <div className="relative flex gap-4 mb-6 group px-4">
                        <div className="w-10 h-10 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center shrink-0 border border-[#FF3B30]/30"><span className="text-xl font-bold">А</span></div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-[11px] text-neutral-500 font-bold uppercase mb-1">Забрать</p>
                            <div className="relative flex items-start justify-between gap-3 cursor-pointer active:opacity-70 transition-opacity" onClick={() => copyText(order.pickupAddress, 'pickup')}>
                                <p className={`text-[15px] leading-relaxed font-normal transition-colors duration-300 select-text break-words flex-1 ${copiedStates['pickup'] ? 'text-[#30D158]' : 'text-white'}`}>{order.pickupAddress}</p>
                                <div className="shrink-0 w-8 h-8 flex items-center justify-center relative">
                                    {copiedStates['pickup'] && (
                                        <div className="text-[#30D158] absolute inset-0 flex items-center justify-center animate-fade-in">
                                            <Icons.Check />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative flex gap-4 group px-4">
                        <div className="w-10 h-10 rounded-full bg-[#30D158]/20 text-[#30D158] flex items-center justify-center shrink-0 border border-[#30D158]/30"><span className="text-xl font-bold">Б</span></div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-[11px] text-neutral-500 font-bold uppercase mb-1">Доставить</p>
                            <div className="relative flex items-start justify-between gap-3 cursor-pointer active:opacity-70 transition-opacity" onClick={() => copyText(order.deliveryAddress, 'delivery')}>
                                <p className={`text-[15px] leading-relaxed font-normal transition-colors duration-300 select-text break-words flex-1 ${copiedStates['delivery'] ? 'text-[#30D158]' : 'text-white'}`}>{order.deliveryAddress}</p>
                                <div className="shrink-0 w-8 h-8 flex items-center justify-center relative">
                                    {copiedStates['delivery'] && (
                                        <div className="text-[#30D158] absolute inset-0 flex items-center justify-center animate-fade-in">
                                            <Icons.Check />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LINE 4 (Before Info) */}
                <div className="h-[0.5px] bg-white/10 mx-6 my-6"></div>

                {/* 3. INFO */}
                <div className="text-[15px] font-bold text-neutral-500 px-4 mb-3">Информация о заказе</div>
                <div className="">
                    <InfoRow label="Что везем" value={order.title} />
                    <InfoRow label="Стоимость" value={`${new Intl.NumberFormat('ru-RU').format(order.price)} ₽`} valueClassName="text-[#30D158] font-bold text-[17px]"/>
                    <InfoRow label="Оплата" value={order.paymentMethod === 'card' ? 'Перевод/СБП' : 'Наличными'} />
                    <InfoRow label="Вес" value={order.weight} />

                    {order.description && (
                        <div className="px-4 py-3">
                            <p className="text-[15px] text-neutral-500 font-medium mb-1.5">Комментарий</p>
                            <p className="text-[14px] text-white leading-relaxed whitespace-pre-wrap break-words">{order.description}</p>
                        </div>
                    )}

                    {order.options && order.options.length > 0 && (
                        <div className="px-4 py-3">
                            <p className="text-[15px] text-neutral-500 font-medium mb-2">Опции</p>
                            {renderOptions()}
                        </div>
                    )}

                    <div className="px-4 py-4">
                        <div onClick={() => copyText(order.id, 'id')} className="flex items-center justify-between cursor-pointer active:opacity-70 min-h-[24px]">
                            <span className="text-[15px] text-neutral-500 font-medium">ID заказа</span>
                            <div className="flex items-center gap-3 relative">
                                <span className={`font-mono text-[13px] transition-colors duration-300 ${copiedStates['id'] ? 'text-[#30D158]' : 'text-white'}`}>
                                    {order.id}
                                </span>
                                <div className={`transition-all duration-300 ${copiedStates['id'] ? 'opacity-100 scale-100 text-[#30D158]' : 'opacity-0 scale-50'}`}>
                                    <div className="scale-90"><Icons.Check /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button onClick={handleReportProblem} className="w-full py-4 text-[13px] font-medium text-neutral-600 hover:text-white transition-colors">Сообщить о проблеме</button>
            </div>
        </div>
      </div>

      {isSearchPhase && (
          <div 
            className="absolute left-3 right-3 z-50 flex gap-3 animate-fade-in pointer-events-auto"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
          >
              <button 
                onClick={() => onCancelOrder(order.id)}
                className="w-[84px] h-[84px] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform overflow-hidden relative"
                style={{ 
                    backgroundColor: '#FF3B30', // Fully opaque
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)'
                }}
              >
                  <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
                  <Icons.X />
              </button>
              
              <GlassActionButton 
                label="Изменить" 
                icon={<Icons.Edit />} 
                onClick={() => onEdit(order)} 
                color="#0A84FF" 
                flexClass="flex-1 h-[84px]" 
              />
          </div>
      )}
    </SwipeableWrapper>
  );
};
