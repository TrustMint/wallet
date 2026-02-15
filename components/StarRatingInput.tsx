
import React, { useState } from 'react';
import { Icons } from '../constants';

interface StarRatingInputProps {
    rating: number;
    onChange: (rating: number) => void;
    size?: number; // size in px
}

export const StarRatingInput: React.FC<StarRatingInputProps> = ({ rating, onChange, size = 48 }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const stars = [1, 2, 3, 4, 5];

    return (
        <div className="flex gap-2 justify-center touch-manipulation">
            {stars.map((star) => {
                const isActive = star <= (hoverRating || rating);
                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onTouchStart={() => setHoverRating(star)}
                        onTouchEnd={() => setHoverRating(0)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className={`transition-transform duration-200 active:scale-90 ${isActive ? 'scale-110' : 'scale-100 opacity-40'}`}
                        style={{ width: size, height: size }}
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill={isActive ? "#FFD60A" : "currentColor"} 
                            stroke={isActive ? "none" : "currentColor"}
                            strokeWidth="1.5"
                            className="w-full h-full text-white"
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
};
