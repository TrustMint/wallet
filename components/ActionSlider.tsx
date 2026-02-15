
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';

interface ActionSliderProps {
  label: string;
  icon: React.ReactNode;
  mainColor: string; // HEX Color (e.g. #0A84FF)
  onConfirm: () => void;
  className?: string;
}

export const ActionSlider: React.FC<ActionSliderProps> = ({ label, icon, mainColor, onConfirm, className = '' }) => {
  const [dragX, setDragX] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSquashing, setIsSquashing] = useState(false);
  
  // Physics states
  const [returnDuration, setReturnDuration] = useState(0.2);
  const [impactIntensity, setImpactIntensity] = useState(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Knob size and padding configuration
  const KNOB_SIZE = 68; 
  const PADDING = 4;

  useEffect(() => {
    if (sliderRef.current) {
      setSliderWidth(sliderRef.current.offsetWidth);
    }
  }, []);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isConfirmed || isSquashing) return;
    
    const target = e.target as HTMLElement;
    if (knobRef.current && !knobRef.current.contains(target)) {
        return;
    }

    setIsDragging(true);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || isConfirmed || !sliderRef.current) return;

    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const maxDrag = rect.width - KNOB_SIZE - (PADDING * 2);
    
    let newX = clientX - rect.left - (KNOB_SIZE / 2) - PADDING;

    if (newX < 0) newX = 0;
    if (newX > maxDrag) newX = maxDrag;

    setDragX(newX);
  };

  const handleEnd = () => {
    if (!isDragging || isConfirmed || !sliderRef.current) return;
    setIsDragging(false);

    const rect = sliderRef.current.getBoundingClientRect();
    const maxDrag = rect.width - KNOB_SIZE - (PADDING * 2);
    
    // REQUIREMENT: 100% Drag. 
    // We allow a tiny 2px tolerance for touch sensor inaccuracies, 
    // but visually it must look like it hit the end.
    const threshold = maxDrag - 2;

    if (dragX >= threshold) {
      setDragX(maxDrag);
      setIsConfirmed(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      onConfirm();
    } else {
      // --- PHYSICS CALCULATION ---
      // 1. Calculate intensity (0.0 to 1.0) based on how far it was pulled
      const ratio = Math.min(1, dragX / maxDrag);
      setImpactIntensity(ratio);

      // 2. Calculate return duration based on distance (Spring Physics).
      // INCREASED SPEED: High tension rubber band feel.
      // A full width snap now takes ~0.18s max (very fast).
      const calculatedDuration = Math.max(0.1, ratio * 0.18);
      setReturnDuration(calculatedDuration);

      setDragX(0);
      // Squash animation triggered via onTransitionEnd
    }
  };

  // Trigger squash animation EXACTLY when the knob hits the wall (transition ends)
  const handleTransitionEnd = (e: React.TransitionEvent) => {
      // Only trigger if we are returning to 0, not dragging, and not confirmed
      if (e.propertyName === 'transform' && dragX === 0 && !isDragging && !isConfirmed) {
          // Trigger impact only if there was enough intensity (> 5%)
          if (impactIntensity > 0.05) {
              setIsSquashing(true);
              // Impact haptic: stronger vibration for harder hits
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  // Short, sharp thud
                  navigator.vibrate(Math.floor(15 + (15 * impactIntensity)));
              }
          }
      }
  };

  const wipeMask = `linear-gradient(90deg, rgba(0,0,0,0.25) ${dragX + 20}px, black ${dragX + 130}px)`;

  return (
    <div 
        ref={sliderRef}
        data-no-swipe="true"
        // Removed overflow-hidden here to allow shadow to breathe naturally
        className={`relative h-[76px] rounded-full select-none touch-none border border-white/10 backdrop-blur-xl transform-gpu ${className}`}
        style={{
            backgroundColor: `${mainColor}33`, 
            boxShadow: `0 0 20px ${mainColor}22, inset 0 1px 0 0 rgba(255,255,255,0.1)`
        }}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
    >
        {/* Inner container to clip the mask/text if necessary, though maskImage usually handles it */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
            <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 pl-14"
                style={{ 
                    maskImage: wipeMask,
                    WebkitMaskImage: wipeMask
                }}
            >
                 <span className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2" style={{
                     maskImage: 'linear-gradient(-75deg, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 70%)',
                     WebkitMaskImage: 'linear-gradient(-75deg, rgba(0,0,0,1) 30%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 70%)',
                     maskSize: '200%',
                     WebkitMaskSize: '200%',
                     animation: 'shimmer-mask 2s infinite linear'
                 }}>
                     {label} 
                     <span className="opacity-70 text-[12px]">»</span>
                 </span>
            </div>
        </div>

        <div 
            ref={knobRef}
            onTransitionEnd={handleTransitionEnd}
            onAnimationEnd={() => setIsSquashing(false)}
            className={`absolute top-[3px] left-[3px] w-[68px] h-[68px] rounded-full flex items-center justify-center z-10 cursor-grab active:cursor-grabbing border border-white/10 ${isSquashing ? 'animate-dynamic-squash' : ''}`}
            style={{
                transform: `translateX(${dragX}px)`,
                // CSS Variable Injection for Animation
                // @ts-ignore
                '--impact-intensity': impactIntensity,
                
                // Transition Logic:
                transition: isDragging 
                    ? 'none' 
                    : `transform ${returnDuration}s cubic-bezier(0.15, 0.85, 0.35, 1)`,
                
                backgroundColor: `${mainColor}FC`, // 99% Opacity
                backdropFilter: 'blur(50px)',
                WebkitBackdropFilter: 'blur(50px)',
                // Updated shadow to be simpler and cleaner
                boxShadow: `0 0 25px ${mainColor}55, inset 0 1px 0 0 rgba(255,255,255,0.4)`,
                color: '#fff',
            }}
        >
            {isConfirmed ? (
                <div className="animate-spin"><Icons.RefreshCw /></div>
            ) : (
                icon
            )}
        </div>
        
        <style>{`
          @keyframes shimmer-mask {
            0% { -webkit-mask-position: 150%; mask-position: 150%; }
            100% { -webkit-mask-position: -50%; mask-position: -50%; }
          }
          /* Dynamic squash that relies on CSS variable --impact-intensity */
          @keyframes dynamic-squash {
            0% { 
                transform: translateX(0) scale(1); 
            }
            25% { 
                /* Squash X based on intensity. Faster peak (25% instead of 30%) */
                transform: translateX(calc(-8px * var(--impact-intensity))) scale(calc(1 - (0.2 * var(--impact-intensity))), calc(1 + (0.2 * var(--impact-intensity)))); 
            } 
            60% { 
                /* Rebound slightly out */
                transform: translateX(calc(3px * var(--impact-intensity))) scale(calc(1 + (0.1 * var(--impact-intensity))), calc(1 - (0.1 * var(--impact-intensity)))); 
            } 
            100% { 
                transform: translateX(0) scale(1); 
            }
          }
          .animate-dynamic-squash {
            /* Reduced duration from 0.4s to 0.25s for snappier feel */
            animation: dynamic-squash 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
        `}</style>
    </div>
  );
};
