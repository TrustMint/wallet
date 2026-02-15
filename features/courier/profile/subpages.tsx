
import React, { useState } from 'react';
import { User, UserRole } from '../../../types';
import { Icons } from '../../../constants';
import { GlassCard, GlassButton, LiquidIconButton, GlassInput } from '../../../components/GlassCard';
import { SwipeableWrapper } from '../../../components/SwipeableWrapper';
import { FloatingBackButton } from '../../../components/FloatingBackButton';
import { useModal } from '../../../hooks/useModal';
import { initiateContactChange, verifyContactChange } from '../../../services/api';

// --- SHARED WRAPPER ---
const SubPageWrapper: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; backgroundSelector?: string }> = ({ title, onClose, children, backgroundSelector }) => (
    <SwipeableWrapper onDismiss={onClose} zIndex={150} backgroundSelector={backgroundSelector}>
        <div className="flex flex-col h-full bg-black relative">
            <FloatingBackButton onClick={onClose} />
            
            <div 
                className="flex-1 overflow-y-auto scrolling-touch px-4 pb-20"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 60px)', overscrollBehaviorY: 'none', touchAction: 'pan-y' }}
            >
                <div className="text-[28px] font-bold text-white pb-6 px-1 pointer-events-none">
                    {title}
                </div>
                {children}
            </div>
        </div>
    </SwipeableWrapper>
);

