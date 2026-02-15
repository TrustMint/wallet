
import React, { useState, useEffect, useRef } from 'react';
import { Order, User, UserRole, OrderStatus, CounterOffer } from '../../types';
import { Icons, ORDER_OPTIONS_CONFIG } from '../../constants';
import { GlassButton } from '../../components/GlassCard';
import { SwipeableWrapper } from '../../components/SwipeableWrapper';
import { useModal } from '../../hooks/useModal';
import { ReportProblemModal } from '../../components/modals/ReportProblemModal';
import { LeaveReviewSenderModal } from '../../components/modals/LeaveReviewSenderModal';
import { LeaveReviewCourierModal } from '../../components/modals/LeaveReviewCourierModal';
import { ActionSlider } from '../../components/ActionSlider';
import { FloatingBackButton } from '../../components/FloatingBackButton';
import { getUserProfile, createReview } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';

interface OrderDetailProps {
  order: Order;
  currentUser: User;
  onClose: () => void;
  onAccept: (orderId: string, price: number) => void;
  onCounterOffer: () => void;
  onPickup: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void; 
  onReview: () => void;
  zIndex?: number;
  backgroundSelector?: string;
}

const isCourierAction = (order: Order, currentUser: User) => {
    return currentUser.role === UserRole.COURIER && order.courierId === currentUser.id;
}

// --- ANIMATION HELPERS ---

const useSlowBounce = (onClick: () => void) => {
    const [isBouncing, setIsBouncing] = useState(false);
    
    const trigger = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsBouncing(true);
        onClick();
        setTimeout(() => setIsBouncing(false), 250);
    };
    
    return { isBouncing, trigger };
};

const GlassActionButton: React.FC<{ 
    label: string; 
    onClick: () => void; 
    color: string; 
    flexClass?: string;
}> = ({ label, onClick, color, flexClass = 'flex-1' }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);

    return (
        <button
            type="button"
            onClick={trigger}
            style={{
                backgroundColor: `${color}33`, 
                boxShadow: `0 0 20px ${color}33, inset 0 1px 0 0 rgba(255,255,255,0.2)`
            }}
            className={`${flexClass} h-[76px] rounded-full backdrop-blur-xl font-bold text-[17px] text-white flex items-center justify-center gap-2 transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                isBouncing ? 'scale-[0.85]' : 'scale-100'
            }`}
        >
            {label}
        </button>
    );
};

const NavigatorButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);
    const color = '#FFD60A';

    return (
        <button
            type="button"
            onClick={trigger}
            style={{
                backgroundColor: `${color}33`,
                boxShadow: `0 0 20px ${color}33, inset 0 1px 0 0 rgba(255,255,255,0.2)`
            }}
            className={`h-9 px-4 rounded-full backdrop-blur-xl text-[#FFD60A] text-[13px] font-bold flex items-center gap-2 transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                isBouncing ? 'scale-[0.85]' : 'scale-100'
            }`}
        >
            <Icons.MapPin /> Навигатор
        </button>
    );
};

const CopyButton: React.FC<{ onClick: () => void; isCopied: boolean }> = ({ onClick, isCopied }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);
    const color = isCopied ? '#30D158' : '#8E8E93';

    return (
        <button
            type="button"
            onClick={trigger}
            style={{
                backgroundColor: `${color}33`,
                boxShadow: `0 0 20px ${color}33, inset 0 1px 0 0 rgba(255,255,255,0.2)`
            }}
            className={`h-9 min-w-[105px] px-4 rounded-full backdrop-blur-xl text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                isBouncing ? 'scale-[0.85]' : 'scale-100'
            }`}
        >
            {isCopied ? <Icons.Check /> : 'Скопировать'}
        </button>
    );
};

const ContactButton: React.FC<{ 
    icon: React.ReactNode; 
    onClick: () => void; 
    color: string; 
    disabled?: boolean; 
}> = ({ icon, onClick, color, disabled }) => {
    const { isBouncing, trigger } = useSlowBounce(onClick);

    if (disabled) {
         return (
             <button disabled className="w-11 h-11 rounded-full flex items-center justify-center border border-white/5 bg-[#2C2C2E]/30 text-neutral-600 opacity-40 cursor-not-allowed">
                 {icon}
             </button>
         )
    }

    return (
        <button
            type="button"
            onClick={trigger}
            style={{
                backgroundColor: `${color}33`,
                boxShadow: `0 0 20px ${color}33, inset 0 1px 0 0 rgba(255,255,255,0.2)`
            }}
            className={`w-11 h-11 rounded-full backdrop-blur-xl flex items-center justify-center text-white transition-transform duration-[2000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                isBouncing ? 'scale-[0.85]' : 'scale-100'
            }`}
        >
            {icon}
        </button>
    );
};

