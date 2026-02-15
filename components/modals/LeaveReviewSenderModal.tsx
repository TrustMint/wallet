
import React, { useState } from 'react';
import { Order } from '../../types';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';
import { StarRatingInput } from '../StarRatingInput';

interface LeaveReviewSenderModalProps {
    order: Order;
    onSubmit: (data: { rating: number; comment: string; tags: string[] }) => void;
    onClose: () => void;
}

// Keywords relevant for Sender reviewing Courier
const POSITIVE_KEYWORDS = ["Вежливый", "Быстро", "Аккуратно", "Пунктуальный", "Рекомендую"];
const NEGATIVE_KEYWORDS = ["Опоздал", "Грубый", "Повредил груз", "Не тот адрес", "Долго"];

export const LeaveReviewSenderModal: React.FC<LeaveReviewSenderModalProps> = ({ order, onSubmit, onClose }) => {
    const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const isFormValid = rating > 0 && (sentiment === 'positive' || comment.trim().length >= 5);

    const handleSentiment = (type: 'positive' | 'negative') => {
        setSentiment(type);
        // Auto-set rating based on sentiment, but allow user to change it later via stars
        setRating(type === 'positive' ? 5 : 1);
    };

    const handleSubmit = () => {
        if (!isFormValid) return;
        setIsProcessing(true);
        
        // Simulate network request
        setTimeout(() => {
            onSubmit({
                rating,
                comment,
                tags: [] 
            });
            onClose();
        }, 1000);
    };

    const addKeywordToComment = (keyword: string) => {
        setComment(prev => {
            if (prev.includes(keyword)) return prev;
            return prev ? `${prev}, ${keyword}` : keyword;
        });
    };

    const suggestedKeywords = sentiment === 'positive' ? POSITIVE_KEYWORDS : NEGATIVE_KEYWORDS;
    const InformationCircleIcon = Icons.Info;

    return (
        <div className="p-4 pt-0 pb-8">
            <div className="text-center mb-6 px-4">
                <h3 className="text-[22px] font-bold text-white tracking-tight mb-2">Оцените курьера</h3>
                <p className="text-[15px] text-neutral-400">
                    Как прошла доставка <span className="text-white font-medium">"{order.title}"</span>?
                </p>
            </div>

            {/* Thumbs Buttons (Reduced Size Plaques) */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => handleSentiment('positive')}
                    className={`flex-1 flex items-center justify-center gap-2.5 h-[52px] rounded-full border transition-all duration-300 active:scale-95 ${
                        sentiment === 'positive' 
                        ? 'bg-[#30D158]/20 border-[#30D158] shadow-[0_0_20px_rgba(48,209,88,0.2)]' 
                        : 'bg-[#1C1C1E] border-white/5 hover:bg-[#2C2C2E]'
                    }`}
                >
                    <div className={`transition-colors ${sentiment === 'positive' ? 'text-[#30D158]' : 'text-neutral-400'}`}>
                        <div className="scale-110"><Icons.ThumbsUp /></div>
                    </div>
                    <span className={`font-bold text-[14px] ${sentiment === 'positive' ? 'text-white' : 'text-neutral-400'}`}>
                        Всё отлично
                    </span>
                </button>

                <button
                    onClick={() => handleSentiment('negative')}
                    className={`flex-1 flex items-center justify-center gap-2.5 h-[52px] rounded-full border transition-all duration-300 active:scale-95 ${
                        sentiment === 'negative' 
                        ? 'bg-[#FF3B30]/20 border-[#FF3B30] shadow-[0_0_20px_rgba(255,59,48,0.2)]' 
                        : 'bg-[#1C1C1E] border-white/5 hover:bg-[#2C2C2E]'
                    }`}
                >
                    <div className={`transition-colors ${sentiment === 'negative' ? 'text-[#FF3B30]' : 'text-neutral-400'}`}>
                        <div className="scale-110"><Icons.ThumbsDown /></div>
                    </div>
                    <span className={`font-bold text-[14px] ${sentiment === 'negative' ? 'text-white' : 'text-neutral-400'}`}>
                        Есть проблемы
                    </span>
                </button>
            </div>

            {/* Expanded Section */}
            <div className={`grid transition-all duration-500 ease-in-out ${sentiment ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="pt-2 space-y-5">
                        
                        {/* Stars Input (Added inside expanded view) */}
                        <div className="flex justify-center pb-2">
                            <StarRatingInput rating={rating} onChange={setRating} size={42} />
                        </div>

                        {rating > 0 && rating < 4 && (
                            <div className="p-4 bg-yellow-500/10 text-yellow-300 text-xs rounded-[24px] flex items-start gap-3 text-left border border-yellow-500/20">
                                <div className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-400">
                                    <InformationCircleIcon />
                                </div>
                                <div>
                                    <strong className="font-semibold text-yellow-200">Важно:</strong>
                                    <p className="mt-1 leading-snug opacity-90">Отправьте честный отзыв. Если мы обнаружим неточности, то можем принять меры.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 justify-center">
                            {suggestedKeywords.map(keyword => (
                                <button 
                                    key={keyword}
                                    onClick={() => addKeywordToComment(keyword)}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-neutral-300 text-[13px] font-medium rounded-full active:bg-white/20 transition-colors"
                                >
                                    {keyword}
                                </button>
                            ))}
                        </div>
                        
                        <div>
                            <textarea
                                rows={3}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Расскажите о вашем опыте подробнее..."
                                className="w-full bg-[#1C1C1E] border border-white/10 rounded-[20px] p-4 text-white placeholder-neutral-500 focus:border-[#0A84FF]/50 focus:outline-none transition-colors text-[15px] resize-none"
                            />
                        </div>

                        <GlassButton 
                            variant={sentiment === 'positive' ? 'success' : 'primary'}
                            onClick={handleSubmit}
                            disabled={!isFormValid || isProcessing}
                            className={`!rounded-full h-[56px] ${!isFormValid ? 'opacity-50 grayscale' : ''}`}
                        >
                            {isProcessing ? 'Отправка...' : 'Отправить отзыв'}
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