// --- CHANGE CONTACT MODAL ---
const ChangeContactModal: React.FC<{ 
    type: 'email' | 'phone'; 
    currentValue: string; 
    onClose: () => void; 
    onSuccess: () => void;
}> = ({ type, currentValue, onClose, onSuccess }) => {
    const [step, setStep] = useState<'INPUT' | 'VERIFY'>('INPUT');
    const [newValue, setNewValue] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, ''); 
        let formatted = '';
        if (input.length === 0) { setNewValue(''); return; }
        
        let digits = input;
        if (input[0] === '8') digits = '7' + input.slice(1);
        if (input[0] !== '7') digits = '7' + input;
        digits = digits.substring(0, 11);

        formatted = '+7';
        if (digits.length > 1) formatted += ` (${digits.substring(1, 4)}`;
        if (digits.length > 4) formatted += `) ${digits.substring(4, 7)}`;
        if (digits.length > 7) formatted += `-${digits.substring(7, 9)}`;
        if (digits.length > 9) formatted += `-${digits.substring(9, 11)}`;
        setNewValue(formatted);
    };

    const handleSendCode = async () => {
        setError(null);
        if (!newValue) return setError('Заполните поле');
        if (type === 'phone' && newValue.length < 18) return setError('Введите полный номер');
        if (type === 'email' && !newValue.includes('@')) return setError('Некорректный email');

        setIsLoading(true);
        try {
            await initiateContactChange(type, newValue);
            setStep('VERIFY');
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Ошибка отправки кода');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setError(null);
        if (code.length < 6) return setError('Код слишком короткий');
        
        setIsLoading(true);
        try {
            await verifyContactChange(type, newValue, code);
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            setError('Неверный код подтверждения');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 pt-2 pb-8">
            <h3 className="text-[22px] font-bold text-white mb-2 text-center">
                {step === 'INPUT' 
                    ? `Смена ${type === 'email' ? 'почты' : 'телефона'}` 
                    : 'Подтверждение'}
            </h3>
            <p className="text-[15px] text-neutral-400 text-center mb-6">
                {step === 'INPUT' 
                    ? `Введите новый ${type === 'email' ? 'адрес email' : 'номер телефона'}`
                    : `Введите код, отправленный на ${newValue}`
                }
            </p>

            <div className="space-y-4">
                {step === 'INPUT' ? (
                    <GlassInput 
                        value={newValue}
                        onChange={type === 'phone' ? handlePhoneChange : (e) => setNewValue(e.target.value)}
                        placeholder={type === 'email' ? "Новый email" : "+7 (000) 000-00-00"}
                        className="bg-[#1C1C1E] border-white/10"
                        autoFocus
                    />
                ) : (
                    <GlassInput 
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center tracking-[8px] font-mono text-2xl bg-[#1C1C1E] border-white/10"
                        autoFocus
                    />
                )}

                {error && (
                    <div className="p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-[13px] font-medium text-center">
                        {error}
                    </div>
                )}

                <GlassButton 
                    onClick={step === 'INPUT' ? handleSendCode : handleVerifyCode}
                    disabled={isLoading}
                    className="!rounded-full h-[56px]"
                >
                    {isLoading ? 'Загрузка...' : step === 'INPUT' ? 'Продолжить' : 'Подтвердить'}
                </GlassButton>
                
                <button onClick={onClose} className="w-full py-3 text-[15px] text-neutral-500 font-medium hover:text-white transition-colors">
                    Отмена
                </button>
            </div>
        </div>
    );
};

// --- PERSONAL DATA PAGE ---
export const PersonalDataPage: React.FC<{ user: User; onClose: () => void; backgroundSelector?: string }> = ({ user, onClose, backgroundSelector }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { showModal, hideModal } = useModal();
    
    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id);
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const openChangeModal = (type: 'email' | 'phone') => {
        showModal(
            <ChangeContactModal 
                type={type}
                currentValue={type === 'email' ? (user.email || '') : (user.phone || '')}
                onClose={hideModal}
                onSuccess={() => {
                    alert("Данные успешно изменены");
                }}
            />
        );
    };

    return (
        <SubPageWrapper title="Личные данные" onClose={onClose} backgroundSelector={backgroundSelector}>
            <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
                 <div className="w-full p-4 flex items-center justify-between relative h-[52px]">
                     <span className="text-[17px] text-white font-medium whitespace-nowrap">Имя</span>
                     <span className="text-[17px] text-neutral-400 truncate ml-4">{user.name}</span>
                     <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>
                 </div>

                 <button 
                    onClick={handleCopyId}
                    className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] transition-colors relative h-[52px]"
                 >
                     <span className="text-[17px] text-white font-medium whitespace-nowrap">ID пользователя</span>
                     <span className={`text-[17px] transition-colors truncate ml-4 ${isCopied ? 'text-[#30D158] font-medium' : 'text-neutral-400 font-mono'}`}>
                        {isCopied ? 'Скопировано' : user.id}
                     </span>
                     <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>
                 </button>

                 <button 
                    onClick={() => openChangeModal('phone')}
                    className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] transition-colors group relative h-[52px]"
                 >
                     <span className="text-[17px] text-white font-medium whitespace-nowrap">Телефон</span>
                     <div className="flex items-center gap-2 ml-4">
                        <span className={`text-[17px] transition-colors ${user.phone ? 'text-neutral-400 group-active:text-white' : 'text-[#FF3B30]'}`}>
                            {user.phone || 'Не указан'}
                        </span>
                        <div className="text-neutral-500/50 group-active:text-neutral-500">
                            <Icons.ChevronRight />
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>
                 </button>

                 <button 
                    onClick={() => openChangeModal('email')}
                    className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] transition-colors group h-[52px]"
                 >
                     <span className="text-[17px] text-white font-medium whitespace-nowrap">Почта</span>
                     <div className="flex items-center gap-2 ml-4">
                        <span className={`text-[17px] transition-colors truncate max-w-[180px] ${user.email ? 'text-neutral-400 group-active:text-white' : 'text-[#FF3B30]'}`}>
                            {user.email || 'Не указана'}
                        </span>
                        <div className="text-neutral-500/50 group-active:text-neutral-500">
                            <Icons.ChevronRight />
                        </div>
                     </div>
                 </button>
            </div>
            
            <p className="px-4 mt-3 text-[13px] text-neutral-500 leading-snug">
                Для изменения телефона или почты потребуется подтверждение через код.
            </p>
        </SubPageWrapper>
    );
};