const DetailBlock: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div 
        onClick={onClick}
        className={`relative rounded-[24px] bg-[#1C1C1E] overflow-hidden ${className}`}
    >
        {children}
    </div>
);

const OrderStatusTracker: React.FC<{ status: OrderStatus; completedAt?: number }> = ({ status, completedAt }) => {
    const [animationFinished, setAnimationFinished] = useState(() => {
        if (status === OrderStatus.COMPLETED && completedAt) {
            const timeSinceCompletion = Date.now() - completedAt;
            return timeSinceCompletion > 3000; 
        }
        return false;
    });

    useEffect(() => {
        if (status === OrderStatus.COMPLETED && !animationFinished) {
            const timer = setTimeout(() => {
                setAnimationFinished(true);
            }, 3000); 
            return () => clearTimeout(timer);
        } else if (status !== OrderStatus.COMPLETED) {
            setAnimationFinished(false);
        }
    }, [status, completedAt, animationFinished]);

    const steps = [
        { id: OrderStatus.ACCEPTED, label: 'Заказ принят', subLabel: 'Ожидание курьера', icon: <Icons.Check />, activeColor: '#30D158'},
        { id: OrderStatus.PICKED_UP, label: 'Груз у курьера', subLabel: 'В пути к получателю', icon: <Icons.Box />, activeColor: '#0A84FF'},
        { id: OrderStatus.COMPLETED, label: 'Доставлен', subLabel: 'Заказ успешно выполнен', icon: <Icons.Gift />, activeColor: '#30D158'},
    ];

    let activeIndex = 0;
    if (status === OrderStatus.PICKED_UP || status === OrderStatus.DELIVERING) activeIndex = 1;
    if (status === OrderStatus.COMPLETED) activeIndex = 2;

    return (
        <div className="py-2 pl-2 relative">
            <div className="space-y-8">
                {steps.map((step, index) => {
                    const isRealCompleted = index < activeIndex;
                    const isRealActive = index === activeIndex;
                    const isFinished = step.id === OrderStatus.COMPLETED && animationFinished && isRealActive;
                    const showAsCompleted = isRealCompleted || isFinished;
                    const showAsActive = isRealActive && !isFinished;

                    let iconClassName = 'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden';
                    let iconStyle = {};

                    if (showAsCompleted) { 
                        iconStyle = {
                             backgroundColor: '#30D15833',
                             boxShadow: '0 0 20px #30D15833, inset 0 1px 0 0 rgba(255,255,255,0.2)',
                             backdropFilter: 'blur(20px)',
                             WebkitBackdropFilter: 'blur(20px)'
                        };
                        iconClassName += ' text-white';
                    } else if (showAsActive) { 
                        iconStyle = {
                             backgroundColor: `${step.activeColor}99`, 
                             boxShadow: `0 0 25px ${step.activeColor}66, inset 0 1px 0 0 rgba(255,255,255,0.4)`,
                             backdropFilter: 'blur(20px)',
                             WebkitBackdropFilter: 'blur(20px)'
                        };
                        iconClassName += ' text-white scale-110';
                    } else {
                        iconClassName += ' bg-[#1C1C1E] border border-[#2C2C2E] text-neutral-600';
                    }

                    const liveBadgeStyle = {
                        backgroundColor: '#30D15833',
                        boxShadow: '0 0 15px #30D15833, inset 0 1px 0 0 rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(5px)',
                        WebkitBackdropFilter: 'blur(5px)'
                    };

                    return (
                        <div key={step.id} className={`flex items-center gap-5 relative group transition-all duration-700 ${index > activeIndex ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                            <div className="relative flex-shrink-0 z-10">
                                {showAsActive && (<div className={`absolute inset-0 rounded-full bg-[${step.activeColor}] opacity-40 animate-ping`}></div>)}
                                <div 
                                    className={iconClassName}
                                    style={iconStyle}
                                >
                                    {(showAsActive || showAsCompleted) && <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>}
                                    <div className="relative z-10">
                                        {showAsCompleted ? <Icons.Check /> : step.icon}
                                    </div>
                                </div>
                            </div>
                            <div className={`flex flex-col transition-all duration-500 ${showAsActive ? 'translate-x-0 opacity-100' : 'translate-x-0'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[17px] font-bold leading-tight tracking-tight transition-colors ${showAsActive ? 'text-white' : showAsCompleted ? 'text-[#30D158]' : 'text-neutral-500'}`}>{step.label}</span>
                                    {showAsActive && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full animate-pulse" style={liveBadgeStyle}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] shadow-[0_0_5px_#30D158]"></div>
                                            <span className="text-[10px] font-bold text-[#30D158] tracking-wider">LIVE</span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[13px] font-medium mt-1 leading-snug ${showAsActive ? 'text-neutral-300' : 'text-neutral-600'}`}>{step.subLabel}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ThickArrowRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
);

const ThickX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

const ExecutionCard: React.FC<{ order: Order, onPickup: () => void, onComplete: () => void, onCancel: () => void, onReport: () => void, onLeaveReview: () => void }> = ({ order, onPickup, onComplete, onCancel, onReport, onLeaveReview }) => {
    const [idCopied, setIdCopied] = useState(false);
    
    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(order.id);
        setIdCopied(true);
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => setIdCopied(false), 2000);
    };

    return (
        <DetailBlock className="p-6">
            <div className="flex items-center justify-between mb-6 pl-1 gap-4">
                <h3 className="text-[17px] font-bold text-white tracking-tight whitespace-nowrap">История заказа</h3>
                <button 
                    type="button"
                    onClick={handleCopyId} 
                    className="relative active:scale-95 transition-all duration-200 outline-none group"
                >
                    <div className={`relative px-3 py-0.5 -my-1 rounded-full border transition-all duration-300 ${idCopied ? 'bg-[#30D158]/10 border-[#30D158]/20 shadow-[0_0_15px_rgba(48,209,88,0.15)]' : 'bg-transparent border-transparent'}`}>
                        <span className="text-[11px] font-medium tracking-tight font-mono opacity-0 select-none whitespace-nowrap">
                            {`ID: ${order.id}`}
                        </span>
                        <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-medium tracking-tight font-mono text-neutral-500 transition-all duration-300 group-hover:text-neutral-400 ${idCopied ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                            {`ID: ${order.id}`}
                        </span>
                        <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#30D158] transition-all duration-300 ${idCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                            Скопировано
                        </span>
                    </div>
                </button>
            </div>
            <OrderStatusTracker status={order.status} completedAt={order.completedAt} />
            <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                {order.status === OrderStatus.ACCEPTED && (
                    <div className="flex gap-3">
                        <ActionSlider 
                            label="Забрал груз"
                            icon={<ThickArrowRight />}
                            mainColor="#0A84FF"
                            onConfirm={onPickup}
                            className="flex-1"
                        />
                        <button 
                            onClick={onCancel} 
                            style={{
                                backgroundColor: '#FF3B3033', 
                                boxShadow: '0 0 20px #FF3B3033, inset 0 1px 0 0 rgba(255,255,255,0.2)'
                            }}
                            className="w-[76px] h-[76px] rounded-full backdrop-blur-xl text-white flex items-center justify-center active:scale-90 transition-all shrink-0"
                        >
                            <ThickX />
                        </button>
                    </div>
                )}
                {order.status === OrderStatus.PICKED_UP && (
                    <ActionSlider 
                        label="Завершить доставку"
                        icon={<Icons.Check />}
                        mainColor="#30D158"
                        onConfirm={onComplete}
                        className="w-full"
                    />
                )}
                {order.status === OrderStatus.COMPLETED && (
                    <div className="flex gap-3">
                        <div 
                            className="flex-1 h-[76px] rounded-full backdrop-blur-xl text-[#30D158] flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: '#30D15833',
                                boxShadow: '0 0 20px #30D15833, inset 0 1px 0 0 rgba(255,255,255,0.2)'
                            }}
                        >
                            <Icons.Check />
                            <span className="font-bold">Выполнено</span>
                        </div>
                        
                        {!order.isReviewed ? (
                            <button 
                                onClick={onLeaveReview}
                                className="flex-1 h-[76px] rounded-full backdrop-blur-xl text-[#FFD60A] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                style={{
                                    backgroundColor: '#FFD60A33',
                                    boxShadow: '0 0 20px #FFD60A33, inset 0 1px 0 0 rgba(255,255,255,0.2)'
                                }}
                            >
                                <Icons.Star />
                                <span className="font-bold">Оценить</span>
                            </button>
                        ) : (
                            <div className="flex-1 h-[76px] flex items-center justify-center text-[13px] text-center text-neutral-500 font-medium bg-white/5 rounded-full border border-white/5">
                                Отзыв отправлен
                            </div>
                        )}
                    </div>
                )}
            </div>
            {order.status !== OrderStatus.COMPLETED && <button onClick={onReport} className="text-center w-full mt-5 text-[13px] text-neutral-500 font-medium active:text-white transition-colors">Сообщить о проблеме</button>}
        </DetailBlock>
    );
};

const NegotiatingCard: React.FC<{ order: Order, currentUser: User }> = ({ order, currentUser }) => {
    const myOffer = order.counterOffers.find(o => o.courierId === currentUser.id);
    return (
        <DetailBlock className="p-6 text-center"><Icons.History /><h3 className="text-[20px] font-bold text-white mt-4">Ожидание ответа</h3>{myOffer && (<p className="text-neutral-400 mt-2">Вы предложили <span className="font-bold text-white">{myOffer.proposedPrice} ₽</span>. Отправитель примет решение в ближайшее время.</p>)}<div className="mt-6"><p className="text-[14px] text-neutral-500">Первоначальная цена: <span className="line-through">{order.price} ₽</span></p></div></DetailBlock>
    );
};
const PendingActionCard: React.FC<{ order: Order, onAccept: () => void, onCounterOffer: () => void }> = ({ order, onAccept, onCounterOffer }) => (
    <DetailBlock className="p-0 overflow-hidden text-center">
        <div className="p-6">
            <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-[15px] font-medium text-neutral-400">Стоимость доставки</span>
                </div>
                <h1 className="text-[52px] font-black text-white leading-none tracking-tight mb-4">{new Intl.NumberFormat('ru-RU').format(order.price)} <span className="text-[28px] text-neutral-500 font-medium">₽</span></h1>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                    {order.paymentMethod === 'card' ? <Icons.CreditCard /> : <Icons.Wallet />}
                    <span className="text-[14px] font-medium text-white">{order.paymentMethod === 'card' ? 'Оплата картой' : 'Наличные'}</span>
                </div>
            </div>
        </div>
        <div className="mt-2 px-5 py-5">
            <div className="flex gap-3">
                <GlassActionButton 
                    label="Торг" 
                    onClick={onCounterOffer} 
                    color="#8E8E93" 
                    flexClass="flex-1"
                />
                <GlassActionButton 
                    label="Принять" 
                    onClick={onAccept} 
                    color="#30D158" 
                    flexClass="flex-[2]" 
                />
            </div>
        </div>
    </DetailBlock>
);

// Badge component extracted for better typing support with 'key' prop - ICONS REMOVED
const Badge: React.FC<{ icon: any, label: string, colorHex: string }> = ({ icon, label, colorHex }) => (
    <div 
        className="py-[3px] px-1 rounded-full backdrop-blur-md border flex items-center justify-center gap-1 text-[9px] font-bold shadow-sm w-full min-w-0 overflow-hidden"
        style={{
            backgroundColor: `${colorHex}22`,
            borderColor: `${colorHex}33`,
            color: colorHex
        }}
    >
        <span className="truncate">{label}</span>
    </div>
);

export const OrderDetail: React.FC<OrderDetailProps> = ({ 
  order, currentUser, onClose, onAccept, onCounterOffer, onPickup, onComplete, onCancelOrder, onReview, zIndex = 200, backgroundSelector
}) => {
  const { showModal, hideModal } = useModal();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [senderProfile, setSenderProfile] = useState<User | null>(null);
  
  const isContactAllowed = [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.DELIVERING].includes(order.status);
  
  useEffect(() => {
      // Fetch sender profile
      if (order.senderId) {
          getUserProfile(order.senderId).then(setSenderProfile);
      }
  }, [order.senderId]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
    });
  };
  
  const openNavigator = (address: string) => {
    const query = encodeURIComponent(address);
    window.open(`https://yandex.ru/maps/?text=${query}`, '_blank');
  };
  
  const handleCall = () => { 
      if (senderProfile?.phone) {
          window.location.href = `tel:${senderProfile.phone}`;
      } else {
          alert('Номер скрыт');
      }
  };
  
  const handleTelegram = () => { 
      if (senderProfile?.phone) {
          // Telegram deep link using phone number: https://t.me/+7XXXXXXXXXX
          let num = senderProfile.phone.replace(/[^\d+]/g, '');
          if (!num.startsWith('+')) num = '+' + num;
          window.open(`https://t.me/${num}`, '_blank');
      } else {
          alert('Номер скрыт');
      }
  };

  const handleReportProblem = () => {
      showModal(<ReportProblemModal onClose={hideModal} />);
  };

  const handleLeaveReview = () => {
      const ModalComponent = currentUser.role === UserRole.COURIER 
          ? LeaveReviewCourierModal 
          : LeaveReviewSenderModal;

      showModal(
          <ModalComponent 
              order={order}
              onSubmit={async (review) => {
                  try {
                      // Actually send to API
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user && order.senderId) {
                          await createReview({
                              orderId: order.id,
                              authorId: user.id,
                              targetId: order.senderId, // Courier reviews sender
                              rating: review.rating,
                              comment: review.comment
                          });
                          onReview();
                      }
                  } catch (e) {
                      console.error("Error submitting review", e);
                      alert("Ошибка при отправке отзыва");
                  }
              }} 
              onClose={hideModal} 
          />
      );
  };

  const renderOptions = () => {
    if (!order.options || order.options.length === 0) return null;
    
    // Updated to use centralized config
    const activeOptions = order.options
        .map(opt => ORDER_OPTIONS_CONFIG[opt])
        .filter(Boolean);

    return (
        <div className="grid grid-cols-4 gap-1 pt-3 w-full">
            {activeOptions.map((opt, i) => (
                <Badge key={i} icon={opt.icon} label={opt.label} colorHex={opt.color} />
            ))}
        </div>
    );
  };

  const renderMainCard = () => {
    if (currentUser.role === UserRole.SENDER || (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.NEGOTIATING && !isCourierAction(order, currentUser))) {
        return (<DetailBlock className="p-6 text-center"><h1 className="text-[42px] font-black text-white leading-none tracking-tight mb-2">{new Intl.NumberFormat('ru-RU').format(order.price)} ₽</h1><p className="text-[15px] font-medium text-neutral-400">Стоимость доставки</p></DetailBlock>);
    }
    switch (order.status) {
        case OrderStatus.PENDING: return <PendingActionCard key="pending" order={order} onAccept={() => onAccept(order.id, order.price)} onCounterOffer={onCounterOffer} />;
        case OrderStatus.NEGOTIATING: return <NegotiatingCard key="negotiating" order={order} currentUser={currentUser} />;
        case OrderStatus.ACCEPTED: case OrderStatus.PICKED_UP: case OrderStatus.COMPLETED: return <ExecutionCard key="execution" order={order} onPickup={() => onPickup(order.id)} onComplete={() => onComplete(order.id)} onCancel={() => onCancelOrder(order.id)} onReport={handleReportProblem} onLeaveReview={handleLeaveReview} />;
        default: return <p>Unknown order status</p>;
    }
  };

  return (
    <SwipeableWrapper onDismiss={onClose} zIndex={zIndex} id="view-order-detail" backgroundSelector={backgroundSelector}>
      <FloatingBackButton onClick={onClose} />

      <div 
        className="flex-1 overflow-y-auto scrolling-touch relative h-full"
        style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
      >
        <div className="h-[340px] w-full relative overflow-hidden bg-[#151515]">
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
           <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              <path d="M 40 180 Q 150 250 320 120" stroke="#0A84FF" strokeWidth="4" fill="none" strokeDasharray="10 5" className="opacity-60" />
              <circle cx="40" cy="180" r="8" fill="#FF3B30" className="animate-pulse" /><circle cx="40" cy="180" r="20" fill="#FF3B30" fillOpacity="0.2" />
              <circle cx="320" cy="120" r="8" fill="#30D158" /><circle cx="320" cy="120" r="20" fill="#30D158" fillOpacity="0.2" />
           </svg>
           <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>
        </div>

        <div className="relative z-10 -mt-20 px-3 pb-4 space-y-4">
            <DetailBlock className="p-4">
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 shadow-md border-2 border-white/10 relative overflow-hidden">
                             {senderProfile && <img src={senderProfile.avatar} alt="Sender" className="w-full h-full object-cover" />}
                         </div>
                         <div>
                             <p className="text-[16px] font-bold text-white">{senderProfile ? senderProfile.name : 'Отправитель'}</p>
                             {senderProfile && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex items-center gap-1 bg-[#FFD60A]/10 px-1.5 py-0.5 rounded-md"><span className="text-[11px] text-[#FFD60A] font-bold">★ {senderProfile.rating.toFixed(1)}</span></div>
                                    <span className="text-[12px] text-neutral-500">Заказчик</span>
                                </div>
                             )}
                         </div>
                     </div>
                     <div className="flex gap-2">
                         <ContactButton 
                            icon={<Icons.Phone />} 
                            onClick={handleCall} 
                            color="#30D158" 
                            disabled={!isContactAllowed} 
                         />
                         <ContactButton 
                            icon={<Icons.Message />} 
                            onClick={handleTelegram} 
                            color="#0A84FF" 
                            disabled={!isContactAllowed} 
                         />
                     </div>
                 </div>
                 <div className="pt-3 border-t border-white/5">
                     <h2 className="text-[19px] font-bold text-white mb-2 leading-snug">{order.title}</h2>
                     <h3 className="text-[13px] font-bold text-neutral-500 uppercase tracking-wide mb-2 mt-2">Комментарий</h3>
                     <p className="text-[15px] text-white leading-relaxed">{order.description}</p>
                     {renderOptions()}
                 </div>
            </DetailBlock>
            {renderMainCard()}
            <DetailBlock className="p-0 overflow-hidden">
                <div className="relative p-5">
                    <h3 className="text-[17px] font-bold text-white mb-6">Маршрут</h3>
                    
                    <div className="relative flex gap-4 mb-8 group">
                         <div 
                            className="w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center shrink-0 z-10 shadow-[0_0_20px_rgba(255,59,48,0.2),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                            style={{ backgroundColor: '#FF3B3033' }}
                         >
                            <span className="text-xl font-bold text-white select-none">А</span>
                         </div>
                         <div className="flex-1 min-w-0 pt-0.5">
                             <p className="text-[13px] text-neutral-500 font-semibold uppercase mb-1">Забрать</p>
                             <p className="mb-3 text-[17px] text-white leading-snug font-medium select-text break-words">
                                {order.pickupAddress}
                             </p>
                             <div className="flex gap-3">
                                 <NavigatorButton onClick={() => openNavigator(order.pickupAddress)} />
                                 <CopyButton 
                                    onClick={() => copyText(order.pickupAddress, 'pickup')} 
                                    isCopied={copiedStates['pickup']} 
                                 />
                             </div>
                         </div>
                    </div>

                    <div className="relative flex gap-4 group">
                         <div 
                            className="w-10 h-10 rounded-full backdrop-blur-xl flex items-center justify-center shrink-0 z-10 shadow-[0_0_20px_rgba(48,209,88,0.2),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                            style={{ backgroundColor: '#30D15833' }}
                         >
                            <span className="text-xl font-bold text-white select-none">Б</span>
                         </div>
                         <div className="flex-1 min-w-0 pt-0.5">
                             <p className="text-[13px] text-neutral-500 font-semibold uppercase mb-1">Доставить</p>
                             <p className="mb-3 text-[17px] text-white leading-snug font-medium select-text break-words">
                                {order.deliveryAddress}
                             </p>
                             <div className="flex gap-3">
                                 <NavigatorButton onClick={() => openNavigator(order.deliveryAddress)} />
                                 <CopyButton 
                                    onClick={() => copyText(order.deliveryAddress, 'delivery')} 
                                    isCopied={copiedStates['delivery']} 
                                 />
                             </div>
                         </div>
                    </div>
                </div>
            </DetailBlock>
        </div>
      </div>
    </SwipeableWrapper>
  );
};
