
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, Order, Message } from '../../types';
import { Icons } from '../../constants';
import { SwipeableWrapper } from '../../components/SwipeableWrapper';
import { FloatingBackButton } from '../../components/FloatingBackButton';
import { getUserProfile } from '../../services/api';
import { supabase } from '../../lib/supabaseClient';
import * as chatApi from '../../services/chatApi'; 
import { ChatInput } from './ChatInput';
import { useChatGestures } from '../../hooks/useChatGestures';

interface ChatViewProps {
    order: Order;
    currentUser: User;
    onClose: () => void;
    zIndex?: number;
    backgroundSelector?: string;
}

// --- LIQUID GLASS STYLE (CLEAN - NO BORDER OUTLINES) ---
const chatGlassStyle = {
    backgroundColor: 'rgba(20, 20, 20, 0.4)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    boxShadow: '0 15px 40px rgba(0,0,0,0.6)', 
    border: '0.5px solid rgba(255, 255, 255, 0.1)', // Added thin glass contour
};

// --- ICONS ---
const MoreHorizontalIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
);

const ReplyIconSmall = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
);

// --- SAFETY NOTICE COMPONENT ---
const SafetyNotice: React.FC = () => (
    <div className="w-full px-6 py-8 flex flex-col items-center justify-center animate-fade-in mb-4">
        <div className="p-5 rounded-[24px] bg-[#FFD60A]/5 border border-[#FFD60A]/15 backdrop-blur-md flex flex-col items-center text-center max-w-[320px] shadow-[0_0_40px_rgba(255,214,10,0.05)]">
            <div className="w-10 h-10 rounded-full bg-[#FFD60A]/10 flex items-center justify-center text-[#FFD60A] mb-3 border border-[#FFD60A]/20">
                <Icons.Shield />
            </div>
            <h3 className="text-[#FFD60A] font-bold text-[13px] uppercase tracking-widest mb-2">Безопасность</h3>
            <p className="text-[13px] text-neutral-400 leading-relaxed font-medium">
                Для защиты ваших средств общайтесь только внутри КВАНТ. Не переходите в WhatsApp или Telegram.
            </p>
        </div>
    </div>
);