// --- DOCUMENTS PAGE ---
export const DocumentsPage: React.FC<{ onClose: () => void; backgroundSelector?: string }> = ({ onClose, backgroundSelector }) => (
    <SubPageWrapper title="Документы" onClose={onClose} backgroundSelector={backgroundSelector}>
         <div className="space-y-4">
             <div className="bg-[#1C1C1E] rounded-[24px] p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#30D158]/10 rounded-full flex items-center justify-center text-[#30D158]"><Icons.Check /></div>
                     <div>
                         <p className="text-[17px] font-medium text-white">Паспорт РФ</p>
                         <p className="text-[13px] text-neutral-500">Проверен</p>
                     </div>
                 </div>
             </div>
             <div className="bg-[#1C1C1E] rounded-[24px] p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-[#30D158]/10 rounded-full flex items-center justify-center text-[#30D158]"><Icons.Check /></div>
                     <div>
                         <p className="text-[17px] font-medium text-white">Самозанятость</p>
                         <p className="text-[13px] text-neutral-500">Подтвержден</p>
                     </div>
                 </div>
             </div>
             <div className="bg-[#1C1C1E] rounded-[24px] p-4 flex items-center justify-between opacity-50">
                 <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-neutral-500"><Icons.Plus /></div>
                     <div>
                         <p className="text-[17px] font-medium text-white">Медкнижка</p>
                         <p className="text-[13px] text-neutral-500">Не загружено</p>
                     </div>
                 </div>
             </div>
         </div>
    </SubPageWrapper>
);

// --- SECURITY PAGE ---
export const SecurityPage: React.FC<{ onClose: () => void; backgroundSelector?: string }> = ({ onClose, backgroundSelector }) => (
    <SubPageWrapper title="Безопасность" onClose={onClose} backgroundSelector={backgroundSelector}>
        <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
             <button className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] relative h-[52px]">
                 <span className="text-[17px] text-white font-medium">Сменить пароль</span>
                 <div className="text-neutral-500/50">
                    <Icons.ChevronRight />
                 </div>
                 <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>
             </button>
             <button className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] relative h-[52px]">
                 <span className="text-[17px] text-white font-medium">Face ID</span>
                 <div className="w-[51px] h-[31px] bg-[#30D158] rounded-full relative shadow-sm border border-white/5">
                     <div className="absolute right-[2px] top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md"></div>
                 </div>
                 <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>
             </button>
             <button className="w-full p-4 flex items-center justify-between active:bg-[#2C2C2E] text-[#FF3B30] h-[52px]">
                 <span className="text-[17px] font-medium">Удалить аккаунт</span>
             </button>
        </div>
    </SubPageWrapper>
);

// --- SUPPORT PAGE COMPONENTS ---

const FAQ_DATA = [
  {
    icon: <Icons.Wallet />,
    question: 'Как рассчитывается стоимость?',
    answer: 'Стоимость доставки формируется на основе расстояния, веса, габаритов посылки и выбранных опций, таких как "Срочно" или "Хрупкое". Вы также можете предложить свою цену, и курьеры смогут на нее откликнуться.',
  },
  {
    icon: <Icons.User />,
    question: 'Как стать проверенным курьером?',
    answer: 'Для получения статуса "Проверенный" необходимо загрузить и подтвердить документы в разделе "Профиль" -> "Документы". Это повышает доверие отправителей и открывает доступ к более дорогим заказам.',
  },
  {
    icon: <Icons.Package />,
    question: 'Что делать, если получатель недоступен?',
    answer: 'Свяжитесь с отправителем через чат в приложении для уточнения дальнейших действий. Если связаться не удалось, обратитесь в службу поддержки, указав ID заказа. Не оставляйте посылку без согласования.',
  },
  {
    icon: <Icons.Radar />,
    question: 'Можно ли отслеживать доставку?',
    answer: 'Да, для активных заказов на карте отображается текущее местоположение курьера. Вы можете следить за всем процессом в реальном времени на экране деталей заказа.',
  },
  {
    icon: <Icons.CreditCard />,
    question: 'Как вывести заработанные средства?',
    answer: 'Заработанные средства зачисляются на ваш внутренний баланс. Вывод доступен в разделе "Финансы" на привязанную банковскую карту. Обработка заявки обычно занимает от нескольких минут до одного рабочего дня.',
  },
];

