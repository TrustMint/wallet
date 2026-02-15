
import React, { useState, useRef } from 'react';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface CounterOfferModalProps {
  onSubmit: (price: number) => void;
  onClose: () => void;
  currentOrderPrice: number;
}

const PresetButton: React.FC<{ label: string; subLabel: string; onClick: () => void }> = ({ label, subLabel, onClick }) => (
    <button 
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center py-3 rounded-2xl bg-[#1C1C1E] border border-white/5 active:scale-95 active:bg-white/10 transition-all duration-200 group"
    >
        <span className="text-[#30D158] font-bold text-[15px] group-active:text-white transition-colors">{label}</span>
        <span className="text-[11px] text-neutral-500 font-medium mt-0.5">{subLabel}</span>
    </button>
);

export const CounterOfferModal: React.FC<CounterOfferModalProps> = ({ onSubmit, onClose, currentOrderPrice }) => {
  const [price, setPrice] = useState(currentOrderPrice);
  
  // Scrubber Logic Refs
  const scrubStartX = useRef<number>(0);
  const scrubStartVal = useRef<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const handleSubmit = () => {
    if (price > 0) {
      onSubmit(price);
      // Parent handles navigation
    }
  };

  const handleApplyPercent = (percent: number) => {
      const increased = currentOrderPrice * (1 + percent / 100);
      const rounded = Math.ceil(increased / 10) * 10;
      setPrice(rounded);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
  };

  // --- SCRUBBER LOGIC ---
  const handleScrubStart = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      scrubStartX.current = clientX;
      scrubStartVal.current = price;
      setIsScrubbing(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleScrubMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isScrubbing) return;
      e.stopPropagation();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const delta = clientX - scrubStartX.current;
      
      const stepValue = 5;
      const pxPerStep = 2;
      
      const steps = Math.floor(delta / pxPerStep);
      let newPrice = scrubStartVal.current + (steps * stepValue);
      
      if (newPrice < 100) newPrice = 100;
      newPrice = Math.round(newPrice / 10) * 10;

      if (newPrice !== price) {
          setPrice(newPrice);
          if (typeof navigator !== 'undefined' && navigator.vibrate && Math.abs(steps) % 5 === 0) {
               navigator.vibrate(5);
          }
      }
  };

  const handleScrubEnd = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
      setIsScrubbing(false);
  };

  const getPriceDiff = () => {
      const diff = price - currentOrderPrice;
      if (diff > 0) return `+${diff} ₽`;
      if (diff < 0) return `${diff} ₽`;
      return 'Тек. цена';
  };

  return (
    <div className="p-4 pt-0 pb-6">
       <div className="text-center mb-6 px-4">
          <h3 className="text-[24px] font-bold text-white tracking-tight mb-1">Предложить цену</h3>
          <p className="text-[15px] text-neutral-400">Настройте стоимость доставки</p>
       </div>

       {/* MAIN PRICE DISPLAY */}
       <div className="flex flex-col items-center justify-center mb-8 relative">
            <div className="relative z-10">
                <span className="text-[64px] font-bold text-white leading-none tracking-tighter tabular-nums">
                    {price.toLocaleString()}
                </span>
                <span className="text-[24px] text-neutral-500 font-medium ml-2">₽</span>
            </div>
            
            <div className={`mt-2 px-3 py-1 rounded-full text-[13px] font-bold transition-colors ${price > currentOrderPrice ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-white/10 text-neutral-400'}`}>
                {getPriceDiff()}
            </div>
       </div>

       {/* SCRUBBER - iOS COLORFUL STYLE */}
       <div className="mb-8 px-4">
            <div 
                className="relative w-full h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none transition-transform active:scale-95 overflow-hidden"
                style={{
                    background: 'linear-gradient(90deg, rgba(10, 132, 255, 0.15) 0%, rgba(191, 90, 242, 0.15) 100%)',
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 0 20px rgba(10, 132, 255, 0.1)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
                onTouchStart={handleScrubStart}
                onTouchMove={handleScrubMove}
                onTouchEnd={handleScrubEnd}
                onMouseDown={handleScrubStart}
                onMouseMove={handleScrubMove}
                onMouseUp={handleScrubEnd}
                onMouseLeave={handleScrubEnd}
            >
                <div className="absolute left-4 text-[#0A84FF]"><Icons.ChevronLeft /></div>
                
                {/* Colorful Ticks */}
                <div className="flex gap-1.5 items-center">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#0A84FF] to-[#BF5AF2] opacity-60"></div>
                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#0A84FF] to-[#BF5AF2]"></div>
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#0A84FF] to-[#BF5AF2] opacity-60"></div>
                </div>

                <div className="absolute right-4 text-[#BF5AF2]"><Icons.ChevronRight /></div>
                
                {isScrubbing && (
                    <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse pointer-events-none border border-white/20"></div>
                )}
            </div>
            <p className="text-center text-[11px] text-neutral-500 mt-2 font-medium">Свайп для точной настройки</p>
       </div>

       {/* PRESETS */}
       <div className="flex gap-3 mb-8">
           <PresetButton 
                label="+15%" 
                subLabel={`${(Math.ceil((currentOrderPrice * 1.15) / 10) * 10).toLocaleString()} ₽`} 
                onClick={() => handleApplyPercent(15)} 
           />
           <PresetButton 
                label="+30%" 
                subLabel={`${(Math.ceil((currentOrderPrice * 1.30) / 10) * 10).toLocaleString()} ₽`} 
                onClick={() => handleApplyPercent(30)} 
           />
           <PresetButton 
                label="+50%" 
                subLabel={`${(Math.ceil((currentOrderPrice * 1.50) / 10) * 10).toLocaleString()} ₽`} 
                onClick={() => handleApplyPercent(50)} 
           />
       </div>
       
       <div className="space-y-3">
          <GlassButton 
            variant="primary" 
            onClick={handleSubmit} 
            className="!rounded-full h-[56px] shadow-[0_0_30px_rgba(10,132,255,0.3)]"
          >
            Предложить {price.toLocaleString()} ₽
          </GlassButton>
          
          <button 
            onClick={onClose}
            className="w-full py-3 text-[15px] font-medium text-neutral-500 hover:text-white transition-colors"
          >
            Отмена
          </button>
       </div>
    </div>
  );
};
