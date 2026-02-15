
import React from 'react';
import { Icons } from '../../constants';
import { GlassButton } from '../GlassCard';

interface AlertModalProps {
  title?: string;
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({ 
    title, 
    message, 
    type = 'error', 
    onClose,
    onConfirm,
    confirmText = 'OK'
}) => {
  const getIcon = () => {
      switch (type) {
          case 'success': return <Icons.Check />;
          case 'info': return <Icons.Info />;
          case 'error': 
          default: return <Icons.X />;
      }
  };

  const getColor = () => {
      switch (type) {
          case 'success': return '#30D158'; // Green
          case 'info': return '#0A84FF'; // Blue
          case 'error': 
          default: return '#FF3B30'; // Red
      }
  };

  const color = getColor();

  return (
    <div className="p-6 pt-2 pb-8 text-center">
       <div 
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-colors"
            style={{
                backgroundColor: `${color}1A`, // 10% opacity
                borderColor: `${color}33`,
                color: color
            }}
       >
          <div className="transform scale-150">
             {getIcon()}
          </div>
       </div>
       
       <h3 className="text-[22px] font-bold text-white mb-3 tracking-tight">
          {title || (type === 'error' ? 'Ошибка' : type === 'success' ? 'Успешно' : 'Внимание')}
       </h3>
       
       <p className="text-[16px] text-neutral-400 leading-relaxed font-medium mb-8 max-w-[90%] mx-auto whitespace-pre-wrap">
          {message}
       </p>

       <div className="flex gap-3">
           {onConfirm && (
                <GlassButton 
                    onClick={() => { onConfirm(); onClose(); }} 
                    className="!rounded-full flex-1"
                    style={{ backgroundColor: color }}
                >
                    {confirmText}
                </GlassButton>
           )}
           <GlassButton 
                variant="secondary" 
                onClick={onClose} 
                className="border border-white/5 !rounded-full flex-1"
           >
              {onConfirm ? 'Отмена' : 'Закрыть'}
           </GlassButton>
       </div>
    </div>
  );
};