// iOS-style List Row for Navigation
const SupportItemRow: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; isLast?: boolean }> = ({ icon, label, onClick, isLast }) => (
    <div className="relative h-[56px]">
        <button 
            onClick={onClick}
            className="w-full h-full flex items-center justify-between pr-4 pl-4 active:bg-[#2C2C2E] transition-colors group"
        >
            <div className="flex items-center gap-3.5">
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
                    <div className="scale-[0.59] text-white relative z-20 flex justify-center">
                        {icon}
                    </div>
                </div>
                <span className="text-[17px] font-medium text-white">{label}</span>
            </div>
            <div className="text-neutral-500/50 group-active:text-neutral-500">
                <Icons.ChevronRight />
            </div>
        </button>
        {!isLast && (
            <div className="absolute bottom-0 left-[62px] right-4 h-[0.5px] bg-[#38383A] pointer-events-none"></div>
        )}
    </div>
);

// New Interactive FAQ Row Component
const FaqRow: React.FC<{ 
    icon: React.ReactNode; 
    question: string; 
    answer: string;
    isExpanded: boolean;
    onClick: () => void;
    isLast?: boolean;
}> = ({ icon, question, answer, isExpanded, onClick, isLast }) => (
    <div className="relative">
        <button 
            onClick={onClick}
            className="w-full min-h-[56px] flex items-center justify-between py-2 pr-4 pl-4 active:bg-[#2C2C2E] transition-colors group"
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-[#171717] flex items-center justify-center shrink-0 relative overflow-hidden">
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
                    <div className="scale-[0.59] text-white transition-colors relative z-20 flex justify-center">{icon}</div>
                </div>
                <span className="text-[17px] font-medium text-white text-left leading-snug py-1">{question}</span>
            </div>
            <div className={`text-neutral-500/50 group-active:text-neutral-500 transition-transform duration-300 ml-3 ${isExpanded ? 'rotate-90' : ''}`}>
                <Icons.ChevronRight />
            </div>
        </button>
        
        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
                 <div className="text-neutral-300 text-[15px] leading-relaxed font-medium pb-4 pt-1 px-4 pl-[62px]">
                    {answer}
                </div>
            </div>
        </div>

        {!isLast && (
            <div className="absolute bottom-0 left-[62px] right-4 h-[0.5px] bg-[#38383A] pointer-events-none"></div>
        )}
    </div>
);


// --- SUPPORT PAGE ---
export const SupportPage: React.FC<{ onClose: () => void; backgroundSelector?: string }> = ({ onClose, backgroundSelector }) => {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const handleFaqClick = (index: number) => {
        setExpandedFaq(prev => (prev === index ? null : index));
    };

    return (
        <SubPageWrapper title="Поддержка" onClose={onClose} backgroundSelector={backgroundSelector}>
            <div className="space-y-8">
                <div>
                    <div className="px-4 pb-2 text-[13px] text-neutral-500 uppercase tracking-tight">Связаться с нами</div>
                    <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
                        <SupportItemRow 
                            icon={<Icons.Message />}
                            label="Написать в Telegram"
                            onClick={() => window.open('https://t.me/kvant_help', '_blank')}
                        />
                        <SupportItemRow 
                            icon={<Icons.Phone />} 
                            label="Позвонить в поддержку"
                            onClick={() => window.location.href='tel:88005553535'}
                            isLast
                        />
                    </div>
                </div>

                <div>
                    <div className="px-4 pb-2 text-[13px] text-neutral-500 uppercase tracking-tight">Частые вопросы</div>
                     <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
                        {FAQ_DATA.map((faq, index) => (
                            <FaqRow
                                key={index}
                                icon={faq.icon}
                                question={faq.question}
                                answer={faq.answer}
                                isExpanded={expandedFaq === index}
                                onClick={() => handleFaqClick(index)}
                                isLast={index === FAQ_DATA.length - 1}
                            />
                        ))}
                    </div>
                </div>

                <p className="px-4 pt-2 text-center text-[13px] text-neutral-500 leading-snug">
                    Наша служба поддержки работает круглосуточно, без выходных.
                </p>
            </div>
        </SubPageWrapper>
    );
};

// --- CITY PAGE ---
export const CityPage: React.FC<{ user: User; onClose: () => void; backgroundSelector?: string }> = ({ user, onClose, backgroundSelector }) => (
    <SubPageWrapper title="Ваш город" onClose={onClose} backgroundSelector={backgroundSelector}>
        <div className="bg-[#1C1C1E] rounded-[24px] p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-[#171717] flex items-center justify-center text-white relative overflow-hidden shrink-0">
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
                    <div className="relative z-20 scale-[0.59] flex justify-center"><Icons.MapPin /></div>
                </div>
                <div>
                     <p className="text-[13px] text-neutral-500 uppercase font-bold">Текущий</p>
                     <p className="text-[17px] text-white font-medium">{user.city || 'Москва'}</p>
                </div>
            </div>
            <div className="text-[#30D158]"><Icons.Check /></div>
        </div>
        <p className="text-[13px] text-neutral-500 pl-4 mb-2 uppercase tracking-tight">Доступные города</p>
        <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
             {['Москва', 'Санкт-Петербург', 'Казань', 'Краснодар', 'Екатеринбург'].map((city, index, arr) => (
                 <button key={city} className="w-full relative p-4 flex items-center justify-between active:bg-[#2C2C2E] transition-colors h-[52px]">
                     <span className="text-[17px] text-white font-medium">{city}</span>
                     {index < arr.length - 1 && <div className="absolute bottom-0 left-[16px] right-4 h-[0.5px] bg-[#38383A]"></div>}
                 </button>
             ))}
        </div>
    </SubPageWrapper>
);

// --- NAVIGATION PAGE ---

const NavigationOptionRow: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    isSelected: boolean;
    onClick: () => void;
    isLast?: boolean;
}> = ({ icon, label, isSelected, onClick, isLast }) => (
    <div className="relative h-[64px]">
        <button 
            onClick={onClick}
            className="w-full h-full flex items-center justify-between pr-4 pl-4 active:bg-[#2C2C2E] transition-colors group"
        >
            <div className="flex items-center gap-4">
                <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center text-white font-bold text-xl overflow-hidden relative shadow-sm">
                    {icon}
                </div>
                <span className="text-[17px] font-medium text-white">{label}</span>
            </div>
            {isSelected && (
                <div className="text-[#0A84FF]">
                    <Icons.Check />
                </div>
            )}
        </button>
        {!isLast && (
            <div className="absolute bottom-0 left-[74px] right-4 h-[0.5px] bg-[#38383A] pointer-events-none"></div>
        )}
    </div>
);

