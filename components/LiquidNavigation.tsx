
import React from 'react';
import { UserRole, ViewType } from '../types';
import { Icons } from '../constants';

interface LiquidNavigationProps {
    userRole: UserRole;
    currentView: ViewType;
    viewStack: ViewType[];
    onNavigate: (view: ViewType) => void;
}

export const LiquidNavigation: React.FC<LiquidNavigationProps> = ({ userRole, currentView, viewStack, onNavigate }) => {

    const triggerHaptic = () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
            }
        } catch (e) {}
    };

    const handleNavigate = (view: ViewType) => {
        // Если мы уже на этой вкладке, скроллим вверх
        if (viewStack.includes(view) && viewStack[0] === view && viewStack.length === 1) {
             const scrollContainer = document.querySelector('.view-scroll-container');
             if (scrollContainer && scrollContainer.scrollTop > 0) {
                 scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                 return;
             }
        }

        triggerHaptic();
        onNavigate(view);
    };

    const NavItem = ({ view, icon, label }: { view: ViewType, icon: React.ReactNode, label: string }) => {
        // Проверяем, активна ли эта секция
        const isActive = viewStack.includes(view);

        return (
            <button
                onClick={() => handleNavigate(view)}
                className="flex-1 flex flex-col items-center justify-center h-full relative group pt-2 pb-1"
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {/* Icon Container */}
                <div 
                    className={`transition-all duration-300 ease-out mb-1 ${
                        isActive ? 'text-[#0A84FF] -translate-y-0.5' : 'text-white/40 translate-y-0.5'
                    }`}
                >
                    {icon}
                </div>
                
                {/* Label - Always Visible */}
                <span 
                    className={`text-[10px] font-bold tracking-wide transition-colors duration-300 ${
                        isActive ? 'text-[#0A84FF]' : 'text-white/40'
                    }`}
                >
                    {label}
                </span>
            </button>
        )
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none">
            {/* The Panel Container - MATCHING MODAL GLASS STYLE EXACTLY */}
            <div
                className="w-full pointer-events-auto"
                style={{
                    backgroundColor: 'rgba(20, 20, 20, 0.4)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    border: '0.5px solid rgba(255, 255, 255, 0.1)',
                    borderBottom: 'none', // Remove bottom border since it touches the edge
                    borderTopLeftRadius: '32px',
                    borderTopRightRadius: '32px',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.6)', 
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    height: 'calc(84px + env(safe-area-inset-bottom))'
                }}
            >
                <div className="flex items-center justify-around h-[84px] px-6">
                    {userRole === UserRole.COURIER ? (
                        <>
                            <NavItem view="ORDERS_LIST" icon={<Icons.List />} label="Заказы" />
                            <NavItem view="WALLET" icon={<Icons.Wallet />} label="Финансы" />
                            <NavItem view="PROFILE" icon={<Icons.User />} label="Профиль" />
                        </>
                    ) : (
                        <>
                            <NavItem view="DASHBOARD" icon={<Icons.MapPin />} label="Отправить" />
                            <NavItem view="HISTORY" icon={<Icons.History />} label="История" />
                            <NavItem view="PROFILE" icon={<Icons.User />} label="Профиль" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
