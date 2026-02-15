
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Icons } from '../../../constants';
import { mapOrderFromDB, removeCounterOffer } from '../../../services/api';
import { OrderStatus } from '../../../types';
import { GlassButton } from '../../../components/GlassCard';

interface WaitingForSenderModalProps {
    orderId: string;
    courierId: string;
    initialPrice: number;
    onClose: () => void;
}

export const WaitingForSenderModal: React.FC<WaitingForSenderModalProps> = ({ 
    orderId, 
    courierId, 
    initialPrice, 
    onClose 
}) => {
    const [timeLeft, setTimeLeft] = useState(30);
    const [otherOffersCount, setOtherOffersCount] = useState(0);
    const [status, setStatus] = useState<'WAITING' | 'ACCEPTED' | 'DECLINED'>('WAITING');
    const [isCancelling, setIsCancelling] = useState(false);
    
    // For circular progress
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    
    const progressOffset = ((30 - timeLeft) / 30) * circumference;

    useEffect(() => {
        let isMounted = true;

        // 1. Initial Fetch to get accurate count immediately
        const fetchInitialState = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('counter_offers, status, courier_id')
                .eq('id', orderId)
                .single();

            if (data && isMounted) {
                // Count others
                const offers = data.counter_offers || [];
                const others = offers.filter((o: any) => o.courierId !== courierId).length;
                setOtherOffersCount(others);

                // Check status logic immediately
                if (data.status === OrderStatus.ACCEPTED && data.courier_id === courierId) {
                    setStatus('ACCEPTED');
                } else if (data.status === OrderStatus.ACCEPTED && data.courier_id !== courierId) {
                    // Taken by someone else
                    setStatus('DECLINED');
                } else {
                    const myOfferExists = offers.some((o: any) => o.courierId === courierId);
                    if (!myOfferExists && data.status !== OrderStatus.ACCEPTED) {
                        setStatus('DECLINED');
                    }
                }
            }
        };

        fetchInitialState();

        // 2. Timer Logic
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // 3. Realtime Subscription
        const channel = supabase
            .channel(`waiting_room:${orderId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    if (!isMounted) return;
                    
                    const newOrder = mapOrderFromDB(payload.new);
                    
                    // Case 1: I won
                    if (newOrder.status === OrderStatus.ACCEPTED && newOrder.courierId === courierId) {
                        setStatus('ACCEPTED');
                        clearInterval(timer);
                        return;
                    }

                    // Case 2: Someone else won OR Order Cancelled
                    const isTakenByOther = newOrder.status === OrderStatus.ACCEPTED && newOrder.courierId !== courierId;
                    const isCancelled = newOrder.status === OrderStatus.CANCELLED;
                    
                    if (isTakenByOther || isCancelled) {
                        setStatus('DECLINED');
                        clearInterval(timer);
                        return;
                    }
                    
                    // Case 3: My offer declined/removed (but order still pending/negotiating)
                    const myOfferExists = newOrder.counterOffers.some(o => o.courierId === courierId);
                    if (!myOfferExists && status === 'WAITING') {
                        setStatus('DECLINED');
                        clearInterval(timer);
                        return;
                    }

                    // Update Competition Count
                    const others = newOrder.counterOffers.filter(o => o.courierId !== courierId).length;
                    setOtherOffersCount(others);
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            clearInterval(timer);
            supabase.removeChannel(channel);
        };
    }, [orderId, courierId]);

    const handleTimeout = async () => {
        if (status !== 'ACCEPTED') {
            await removeCounterOffer(orderId, courierId);
            onClose(); // Simply close the modal on timeout
        }
    };

    const handleManualCancel = async () => {
        setIsCancelling(true);
        try {
            await removeCounterOffer(orderId, courierId);
            onClose();
        } catch (e) {
            console.error("Failed to cancel", e);
            setIsCancelling(false);
        }
    };

    const handleSuccess = () => {
        onClose();
    };

    if (status === 'ACCEPTED') {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center animate-fade-in pb-12">
                <div className="w-24 h-24 rounded-full bg-[#30D158] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(48,209,88,0.5)] animate-bounce-custom">
                    <div className="text-white scale-150"><Icons.Check /></div>
                </div>
                <h3 className="text-[28px] font-bold text-white mb-2">Заказ ваш!</h3>
                <p className="text-[16px] text-neutral-400 mb-8">Отправитель принял ваше предложение.</p>
                <GlassButton variant="success" onClick={handleSuccess} className="!rounded-full h-[56px]">
                    Перейти к заказу
                </GlassButton>
            </div>
        );
    }

    if (status === 'DECLINED') {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-center animate-fade-in pb-12">
                <div className="w-24 h-24 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center mb-6">
                    <div className="text-[#FF3B30] scale-150"><Icons.X /></div>
                </div>
                <h3 className="text-[24px] font-bold text-white mb-2">Отказано</h3>
                <p className="text-[16px] text-neutral-400 mb-8">Заказ отменен или принят другим курьером.</p>
                <GlassButton variant="secondary" onClick={onClose} className="!rounded-full h-[56px] border border-white/5">
                    Закрыть
                </GlassButton>
            </div>
        );
    }

    return (
        <div className="p-6 pt-2 pb-8 flex flex-col items-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#0A84FF]/10 blur-[80px] rounded-full pointer-events-none"></div>

            <h3 className="text-[20px] font-bold text-white mb-8 relative z-10">Ожидание ответа</h3>

            {/* Circular Timer */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
                {/* SVG Ring */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#1C1C1E"
                        strokeWidth="6"
                        fill="none"
                    />
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="#0A84FF"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={progressOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(10,132,255,0.5))' }}
                    />
                </svg>
                
                {/* Number */}
                <div className="flex flex-col items-center">
                    <span className="text-[42px] font-black text-white leading-none tracking-tight font-mono w-[60px] text-center">
                        {timeLeft}
                    </span>
                    <span className="text-[12px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Сек</span>
                </div>
            </div>

            <div className="space-y-1 text-center mb-8 relative z-10">
                <p className="text-[15px] font-medium text-white">
                    Ваше предложение: <span className="text-[#30D158] font-bold">{initialPrice} ₽</span>
                </p>
                {otherOffersCount > 0 ? (
                    <p className="text-[13px] text-neutral-400 animate-pulse">
                        Конкуренция: еще {otherOffersCount} предлож.
                    </p>
                ) : (
                    <p className="text-[13px] text-neutral-500">
                        Вы пока единственный кандидат
                    </p>
                )}
            </div>

            <button 
                onClick={handleManualCancel}
                disabled={isCancelling}
                className="w-full py-4 rounded-full bg-[#1C1C1E] text-[#FF3B30] font-medium text-[15px] active:bg-[#2C2C2E] transition-colors border border-white/5 relative z-10 flex items-center justify-center gap-2"
            >
                {isCancelling && <div className="w-4 h-4 border-2 border-[#FF3B30]/30 border-t-[#FF3B30] rounded-full animate-spin"></div>}
                {isCancelling ? 'Отмена...' : 'Отменить предложение'}
            </button>
        </div>
    );
};