export const NavigationPage: React.FC<{ onClose: () => void; backgroundSelector?: string }> = ({ onClose, backgroundSelector }) => {
    const [selectedNav, setSelectedNav] = useState<'yandex' | 'google' | '2gis'>('yandex');

    return (
        <SubPageWrapper title="Навигация" onClose={onClose} backgroundSelector={backgroundSelector}>
             <div className="bg-[#1C1C1E] rounded-[24px] overflow-hidden">
                <NavigationOptionRow
                    icon={<div className="w-full h-full bg-[#FC3F1D] flex items-center justify-center">Я</div>}
                    label="Яндекс.Навигатор"
                    isSelected={selectedNav === 'yandex'}
                    onClick={() => setSelectedNav('yandex')}
                />
                <NavigationOptionRow
                    icon={
                        <div className="w-full h-full bg-[#2C2C2E] flex items-center justify-center relative">
                            <div className="absolute w-6 h-6 rounded-full -top-1 -left-1 bg-[#4285F4]"></div>
                            <div className="absolute w-6 h-6 rounded-full -top-1 -right-1 bg-[#34A853]"></div>
                            <div className="absolute w-6 h-6 rounded-full -bottom-1 -left-1 bg-[#FBBC05]"></div>
                            <div className="absolute w-6 h-6 rounded-full -bottom-1 -right-1 bg-[#EA4335]"></div>
                        </div>
                    }
                    label="Google Maps"
                    isSelected={selectedNav === 'google'}
                    onClick={() => setSelectedNav('google')}
                />
                <NavigationOptionRow
                    icon={<div className="w-full h-full bg-[#A2CB3E] flex items-center justify-center text-3xl">2</div>}
                    label="2GIS"
                    isSelected={selectedNav === '2gis'}
                    onClick={() => setSelectedNav('2gis')}
                    isLast
                />
             </div>
             <p className="px-4 mt-4 text-[13px] text-neutral-500 leading-snug text-center">
                Выбранное приложение будет автоматически открываться при построении маршрута к адресу.
            </p>
        </SubPageWrapper>
    );
};
