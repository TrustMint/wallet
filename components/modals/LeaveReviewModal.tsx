
import React, { useState } from 'react';
import { Order } from '../../types';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface LeaveReviewModalProps {
    order: Order;
    onSubmit: (data: { rating: number; comment: string; tags: string[] }) => void;
    onClose: () => void;
}

const POSITIVE_KEYWORDS = ["Вежливый", "Быстро", "Аккуратно", "Пунктуальный", "Рекомендую"];
const NEGATIVE_KEYWORDS = ["Опоздал", "Грубый", "Повредил груз", "Не тот адрес", "Долго"];

export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({ order, onSubmit, onClose }) => {
    const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
    const [comment, setComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const isFormValid = sentiment !== null;

    const handleSubmit = () => {
        if (!isFormValid) return;
        setIsProcessing(true);
        
        // Simulate network request
        setTimeout(() => {
            const rating = sentiment === 'positive' ? 5 : 1;
            onSubmit({
                rating,
                comment,
                tags: [] // Could collect tags if needed
            });
            onClose();
        }, 1000);
    };

    const addKeyword = (keyword: string) => {
        setComment(prev => {
            if (prev.includes(keyword)) return prev;
            return prev ? `${prev}, ${keyword}` : keyword;
        });
    };

    return (
        <div className="p-4 pt-0 pb-8">
            <div className="text-center mb-6 px-4">
                <h3 className="text-[22px] font-bold text-white tracking-tight mb-2">Оцените заказ</h3>
                <p className="text-[15px] text-neutral-400">
                    Как прошла доставка <span className="text-white font-medium">"{order.title}"</span>?
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setSentiment('positive')}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300 active:scale-95 ${
                        sentiment === 'positive' 
                        ? 'bg-[#30D158]/20 border-[#30D158] shadow-[0_0_30px_rgba(48,209,88,0.2)]' 
                        : 'bg-[#1C1C1E] border-white/5 hover:bg-[#2C2C2E]'
                    }`}
                >
                    <div className={`transition-colors ${sentiment === 'positive' ? 'text-[#30D158]' : 'text-neutral-400'}`}>
                        <div className="scale-125"><Icons.ThumbsUp /></div>
                    </div>
                    <span className={`font-bold text-[15px] ${sentiment === 'positive' ? 'text-white' : 'text-neutral-400'}`}>
                        Всё отлично
                    </span>
                </button>

                <button
                    onClick={() => setSentiment('negative')}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border transition-all duration-300 active:scale-95 ${
                        sentiment === 'negative' 
                        ? 'bg-[#FF3B30]/20 border-[#FF3B30] shadow-[0_0_30px_rgba(255,59,48,0.2)]' 
                        : 'bg-[#1C1C1E] border-white/5 hover:bg-[#2C2C2E]'
                    }`}
                >
                    <div className={`transition-colors ${sentiment === 'negative' ? 'text-[#FF3B30]' : 'text-neutral-400'}`}>
                        <div className="scale-125"><Icons.ThumbsDown /></div>
                    </div>
                    <span className={`font-bold text-[15px] ${sentiment === 'negative' ? 'text-white' : 'text-neutral-400'}`}>
                        Есть проблемы
                    </span>
                </button>
            </div>

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${sentiment ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {sentiment === 'negative' && (
                    <div className="p-4 bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 rounded-[20px] flex gap-3 items-start mb-4">
                        <div className="text-[#FF9F0A] shrink-0 mt-0.5"><Icons.Info /></div>
                        <p className="text-[13px] text-[#FF9F0A] leading-snug font-medium">
                            Ваш отзыв поможет нам стать лучше. Если возникла серьезная проблема, пожалуйста, обратитесь в поддержку.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {(sentiment === 'positive' ? POSITIVE_KEYWORDS : NEGATIVE_KEYWORDS).map(keyword => (
                        <button 
                            key={keyword}
                            onClick={() => addKeyword(keyword)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 text-neutral-300 text-[13px] font-medium rounded-full active:bg-white/20 transition-colors"
                        >
                            {keyword}
                        </button>
                    ))}
                </div>

                <div className="mb-4">
                    <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Расскажите подробнее..."
                        className="w-full bg-[#1C1C1E] border border-white/10 rounded-[20px] p-4 text-white placeholder-neutral-500 focus:border-[#0A84FF]/50 focus:outline-none transition-colors text-[15px] resize-none"
                    />
                </div>

                <GlassButton 
                    variant={sentiment === 'positive' ? 'primary' : 'secondary'}
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="!rounded-full h-[56px]"
                >
                    {isProcessing ? 'Отправка...' : 'Отправить отзыв'}
                </GlassButton>
            </div>
        </div>
    );
};