// --- IMAGE VIEWER COMPONENT ---
const ImageViewer: React.FC<{ message: Message; onClose: () => void; onReply: (msg: Message) => void; onShowInChat: (id: string) => void }> = ({ message, onClose, onReply, onShowInChat }) => {
    const [isSaving, setIsSaving] = useState(false);
    
    // State-driven animation for the menu
    const [menuMounted, setMenuMounted] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    
    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (menuMounted) {
            // Close
            setMenuVisible(false);
            setTimeout(() => setMenuMounted(false), 300);
        } else {
            // Open
            setMenuMounted(true);
            requestAnimationFrame(() => setMenuVisible(true));
        }
    };

    const closeMenu = () => {
        setMenuVisible(false);
        setTimeout(() => setMenuMounted(false), 300);
    };
    
    // Swipe Logic State
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const currentY = useRef(0);
    
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        currentY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const y = e.touches[0].clientY;
        currentY.current = y;
        const delta = y - startY.current;
        
        if (delta > 0) {
            setDragY(delta); 
        } else {
            setDragY(delta * 0.2); 
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        const delta = currentY.current - startY.current;
        const threshold = window.innerHeight * 0.15; // 15% of screen height
        
        if (delta > threshold) {
            onClose();
        } else {
            setDragY(0);
        }
    };

    // Calculate dynamic values for smooth render
    const progress = Math.max(0, Math.min(1, dragY / (window.innerHeight * 0.8)));
    const backdropOpacity = Math.max(0, 1 - progress); 
    const scale = Math.max(0.9, 1 - (progress * 0.2)); 
    
    const containerStyle = {
        backgroundColor: `rgba(0, 0, 0, ${0.95 * backdropOpacity})`,
        transition: isDragging ? 'none' : 'background-color 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        willChange: 'background-color'
    };

    const imageStyle = {
        transform: `translate3d(0, ${dragY}px, 0) scale(${scale})`,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1)', 
        cursor: isDragging ? 'grabbing' : 'grab',
        willChange: 'transform'
    };

    const handleSaveOrShare = async () => {
        if (!message.imageUrl) return;
        setIsSaving(true);
        try {
            const response = await fetch(message.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `kvant_image_${Date.now()}.jpg`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Фото из чата КВАНТ',
                    text: 'Посмотрите фото из чата'
                });
            } else {
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `kvant-image-${Date.now()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }
        } catch (error) {
            console.error("Failed to save/share image", error);
            alert("Не удалось сохранить.");
        } finally {
            setIsSaving(false);
            closeMenu();
        }
    };

    const handleAction = (action: 'show' | 'save' | 'reply') => {
        if (action === 'show') {
            onShowInChat(message.id);
        } else if (action === 'save') {
            handleSaveOrShare();
        } else if (action === 'reply') {
            onReply(message);
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[500] flex flex-col items-center justify-center animate-fade-in touch-none select-none"
            style={containerStyle}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <img 
                src={message.imageUrl!} 
                className="max-w-full max-h-[85vh] object-contain select-none shadow-2xl pointer-events-auto" 
                style={imageStyle}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                alt="Full size"
            />

            {/* Menu Trigger Button (Top Right) */}
            <div 
                className="absolute top-0 right-0 pt-[calc(env(safe-area-inset-top)+12px)] pr-3 z-50 transition-all duration-300"
                style={{ opacity: isDragging ? 0 : 1 }}
            >
                <button
                    onClick={toggleMenu}
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white active:scale-90 transition-all"
                    style={chatGlassStyle}
                >
                    <MoreHorizontalIcon />
                </button>

                {/* Dropdown Menu - State-based Transition */}
                {menuMounted && (
                    <>
                        {/* Backdrop to close */}
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); closeMenu(); }}></div>
                        
                        <div 
                            className="absolute top-full right-3 mt-2 w-48 rounded-[20px] overflow-hidden flex flex-col z-50 origin-top-right"
                            style={{
                                ...chatGlassStyle,
                                transform: menuVisible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(-10px)',
                                opacity: menuVisible ? 1 : 0,
                                transition: 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.3s ease',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => handleAction('show')} className="w-full text-left px-4 py-3 text-[15px] text-white active:bg-white/10 flex items-center gap-3">
                                <Icons.Search /> Показать в чате
                            </button>
                            <div className="h-[0.5px] bg-white/10 mx-4"></div>
                            <button onClick={() => handleAction('reply')} className="w-full text-left px-4 py-3 text-[15px] text-white active:bg-white/10 flex items-center gap-3">
                                <ReplyIconSmall /> Ответить
                            </button>
                            <div className="h-[0.5px] bg-white/10 mx-4"></div>
                            <button onClick={() => handleAction('save')} className="w-full text-left px-4 py-3 text-[15px] text-white active:bg-white/10 flex items-center gap-3">
                                {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/50 border-t-white rounded-full"></div> : <Icons.DownloadCloud />} 
                                {isSaving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// --- CHAT BUBBLE COMPONENT ---

const ChatBubble: React.FC<{ 
    message: Message; 
    isMine: boolean; 
    onImageClick: (msg: Message) => void;
    onReply: (msg: Message) => void;
    onScrollToMessage: (id: string) => void;
    otherUserName: string;
}> = ({ message, isMine, onImageClick, onReply, onScrollToMessage, otherUserName }) => {
    
    // NEW Professional Gesture Hook
    const { handlers, style, isSwiping } = useChatGestures({
        onReply: () => onReply(message),
        threshold: 40 // Trigger distance
    });

    const timeStr = new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const bgClass = isMine ? 'bg-[#007AFF] text-white' : 'bg-[#A855F7] text-white';
    const timeColorClass = 'text-white/70';
    const checkColorClass = 'text-white';

    // Reply Context Block
    const ReplyContext = () => {
        if (!message.replyTo) return null;
        
        const replyName = message.replyTo.senderId === message.senderId ? 'Вы' : otherUserName;
        const hasThumb = !!message.replyTo.imageUrl;

        return (
            <div 
                role="button"
                onClick={(e) => { 
                    e.stopPropagation(); 
                    onScrollToMessage(message.replyTo!.id); 
                }}
                className="mb-1.5 rounded-[16px] bg-black/10 overflow-hidden pl-2.5 py-1 pr-2 cursor-pointer active:bg-black/20 transition-colors relative flex items-center"
            >
                <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-black/40"></div>
                {hasThumb && (
                    <div className="ml-1.5 w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0 bg-black/20">
                        <img 
                            src={message.replyTo!.imageUrl!} 
                            className="w-full h-full object-cover select-none" 
                            draggable={false}
                            alt="thumb" 
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0 pl-1.5 flex flex-col justify-center">
                    <div className="text-[11px] font-bold text-white opacity-90 truncate">
                        {replyName}
                    </div>
                    <div className="text-[11px] truncate text-white/70 font-mono leading-snug">
                        {message.replyTo.text || 'Фотография'}
                    </div>
                </div>
            </div>
        );
    };

    // Updated Image Meta: Flexible width pill to fit double checks
    const ImageMetaCapsule = () => (
        <div className="absolute right-2 bottom-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full pl-2 pr-1.5 py-0.5 flex items-center gap-[2px] select-none pointer-events-none shadow-lg">
            <span className="text-[10px] font-medium text-white/90 tracking-tight font-sans leading-none">{timeStr}</span>
            {isMine && (
                <div className="flex items-center justify-center scale-[0.75] origin-center">
                    {message.isRead ? (
                        <div className="flex items-center">
                            {/* Check 1 (Top) */}
                            <span className="relative z-10 text-white"><Icons.CheckLight /></span>
                            {/* Check 2 (Bottom/Behind) - Less aggressive overlap */}
                            <span className="relative z-0 text-white -ml-[14px]"><Icons.CheckLight /></span>
                        </div>
                    ) : (
                        <div className="text-white/80"><Icons.CheckLight /></div>
                    )}
                </div>
            )}
        </div>
    );

    // Updated Text Meta: Ensure bottom-right sticking for both user and sender
    const TextMeta = () => (
        <span className={`float-right ml-2 inline-flex items-end select-none relative ${isMine ? 'top-[1px]' : 'top-[3px]'} -mr-1`}>
            <span className={`text-[11px] font-medium tracking-tight font-sans leading-none ${timeColorClass} ${isMine ? 'relative -top-[1.5px]' : ''}`}>
                {timeStr}
            </span>
            {/* Checkmarks only if mine, but structure keeps flow consistent */}
            {isMine && (
                <span className="flex items-center justify-center scale-[0.7] origin-bottom ml-[1px] mb-[1px]">
                    {message.isRead ? (
                        <div className="flex items-end">
                            <span className="relative z-10 text-white"><Icons.CheckLight /></span>
                            <span className="relative z-0 text-white -ml-[14px]"><Icons.CheckLight /></span>
                        </div>
                    ) : (
                        <span className={`${checkColorClass}`}><Icons.CheckLight /></span>
                    )}
                </span>
            )}
        </span>
    );

    return (
        <div 
            id={`msg-${message.id}`}
            className="relative w-full mb-2"
            {...handlers}
        >
            {/* Reply Icon Indicator - Behind the bubble */}
            <div 
                className="absolute top-1/2 -translate-y-1/2 right-2 text-white bg-white/20 rounded-full p-1.5 transition-opacity duration-200"
                style={{ 
                    opacity: isSwiping ? 1 : 0,
                    // Slightly visible animation
                    transform: isSwiping ? 'translate(-10px, -50%)' : 'translate(0px, -50%)'
                }}
            >
                <ReplyIconSmall />
            </div>

            <div 
                className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                style={style}
            >
                {/* Main Bubble Container */}
                <div 
                    className={`max-w-[85%] relative shadow-sm animate-fade-in overflow-hidden rounded-[20px] ${bgClass}`}
                >
                    {message.replyTo && (
                        <div className="pt-2 px-2 pointer-events-auto">
                            <ReplyContext />
                        </div>
                    )}

                    {message.imageUrl && (
                        <div 
                            className="relative cursor-zoom-in active:opacity-90 transition-opacity w-full"
                            onClick={() => onImageClick(message)}
                        >
                            <img 
                                src={message.imageUrl} 
                                alt="Attachment" 
                                className="w-full h-auto object-cover block select-none" 
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            {!message.text && <ImageMetaCapsule />}
                        </div>
                    )}

                    {message.text && (
                        <div className="px-3.5 pt-1 pb-2 relative">
                            <div className="text-[15px] leading-[1.3] whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono tracking-tight w-full">
                                {message.text}
                                <TextMeta />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ThickChevronDown = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

export const ChatView: React.FC<ChatViewProps> = ({ order, currentUser, onClose, zIndex = 300, backgroundSelector }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false); 
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [viewingMessage, setViewingMessage] = useState<Message | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [inputHeight, setInputHeight] = useState(60); 
    
    // REPLY STATE
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);
    const typingTimeoutRef = useRef<any>(null);

    const otherUserId = currentUser.id === order.senderId ? order.courierId : order.senderId;

    useEffect(() => {
        const initChat = async () => {
            if (otherUserId) {
                const profile = await getUserProfile(otherUserId);
                setOtherUser(profile);
            }
            const msgs = await chatApi.fetchMessages(order.id);
            setMessages(msgs);
            
            await chatApi.markMessagesAsRead(order.id, currentUser.id);
            
            setTimeout(() => {
                setIsLoading(false);
                setIsReady(true);
            }, 100);
        };
        initChat();
    }, [order.id, otherUserId, currentUser.id]);

    const handleScroll = () => {
        // Simple scroll indicator logic could go here
    };

    const scrollToBottom = () => {
       if (scrollContainerRef.current) {
           scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
       }
    };

    const scrollToMessage = (id: string) => {
        const el = document.getElementById(`msg-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-white/10', 'rounded-[20px]', 'transition-colors', 'duration-500');
            setTimeout(() => {
                el.classList.remove('bg-white/10');
            }, 1000);
        }
        setViewingMessage(null);
    };

    useEffect(() => {
        const { unsubscribe, channel } = chatApi.subscribeToChat(
            order.id, 
            (newMessage) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                if (newMessage.senderId !== currentUser.id) {
                    chatApi.markMessagesAsRead(order.id, currentUser.id);
                }
            },
            (updatedMessage) => {
                setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            }
        );

        channelRef.current = channel;

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const isTyping = Object.values(state).some((presences: any) => 
                presences.some((p: any) => p.user_id !== currentUser.id && p.isTyping)
            );
            setIsOtherTyping(isTyping);
        });

        channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: currentUser.id, isTyping: false });
            }
        });

        return () => {
            if (channelRef.current) {
                channelRef.current.track({ user_id: currentUser.id, isTyping: false });
            }
            unsubscribe();
        };
    }, [order.id, currentUser.id]);

    const handleTyping = (text: string) => {
        if (!channelRef.current) return;
        channelRef.current.track({ user_id: currentUser.id, isTyping: text.length > 0 });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) channelRef.current.track({ user_id: currentUser.id, isTyping: false });
        }, 2000);
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
    };

    const handleSend = async (text: string) => {
        const replyContext = replyingTo ? replyingTo : null; 
        setReplyingTo(null);
        if (channelRef.current) channelRef.current.track({ user_id: currentUser.id, isTyping: false });

        try {
            await chatApi.sendMessage(order.id, currentUser.id, text, null, replyContext);
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileSelect = async (file: File) => {
        try {
            await chatApi.sendMessage(order.id, currentUser.id, null, file);
        } catch (error) {
            console.error(error);
        }
    };

    const getScrollButtonBottom = () => {
        const gap = 14; 
        if (isInputFocused) {
            return `${inputHeight + gap}px`;
        } else {
            return `calc(${inputHeight}px + 10px + env(safe-area-inset-bottom) + ${gap}px)`;
        }
    };

    const [animationFinished, setAnimationFinished] = useState(false);
    useEffect(() => {
        if (isReady) {
            const timer = setTimeout(() => setAnimationFinished(true), 550);
            return () => clearTimeout(timer);
        } else {
            setAnimationFinished(false);
        }
    }, [isReady]);

    return (
        <SwipeableWrapper onDismiss={onClose} zIndex={zIndex} backgroundSelector={backgroundSelector}>
            {viewingMessage && (
                <ImageViewer 
                    message={viewingMessage} 
                    onClose={() => setViewingMessage(null)} 
                    onReply={handleReply}
                    onShowInChat={scrollToMessage}
                />
            )}

            <FloatingBackButton onClick={onClose} />

            <div className="fixed top-0 left-0 right-0 z-[50] pointer-events-none flex justify-center pt-[calc(env(safe-area-inset-top)+12px)]">
                <div className="pointer-events-auto flex flex-col items-center justify-center px-6 py-1.5 rounded-full min-w-[160px] transform-gpu transition-all active:scale-95" style={chatGlassStyle}>
                    <span className="text-[17px] font-bold text-white truncate max-w-[140px] text-center drop-shadow-sm">{otherUser ? otherUser.name : 'Чат'}</span>
                    <div className="h-4 flex items-center justify-center">
                        {isOtherTyping ? (
                            <span className="text-[12px] font-bold text-[#007AFF] animate-pulse flex items-center gap-1">
                                печатает<span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                            </span>
                        ) : (
                            <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-widest opacity-80">
                                {otherUser?.role === 'COURIER' ? 'Курьер' : 'Заказчик'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="fixed top-0 right-0 z-[50] pt-[calc(env(safe-area-inset-top)+12px)] pr-3 pointer-events-none">
                <div className="w-[42px] h-[42px] rounded-full overflow-hidden shadow-lg pointer-events-auto flex items-center justify-center transform-gpu" style={chatGlassStyle}>
                    {otherUser ? <img src={otherUser.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-white/5" />}
                </div>
            </div>

            <div className="flex flex-col h-full bg-[#000] relative overflow-hidden">
                <div className={`absolute inset-0 flex items-center justify-center bg-black z-40 transition-opacity duration-500 ${isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="w-8 h-8 border-2 border-white/20 border-t-[#007AFF] rounded-full animate-spin"></div>
                </div>

                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className={`flex-1 overflow-y-auto scrolling-touch px-3 flex flex-col-reverse transition-all duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                    style={{ 
                        overscrollBehaviorY: 'contain',
                        transform: 'translateZ(0)',
                        willChange: 'transform',
                        WebkitTouchCallout: 'none',
                        // KEY FIX: Explicitly set touch-action to pan-y to help browser prevent jitter
                        touchAction: 'pan-y'
                    }}
                >
                    {/* SPACER FOR BOTTOM INPUT */}
                    <div 
                        style={{ 
                            height: isInputFocused 
                                ? `${inputHeight + 12}px` 
                                : `calc(${inputHeight}px + 12px + env(safe-area-inset-bottom))`,
                            flexShrink: 0 
                        }} 
                    />

                    {/* MESSAGES REVERSED */}
                    {messages.slice().reverse().map(msg => (
                        <ChatBubble 
                            key={msg.id} 
                            message={msg} 
                            isMine={msg.senderId === currentUser.id} 
                            onImageClick={(m) => setViewingMessage(m)}
                            onReply={handleReply}
                            onScrollToMessage={scrollToMessage}
                            otherUserName={otherUser?.name || 'Собеседник'}
                        />
                    ))}

                    {/* SAFETY NOTICE (Shown as the last item in flex-col-reverse, appearing at top) */}
                    {messages.length === 0 && <SafetyNotice />}

                    {/* TOP SPACER / HEADER */}
                    <div className="text-center text-[10px] text-neutral-500 py-6 font-bold uppercase tracking-widest opacity-50 mt-auto pt-[calc(env(safe-area-inset-top)+80px)]">
                        {order.title}
                    </div>
                </div>

                <div className={`${!animationFinished ? 'transition-transform duration-500' : ''} ${isReady ? '' : 'translate-y-[100%]'}`}>
                    <ChatInput 
                        onSend={handleSend}
                        onFileSelect={handleFileSelect}
                        onTyping={handleTyping}
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        currentUser={currentUser}
                        otherUserName={otherUser?.name}
                        onFocusChange={setIsInputFocused}
                        onHeightChange={setInputHeight}
                    />
                </div>
            </div>
        </SwipeableWrapper>
    );
};
