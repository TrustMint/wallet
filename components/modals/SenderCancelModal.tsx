
import React, { useState } from 'react';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface SenderCancelModalProps {
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

const REASONS = [
  'Нашел другого курьера',
  'Передумал отправлять',
  'Ошибка в адресе',
  'Слишком высокая цена',
  'Другое'
];

export const SenderCancelModal: React.FC<SenderCancelModalProps> = ({ onSubmit, onClose }) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason);
      onClose();
    }
  };

  return (
    <div className="p-4 pt-0 pb-8">
       <div className="text-center mb-6 px-4">
          <div className="w-16 h-16 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4 text-[#FF3B30] border border-[#FF3B30]/20 shadow-[0_0_20px_rgba(255,59,48,0.15)]">
            <Icons.X />
          </div>
          <h3 className="text-[22px] font-bold text-white tracking-tight mb-2">Отмена отправки</h3>
          <p className="text-[15px] text-neutral-400">Укажите причину отмены заказа.</p>
       </div>

       <div className="space-y-2.5 mb-8">
          {REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className={`relative w-full text-left px-5 py-4 !rounded-[24px] border transition-all duration-300 active:scale-[0.98] flex items-center justify-between group ${
                selectedReason === reason 
                  ? 'bg-[#0A84FF]/10 border-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.2)]' 
                  : 'bg-[#1C1C1E] border-white/5 hover:bg-[#2C2C2E]'
              }`}
            >
              <span className={`font-medium text-[15px] transition-colors ${selectedReason === reason ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                {reason}
              </span>
              
              <div className={`transition-all duration-300 transform ${
                  selectedReason === reason 
                    ? 'opacity-100 scale-100 text-[#0A84FF]' 
                    : 'opacity-0 scale-50'
              }`}>
                 <Icons.Check />
              </div>
            </button>
          ))}
       </div>

       <div className="space-y-3">
          <GlassButton 
            variant="danger" 
            onClick={handleSubmit} 
            disabled={!selectedReason}
            className={`h-[76px] shadow-[0_0_20px_rgba(255,59,48,0.3)] transition-all duration-300 !rounded-full ${!selectedReason ? 'opacity-50 grayscale scale-95' : 'scale-100'}`}
          >
            Подтвердить отмену
          </GlassButton>
          <button 
            onClick={onClose}
            className="w-full py-3 text-[15px] font-medium text-neutral-500 hover:text-white transition-colors !rounded-full active:bg-white/5"
          >
            Вернуться назад
          </button>
       </div>
    </div>
  );
};
