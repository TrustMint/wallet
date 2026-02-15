
import React, { useState, useEffect } from 'react';
import { UserRole, User } from '../../types';
import { Icons } from '../../constants';
import { FloatingBackButton } from '../../components/FloatingBackButton';
import { registerUser, loginUser, verifySignup, resendCode } from '../../services/api';

interface AuthScreenProps {
    role: UserRole;
    onAuthSuccess: (user: User) => void;
    onBack: () => void;
}

// iOS Style Glass Input Field
const AuthInput: React.FC<{
    icon?: React.ReactNode;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
    autoFocus?: boolean;
    required?: boolean;
    name?: string;
    autoComplete?: string;
    className?: string;
    maxLength?: number;
}> = ({ icon, value, onChange, placeholder, type = 'text', autoFocus, required, name, autoComplete, className = '', maxLength }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const handleClear = () => {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    };

    const isPasswordType = type === 'password';
    const effectiveType = isPasswordType ? (isPasswordVisible ? 'text' : 'password') : type;

    return (
        <div className="relative group">
            {icon && (
                <div className="absolute left-0 top-0 bottom-0 w-[56px] flex items-center justify-center text-neutral-500 group-focus-within:text-white transition-colors pointer-events-none z-10">
                    {icon}
                </div>
            )}
            <input
                type={effectiveType}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                required={required}
                name={name}
                maxLength={maxLength}
                autoComplete={autoComplete}
                className={`w-full h-[56px] bg-[#1C1C1E]/60 backdrop-blur-xl border border-white/10 rounded-full text-[17px] text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 focus:bg-[#1C1C1E]/80 transition-all shadow-sm ${icon ? 'pl-[50px]' : 'pl-6'} pr-12 ${className}`}
                style={{ 
                    WebkitAppearance: 'none',
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05)'
                }}
            />
            
            {/* Right Side Action Button */}
            {isPasswordType ? (
                <button
                    type="button"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    className="absolute right-0 top-0 bottom-0 w-[50px] flex items-center justify-center text-neutral-500 active:text-white transition-colors z-20"
                >
                    {isPasswordVisible ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
            ) : (
                value.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        // Reverted background to gray, kept text black, kept scale 0.39
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#2C2C2E] flex items-center justify-center text-black active:bg-white/20 transition-colors z-20"
                    >
                        <div className="scale-[0.39]"><Icons.X /></div>
                    </button>
                )
            )}
        </div>
    );
};

