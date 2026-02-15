
import React, { useRef } from 'react';
import { Icons } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative rounded-[28px] p-4 transition-transform duration-200 overflow-hidden border border-white/15 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] active:bg-white/10' : ''}`}
    >
      <div className="absolute inset-0 bg-[#1C1C1E] -z-10"></div>
      {/* Replicating OrderCard's shadows */}
      <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),inset_0_-1px_0_0_rgba(255,255,255,0.08)] rounded-[28px] pointer-events-none -z-10"></div>
      <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] rounded-[28px] pointer-events-none -z-10"></div>
      {children}
    </div>
  );
};

export const GlassInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const { className, value, onChange, ...rest } = props;
  
  const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Create a synthetic event to trigger onChange
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(e.target, '');
      
      const event = {
          target: { value: '' },
          currentTarget: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      
      if (onChange) onChange(event);
  };

  return (
    <div className="relative w-full group">
        <input 
          value={value}
          onChange={onChange}
          {...rest}
          className={`w-full bg-[#1C1C1E] border border-white/10 rounded-[12px] py-4 pl-4 pr-10 text-[17px] text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-all ${className}`}
          style={{ WebkitAppearance: 'none' }}
        />
        {value && String(value).length > 0 && !props.disabled && !props.readOnly && (
            <button
                type="button"
                onClick={(e) => {
                    if (onChange) onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#2C2C2E] flex items-center justify-center text-black active:bg-white/20 transition-colors z-10"
            >
                <div className="scale-[0.39]"><Icons.X /></div>
            </button>
        )}
    </div>
  );
};

export const GlassButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success', style?: React.CSSProperties }> = ({ children, variant = 'primary', style, ...props }) => {
  const variants = {
    primary: 'bg-[#007AFF] text-white active:bg-[#0062cc]',
    secondary: 'bg-[#2C2C2E] text-[#0A84FF] active:bg-[#3A3A3C]',
    danger: 'bg-[#FF3B30] text-white active:bg-[#D73329]',
    success: 'bg-[#30D158] text-white active:bg-[#28b84d]'
  };

  return (
    <button 
      {...props}
      style={{
          ...style,
          // Fix visual bleeding by enforcing clipping
          overflow: 'hidden',
          isolation: 'isolate' 
      }}
      className={`w-full py-[14px] px-6 rounded-[14px] text-[17px] font-semibold leading-snug tracking-tight transition-all active:opacity-70 active:scale-[0.98] flex items-center justify-center gap-2 transform-gpu ${variants[variant]} ${props.className}`}
    >
      <div className="relative z-10 flex items-center gap-2">{children}</div>
    </button>
  );
};

// --- NEW LIQUID ICON BUTTON ---
interface LiquidIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    badge?: number;
    size?: number; // size in px, defaults to 64
    animationType?: 'squash' | 'grow'; // New prop to control animation style
}

export const LiquidIconButton: React.FC<LiquidIconButtonProps> = ({ icon, badge, onClick, className = '', size = 64, animationType = 'squash', style, ...props }) => {
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleTouchStart = () => {
        if (!btnRef.current) return;
        
        if (animationType === 'grow') {
            btnRef.current.style.transition = 'transform 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)'; 
            btnRef.current.style.transform = 'scale(1.15)'; 
        } else {
            btnRef.current.style.transition = 'transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)';
            btnRef.current.style.transform = 'scale(1.25, 0.75) translateY(4px)';
        }
    };

    const handleTouchEnd = () => {
        if (!btnRef.current) return;
        
        if (animationType === 'grow') {
            btnRef.current.style.transition = 'transform 0.5s cubic-bezier(0.3, 1.5, 0.4, 1)'; 
            btnRef.current.style.transform = 'scale(1)';
        } else {
            btnRef.current.style.transition = 'transform 1.2s cubic-bezier(0.3, 2.0, 0.4, 0.8)';
            btnRef.current.style.transform = 'scale(1, 1) translateY(0px)';
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        handleTouchEnd();
        if (onClick) onClick(e);
    };

    return (
        <button
            ref={btnRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onClick={handleClick}
            // Removed overflow-hidden from parent button to let badge stick out
            className={`pointer-events-auto rounded-full flex items-center justify-center text-white transition-transform relative ${className}`}
            style={{ 
                width: size,
                height: size,
                transformOrigin: 'center center', 
                ...style
            }}
            {...props}
        >
            {/* Background Container (Clipped) */}
            <div 
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                    backgroundColor: 'rgba(20, 20, 20, 0.4)', 
                    WebkitBackdropFilter: 'blur(5px)',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.6), inset 0 10px 20px rgba(255,255,255,0.03)',
                }}
            >
                {/* Top-Left Glare */}
                <div 
                    className="absolute inset-0 rounded-full pointer-events-none z-0"
                    style={{
                        boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)',
                        maskImage: 'linear-gradient(135deg, black 0%, transparent 65%)',
                        WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 65%)'
                    }}
                ></div>

                {/* Bottom-Right Glare */}
                <div 
                    className="absolute inset-0 rounded-full pointer-events-none z-0"
                    style={{
                        boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)',
                        maskImage: 'linear-gradient(315deg, black 0%, transparent 65%)',
                        WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 65%)'
                    }}
                ></div>
            </div>

            <div className="relative z-10">
                {icon}
            </div>
            
            {/* Badge - Position updated to be slightly more inward (top-0 right-0) */}
            {badge && badge > 0 && (
               <div className="absolute top-0 right-0 w-5 h-5 bg-[#0A84FF] rounded-full flex items-center justify-center text-[10px] font-bold border border-black z-20 shadow-md">
                   {badge}
               </div>
            )}
        </button>
    );
};
