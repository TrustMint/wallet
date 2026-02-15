
import React, { useRef, useState } from 'react';
import { User, UserRole, ViewType } from '../../../types';
import { Icons } from '../../../constants';
import { uploadAvatar } from '../../../services/api';

// Shared components with 24px radius, lighter background (#1C1C1E)
const ProfileBlock: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }> = ({ children, className = '', onClick, style }) => (
    <div 
        onClick={onClick}
        style={style}
        className={`relative rounded-[24px] bg-[#1C1C1E] overflow-hidden ${className} ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''}`}
    >
        {children}
    </div>
);

// Updated MenuRow: Larger container (34px), Larger icon (scale 0.59), Taller row (56px), Radius 10px
const MenuRow: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    subLabel?: string; 
    onClick?: () => void; 
    isLast?: boolean; 
    destructive?: boolean;
    color?: string;
}> = ({ icon, label, subLabel, onClick, isLast, destructive, color = '#FFFFFF' }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between py-3 pr-4 pl-4 active:bg-[#2C2C2E] transition-colors group relative h-[56px]"
    >
        <div className="flex items-center gap-3.5">
            {/* Lighter Black Square Icon Container with Glare - Updated to #171717 */}
            <div 
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0 relative overflow-hidden bg-[#171717]"
            >
                {/* Top-Left Glare */}
                <div 
                    className="absolute inset-0 rounded-[10px] pointer-events-none z-10"
                    style={{
                        boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.2)',
                        maskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
                        WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 60%)'
                    }}
                ></div>
                
                {/* Bottom-Right Glare */}
                <div 
                    className="absolute inset-0 rounded-[10px] pointer-events-none z-10"
                    style={{
                        boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.2)',
                        maskImage: 'linear-gradient(315deg, black 0%, transparent 60%)',
                        WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 60%)'
                    }}
                ></div>

                {/* Icon: Increased scale to 0.59 */}
                <div 
                    className={`scale-[0.59] flex justify-center transition-colors relative z-20 ${destructive ? 'text-[#FF3B30]' : ''}`}
                    style={{ color: destructive ? undefined : color }}
                >
                    {icon}
                </div>
            </div>
            <span className={`text-[17px] font-medium leading-snug ${destructive ? 'text-[#FF3B30]' : 'text-white'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {subLabel && <span className="text-[17px] text-neutral-500">{subLabel}</span>}
            <div className="text-neutral-500/50 group-active:text-neutral-500">
                <Icons.ChevronRight />
            </div>
        </div>
        {!isLast && (
            // Separator adjusted for larger icon gap
            <div className="absolute bottom-0 left-[62px] right-4 h-[1px] bg-[#2C2C2E]"></div>
        )}
    </button>
);

const ProfileActionButton: React.FC<{
    onClick: () => void;
    label: string;
    icon?: React.ReactNode;
    color: string;
}> = ({ onClick, label, icon, color }) => {
    const glassButtonStyle = {
        backgroundColor: `${color}33`,
        boxShadow: `0 20px 40px -10px ${color}33`,
    };

    return (
        <div
            onClick={onClick}
            className="relative rounded-[24px] p-3.5 transition-transform duration-200 overflow-hidden cursor-pointer active:scale-[0.98] backdrop-blur-[40px]"
            style={glassButtonStyle}
        >
            {/* Top-Left Glare */}
            <div
                className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                style={{
                    boxShadow: 'inset 1px 1px 0 0 rgba(255,255,255,0.4)',
                    maskImage: 'linear-gradient(135deg, black 0%, transparent 75%)',
                    WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 75%)'
                }}
            ></div>
            {/* Bottom-Right Glare */}
            <div
                className="absolute inset-0 rounded-[24px] pointer-events-none z-0"
                style={{
                    boxShadow: 'inset -1px -1px 0 0 rgba(255,255,255,0.4)',
                    maskImage: 'linear-gradient(315deg, black 0%, transparent 75%)',
                    WebkitMaskImage: 'linear-gradient(315deg, black 0%, transparent 75%)'
                }}
            ></div>
            <div className="flex items-center gap-3 relative z-10 justify-center h-[36px]">
                {icon && <div className="text-white">{icon}</div>}
                <h3 className="text-[17px] font-bold text-white">{label}</h3>
            </div>
        </div>
    );
};

interface SenderProfileProps {
    user: User;
    onSwitchRole: (role: UserRole) => void;
    onLogout: () => void;
    onNavigate: (view: ViewType) => void;
}

export const SenderProfile: React.FC<SenderProfileProps> = ({ user, onSwitchRole, onLogout, onNavigate }) => {
  const targetRole = UserRole.COURIER;
  const switchLabel = 'Войти как Курьер';
  const switchColor = '#A855F7'; 
  const ratingPercent = Math.round((user.rating / 5) * 100);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
          alert('Пожалуйста, выберите изображение');
          return;
      }
      if (file.size > 5 * 1024 * 1024) {
          alert('Файл слишком большой (макс 5МБ)');
          return;
      }

      setIsUploading(true);
      try {
          await uploadAvatar(user.id, file);
      } catch (err) {
          console.error(err);
          alert('Ошибка загрузки фото');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div 
        className="view-scroll-container w-full h-full overflow-y-auto scrolling-touch px-4"
        style={{ overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
    >
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
        />

        <div className="fixed inset-0 pointer-events-none -z-10">
             <div className="absolute top-[-10%] center w-[80%] h-[40%] bg-[#A855F7]/20 blur-[100px] rounded-full opacity-60"></div>
        </div>

        <div className="space-y-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 20px)', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
            
            <div className="flex flex-col items-center pt-8 pb-4 relative">
                <div 
                    className="relative mb-4 group cursor-pointer active:scale-95 transition-transform"
                    onClick={handleAvatarClick}
                >
                    <div className="w-28 h-28 rounded-full overflow-hidden relative z-10 bg-black/20 border-2 border-white/10">
                        {isUploading ? (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                                <Icons.Camera />
                            </div>
                        )}
                        <img src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                    </div>
                </div>
                
                <h2 className="text-[32px] font-bold tracking-tight text-white leading-tight">{user.name}</h2>
                <p className="text-[15px] text-neutral-500 mt-1">{user.phone || user.email}</p>
            </div>

            <div>
                <ProfileBlock>
                    <MenuRow color="#0A84FF" icon={<Icons.User />} label="Личные данные" onClick={() => onNavigate('PROFILE_PERSONAL')} />
                    <MenuRow color="#BF5AF2" icon={<Icons.FileText />} label="Документы" onClick={() => onNavigate('PROFILE_DOCS')} />
                    <MenuRow color="#64D2FF" icon={<Icons.CreditCard />} label="Способы оплаты" onClick={() => onNavigate('PROFILE_PAYMENT_METHODS')} />
                    <MenuRow color="#FF375F" icon={<Icons.MapPin />} label="Сохраненные адреса" isLast onClick={() => onNavigate('PROFILE_SAVED_ADDRESSES')} />
                </ProfileBlock>
            </div>

            <div>
                <ProfileBlock>
                    <MenuRow 
                        color="#FFD60A"
                        icon={<Icons.Star />} 
                        label="Ваш рейтинг" 
                        subLabel={`${ratingPercent}%`} 
                        isLast 
                        onClick={() => onNavigate && onNavigate('RATING')} 
                    />
                </ProfileBlock>
            </div>

            <div>
                <ProfileBlock>
                    <MenuRow color="#30D158" icon={<Icons.Shield />} label="Безопасность" onClick={() => onNavigate('PROFILE_SECURITY')} />
                    <MenuRow color="#64D2FF" icon={<Icons.Message />} label="Поддержка" isLast onClick={() => onNavigate('PROFILE_SUPPORT')} />
                </ProfileBlock>
            </div>
            
            <div>
                <ProfileBlock>
                    <MenuRow color="#FF2D55" icon={<Icons.MapPin />} label="Ваш город" subLabel={user.city || 'Москва'} isLast onClick={() => onNavigate('PROFILE_CITY')} />
                </ProfileBlock>
            </div>

            <div className="pt-8 space-y-4 pb-8">
                <ProfileActionButton
                    onClick={() => onSwitchRole(targetRole)}
                    label={switchLabel}
                    icon={<Icons.RefreshCw />}
                    color={switchColor}
                />
                <ProfileActionButton
                    onClick={onLogout}
                    label="Выйти из аккаунта"
                    color="#FF3B30"
                />
            </div>
        </div>
    </div>
  );
};