// iOS Style Large Action Button
const AuthButton: React.FC<{
    onClick?: () => void;
    isLoading: boolean;
    label: string;
    color: string;
    type?: 'submit' | 'button';
}> = ({ onClick, isLoading, label, color, type = 'submit' }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isLoading}
            // Removed overflow-hidden
            className="relative w-full h-[56px] rounded-full transition-transform active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 group"
            style={{
                backgroundColor: color,
                boxShadow: `0 0 30px ${color}4D, inset 0 1px 0 0 rgba(255,255,255,0.2)`
            }}
        >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex items-center justify-center font-semibold text-[17px] text-white tracking-wide">
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    label
                )}
            </div>
        </button>
    );
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ role, onAuthSuccess, onBack }) => {
    const [viewState, setViewState] = useState<'LOGIN' | 'REGISTER_FORM' | 'REGISTER_VERIFY'>('LOGIN');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    
    // Timer State
    const [resendTimer, setResendTimer] = useState(0);
    
    const [error, setError] = useState<string | null>(null);

    // Color theme based on role
    const themeColor = role === UserRole.COURIER ? '#A855F7' : '#0A84FF';

    // Countdown Timer Effect
    useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [resendTimer]);

    const switchView = (newView: 'LOGIN' | 'REGISTER_FORM' | 'REGISTER_VERIFY') => {
        setIsAnimating(true);
        setError(null);
        setTimeout(() => {
            setViewState(newView);
            setIsAnimating(false);
        }, 300);
    };

    // Phone Mask Handler
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, ''); // Strip non-digits
        let formatted = '';
        
        if (input.length === 0) {
            setPhone('');
            return;
        }

        // Russian Mask: +7 (XXX) XXX-XX-XX
        // Force prefix to 7 if user starts typing 8 or 7, else assume 7
        let digits = input;
        if (input[0] === '8') digits = '7' + input.slice(1);
        if (input[0] !== '7') digits = '7' + input;
        
        // Limit to 11 digits (7 + 10 digits)
        digits = digits.substring(0, 11);

        formatted = '+7';
        if (digits.length > 1) formatted += ` (${digits.substring(1, 4)}`;
        if (digits.length > 4) formatted += `) ${digits.substring(4, 7)}`;
        if (digits.length > 7) formatted += `-${digits.substring(7, 9)}`;
        if (digits.length > 9) formatted += `-${digits.substring(9, 11)}`;

        setPhone(formatted);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Explicitly update state to lowercase version to prevent mismatch later
        const cleanEmail = email.toLowerCase().trim();
        setEmail(cleanEmail);

        if (!cleanEmail.includes('@')) return setError('Введите корректный email');
        if (phone.length < 18) return setError('Введите полный номер телефона'); // +7 (XXX) XXX-XX-XX is 18 chars
        if (password.length < 6) return setError('Пароль должен быть не менее 6 символов');
        if (name.length < 2) return setError('Введите ваше имя');

        setIsLoading(true);
        try {
            const result = await registerUser(cleanEmail, password, role, name, phone);
            
            if (result.shouldVerify) {
                // Move to verification step
                setResendTimer(60); // Start 60s cooldown
                switchView('REGISTER_VERIFY');
            } else if (result.user) {
                // Already verified (rare if Confirm Email is on, but possible)
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                onAuthSuccess(result.user);
            }
        } catch (err: any) {
            console.error("Reg error:", err);
            if (err.message?.includes('rate limit')) {
                setError('Слишком много попыток. Подождите немного.');
            } else {
                setError(err.message || "Ошибка регистрации");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Relaxed validation: check for reasonable length (Supabase default is 6, but custom can be up to 8+)
        if (otpCode.length < 6) return setError('Введите код подтверждения');

        setIsLoading(true);
        try {
            // Trim inputs here as well to be safe
            const userProfile = await verifySignup(email.trim(), otpCode.trim());
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            onAuthSuccess(userProfile);
        } catch (err: any) {
            console.error("Verify error:", err);
            setError("Неверный код или срок действия истек");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendTimer > 0) return;
        setError(null);
        setIsLoading(true);
        try {
            await resendCode(email);
            setResendTimer(60); // Reset timer
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        } catch (err: any) {
            console.error("Resend error:", err);
            if (err.message?.includes('rate limit')) {
                setError('Лимит превышен. Попробуйте через час.');
            } else {
                setError('Не удалось отправить код повторно');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const userProfile = await loginUser(email.trim(), password);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            onAuthSuccess(userProfile);
        } catch (err: any) {
            console.error("Auth error:", err);
            let msg = "Ошибка авторизации";
            if (err.message.includes("Invalid login")) msg = "Неверный email или пароль";
            if (err.message.includes("Email not confirmed")) msg = "Email не подтвержден";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    // Render Logic Helpers
    const isLogin = viewState === 'LOGIN';
    const isRegister = viewState === 'REGISTER_FORM';
    const isVerify = viewState === 'REGISTER_VERIFY';

    return (
        <div className="fixed inset-0 h-[100dvh] w-full bg-[#000000] flex flex-col relative overflow-hidden">
            
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
                <div 
                    className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] blur-[120px] rounded-full opacity-30 transition-colors duration-1000"
                    style={{ backgroundColor: themeColor }}
                ></div>
                <div 
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[100px] rounded-full opacity-20 transition-colors duration-1000"
                    style={{ backgroundColor: role === UserRole.COURIER ? '#3B82F6' : '#A855F7' }}
                ></div>
            </div>

            <FloatingBackButton onClick={onBack} />

            <div 
                className="flex-1 flex flex-col w-full max-w-md mx-auto z-10 px-6 overflow-y-auto scrolling-touch"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 80px)' }}
            >
                
                {/* Header */}
                <div className="text-center mb-10 transition-all duration-500 ease-out">
                    <div className="relative inline-block mb-6">
                        <div 
                            className="absolute inset-0 blur-2xl opacity-40 rounded-full"
                            style={{ backgroundColor: themeColor }}
                        ></div>
                        <div className="relative w-20 h-20 bg-[#1C1C1E] border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                            <div style={{ color: themeColor }} className="transform scale-125">
                                {isVerify ? <Icons.Message /> : <Icons.User />}
                            </div>
                        </div>
                    </div>
                    
                    <h1 className="text-[34px] font-bold text-white tracking-tight leading-tight mb-2">
                        {isLogin ? 'Вход' : isVerify ? 'Подтверждение' : 'Регистрация'}
                    </h1>
                    <p className="text-[15px] text-neutral-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                        {isVerify 
                            ? `Мы отправили код подтверждения на ${email}` 
                            : (role === UserRole.COURIER ? 'Кабинет курьера' : 'Кабинет отправителя')
                        }
                    </p>
                </div>

                {/* --- VERIFICATION FORM --- */}
                {isVerify && (
                    <form onSubmit={handleVerifyCode} className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        <div className="space-y-4">
                            <AuthInput 
                                value={otpCode}
                                // Increased limit to 8 to handle extended OTP/Tokens
                                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="Код из письма"
                                type="tel"
                                autoFocus
                                autoComplete="one-time-code"
                                className="text-center text-[24px] tracking-[8px] font-mono"
                            />
                        </div>

                        {error && (
                            <div className="p-3.5 rounded-[24px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-start gap-3 animate-fade-in">
                                <div className="text-[#FF3B30] mt-0.5"><Icons.Info /></div>
                                <span className="text-[13px] text-[#FF3B30] font-medium leading-snug">{error}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <AuthButton 
                                isLoading={isLoading} 
                                label="Подтвердить" 
                                color={themeColor} 
                            />
                        </div>
                        
                        <div className="text-center space-y-3 pt-2">
                            <button 
                                type="button"
                                onClick={handleResendCode}
                                disabled={resendTimer > 0 || isLoading}
                                className={`text-[14px] font-medium transition-colors ${resendTimer > 0 ? 'text-neutral-600 cursor-not-allowed' : 'text-white hover:text-opacity-80'}`}
                            >
                                {resendTimer > 0 ? `Отправить повторно через ${resendTimer}с` : 'Отправить код повторно'}
                            </button>

                            <button 
                                type="button"
                                onClick={() => switchView('REGISTER_FORM')}
                                className="block w-full text-[14px] text-neutral-500 hover:text-white transition-colors"
                            >
                                Изменить email
                            </button>
                        </div>
                    </form>
                )}

                {/* --- LOGIN / REGISTER FORM --- */}
                {!isVerify && (
                    <form 
                        onSubmit={isLogin ? handleLogin : handleRegister} 
                        className={`space-y-4 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                    >
                        {isRegister && (
                            <>
                                <AuthInput 
                                    icon={<Icons.User />}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ваше имя"
                                    name="name"
                                    autoComplete="name"
                                    autoFocus
                                />
                                <div>
                                    <AuthInput 
                                        icon={<Icons.Phone />}
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="+7 (000) 000-00-00"
                                        type="tel"
                                        name="phone"
                                        autoComplete="tel"
                                        maxLength={18}
                                    />
                                    <div className="flex gap-2 mt-2 px-1 items-start">
                                        <div className="text-[#FF9F0A] mt-0.5"><Icons.Info /></div>
                                        <p className="text-[12px] text-neutral-400 leading-snug">
                                            Указывайте реальный номер. Он будет использоваться для связи с курьером или отправителем.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        <AuthInput 
                            icon={<div className="scale-90"><Icons.Message /></div>}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Email"
                            type="email"
                            name="email"
                            autoComplete="username"
                            autoFocus={isLogin}
                        />

                        <AuthInput 
                            icon={<div className="scale-90"><Icons.Shield /></div>}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Пароль"
                            type="password"
                            name="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />

                        {error && (
                            <div className="p-3.5 rounded-[24px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-start gap-3 animate-fade-in">
                                <div className="text-[#FF3B30] mt-0.5"><Icons.Info /></div>
                                <span className="text-[13px] text-[#FF3B30] font-medium leading-snug">{error}</span>
                            </div>
                        )}

                        <div className="pt-4">
                            <AuthButton 
                                isLoading={isLoading} 
                                label={isLogin ? 'Войти' : 'Создать аккаунт'} 
                                color={themeColor} 
                            />
                        </div>
                    </form>
                )}

                {/* Footer Toggle */}
                {!isVerify && (
                    <div className="mt-auto py-8 text-center">
                        <p className="text-[15px] text-neutral-500 font-medium">
                            {isLogin ? 'Еще нет аккаунта?' : 'Уже есть аккаунт?'}
                        </p>
                        <button 
                            type="button"
                            onClick={() => switchView(isLogin ? 'REGISTER_FORM' : 'LOGIN')}
                            className="mt-2 text-[15px] font-semibold text-white hover:opacity-80 transition-opacity active:scale-95 inline-block py-2 px-4 rounded-full"
                        >
                            {isLogin ? 'Зарегистрироваться' : 'Войти в систему'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
