
import React from 'react';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface StatusModalProps {
  status: 'active' | 'busy' | string;
  onClose: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ status, onClose }) => {
  // Fix: Check for lowercase 'active' which matches the app state
  const isActive = status === 'active' || status === 'ACTIVE';

  return (
    <div className="p-4 pt-2 text-center pb-8">
       <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-colors ${isActive ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20' : 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20'}`}>
          <div className="transform scale-150">
             {isActive ? <Icons.Check /> : <Icons.X />}
          </div>
       </div>
       <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">
          {isActive ? 'Вы онлайн' : 'Вы оффлайн'}
       </h3>
       <p className="text-[16px] text-neutral-400 leading-relaxed font-medium mb-8 max-w-[80%] mx-auto">
          {isActive ? 'Теперь вы видите новые заказы и получаете уведомления.' : 'Заказы временно скрыты. Вы не будете получать уведомления.'}
       </p>
       <GlassButton variant="secondary" onClick={onClose} className="border border-white/5 !rounded-full">
          Понятно
       </GlassButton>
    </div>
  );
};
