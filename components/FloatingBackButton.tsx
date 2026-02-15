
import React from 'react';

interface FloatingBackButtonProps {
  onClick: () => void;
  zIndex?: number;
}

// Thicker Chevron for the icon (strokeWidth 2.5)
const ThickChevronLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6"/>
    </svg>
);

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({ onClick, zIndex = 50 }) => {
  return (
    <div 
        className="absolute top-0 left-0 pt-[calc(env(safe-area-inset-top)+12px)] pl-3 pointer-events-none"
        style={{ zIndex }}
    >
        <button
            onClick={onClick}
            // Updated animation: active:scale-110 (grow) instead of shrink
            className="pointer-events-auto rounded-full flex items-center justify-center text-white transition-transform relative active:scale-110 duration-200"
            style={{ 
                // Increased size by ~10% (42px -> 46px)
                width: 46,
                height: 46,
                // Exact Modal Glass Style
                backgroundColor: 'rgba(20, 20, 20, 0.4)',
                WebkitBackdropFilter: 'blur(5px)',
                backdropFilter: 'blur(5px)',
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
            }}
        >
            <div className="relative z-10">
                <ThickChevronLeft />
            </div>
        </button>
    </div>
  );
};
