
import React from 'react';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface DraftModalProps {
  onRestore: () => void;
  onDiscard: () => void;
  onClose: () => void; // Usually just to close modal if needed
}

export const DraftModal: React.FC<DraftModalProps> = ({ onRestore, onDiscard, onClose }) => {
  return (
    <div className="p-6 pt-2 pb-8 text-center">
       <div 
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.3)] bg-[#0A84FF]/10 border-[#0A84FF]/30 text-[#0A84FF]"
       >
          <div className="transform scale-125">
             <Icons.Edit />
          </div>
       </div>
       
       <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">
          Продолжить заполнение?
       </h3>
       
       <p className="text-[16px] text-neutral-400 leading-relaxed font-medium mb-8 max-w-[90%] mx-auto">
          У вас остался незавершенный заказ. Хотите восстановить данные или начать заново?
       </p>

       <div className="space-y-3">
           <GlassButton 
                onClick={onRestore} 
                className="!rounded-full shadow-[0_0_20px_rgba(10,132,255,0.3)]"
           >
                Восстановить черновик
           </GlassButton>
           <button 
                onClick={onDiscard} 
                className="w-full py-3.5 text-[15px] font-medium text-neutral-500 hover:text-[#FF3B30] transition-colors"
           >
              Начать заново
           </button>
       </div>
    </div>
  );
};
