
import React, { useEffect, useState } from 'react';
import { User, Review } from '../../../types';
import { Icons } from '../../../constants';
import { SwipeableWrapper } from '../../../components/SwipeableWrapper';
import { FloatingBackButton } from '../../../components/FloatingBackButton';
import { fetchUserReviews, subscribeToReviews } from '../../../services/api';

const RatingBlock: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div 
        className={`relative rounded-[24px] border-[0.5px] border-white/15 bg-white/5 backdrop-blur-[40px] shadow-[0_4px_24px_rgba(0,0,0,0.2)] overflow-hidden ${className}`}
    >
        {children}
    </div>
);

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => (
  <RatingBlock className="p-5 flex flex-col gap-3">
     <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-3">
           <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${review.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10`}>
              {review.name.charAt(0)}
           </div>
           <div>
              <p className="text-[17px] font-bold text-white leading-tight">{review.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                 {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < review.rating ? 'text-[#FFD60A]' : 'text-neutral-700'}>
                        <Icons.StarFill />
                    </span>
                 ))}
              </div>
           </div>
        </div>
        <span className="text-[13px] text-neutral-500 font-medium">{review.date}</span>
     </div>
     <p className="text-[15px] text-neutral-300 leading-relaxed font-medium relative z-10">
        {review.text}
     </p>
  </RatingBlock>
);

export const CourierRating: React.FC<{ user: User; onClose: () => void; backgroundSelector?: string }> = ({ user, onClose, backgroundSelector }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const loadReviews = async () => {
          const data = await fetchUserReviews(user.id);
          setReviews(data);
          setIsLoading(false);
      };
      
      // Initial Load
      loadReviews();

      // Subscribe to Realtime Updates
      const unsubscribe = subscribeToReviews(user.id, () => {
          loadReviews();
      });

      return () => {
          unsubscribe();
      };
  }, [user.id]);

  const completedCount = reviews.length; // Simply using reviews count as proxy for completion in this view

  return (
    <SwipeableWrapper onDismiss={onClose} zIndex={150} backgroundSelector={backgroundSelector}>
        <div className="flex flex-col h-full bg-black relative">
            <FloatingBackButton onClick={onClose} />

            <div 
                className="flex-1 overflow-y-auto scrolling-touch px-3"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 60px)', overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
            >
                <div style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                    {/* STATS */}
                    <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pb-2 px-1 pointer-events-none">
                        Статистика
                    </div>
                    <RatingBlock className="flex items-center gap-5 p-5 mb-6">
                        <div className="w-14 h-14 rounded-full bg-[#30D158]/10 text-[#30D158] flex items-center justify-center shadow-[0_0_15px_rgba(48,209,88,0.15)] border border-[#30D158]/20 relative z-10">
                            <Icons.Check />
                        </div>
                        <div className="relative z-10">
                            <span className="text-[32px] font-bold text-white block leading-none tracking-tight">
                                {isLoading ? '...' : completedCount}
                            </span>
                            <span className="text-[15px] font-medium text-neutral-500 mt-1 block">Отзывов получено</span>
                        </div>
                    </RatingBlock>

                    {/* REVIEWS LIST */}
                    <div>
                        <div className="text-[15px] font-bold text-neutral-400 uppercase tracking-wider pb-3 px-1">Отзывы</div>
                        {isLoading ? (
                            <div className="text-center py-10 text-neutral-500">Загрузка...</div>
                        ) : reviews.length > 0 ? (
                            <div className="space-y-3">
                                {reviews.map(review => (
                                    <ReviewItem key={review.id} review={review} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-neutral-500 bg-white/5 rounded-xl border border-white/5">
                                У вас пока нет отзывов.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </SwipeableWrapper>
  );
};
