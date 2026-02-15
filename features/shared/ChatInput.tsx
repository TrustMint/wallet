
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Icons } from '../../constants';
import { Message, User } from '../../types';

interface ChatInputProps {
    onSend: (text: string) => void;
    onFileSelect: (file: File) => void;
    onTyping: (text: string) => void;
    replyingTo: Message | null;
    onCancelReply: () => void;
    currentUser: User;
    otherUserName?: string;
    onFocusChange?: (isFocused: boolean) => void;
    onHeightChange?: (height: number) => void;
}

const UpArrowIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
);

export const ChatInput: React.FC<ChatInputProps> = ({ 
    onSend, 
    onFileSelect, 
    onTyping, 
    replyingTo, 
    onCancelReply,
    currentUser,
    otherUserName,
    onFocusChange,
    onHeightChange
}) => {
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Height Tracking
    useLayoutEffect(() => {
        const updateHeight = () => {
            if (containerRef.current && onHeightChange) {
                onHeightChange(containerRef.current.offsetHeight);
            }
        };

        const resizeObserver = new ResizeObserver(updateHeight);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        
        // Initial check
        updateHeight();

        return () => resizeObserver.disconnect();
    }, [onHeightChange, replyingTo, inputText]);

    const handleFocus = () => {
        setIsFocused(true);
        if (onFocusChange) onFocusChange(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (onFocusChange) onFocusChange(false);
    };

    const handleTyping = (text: string) => {
        setInputText(text);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto'; 
            const newHeight = Math.min(inputRef.current.scrollHeight, 220); 
            inputRef.current.style.height = `${newHeight}px`;
        }
        onTyping(text);
    };

    const handleSendClick = (e?: React.MouseEvent) => {
        // Prevent default to ensure focus isn't lost if triggered via click
        if (e) e.preventDefault();
        
        if (!inputText.trim()) return;
        onSend(inputText.trim());
        setInputText('');
        
        if (inputRef.current) {
            inputRef.current.style.height = '44px';
            // Crucial: Refocus or keep focus to prevent keyboard from closing
            inputRef.current.focus();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
            // Reset input so same file can be selected again if needed
            e.target.value = ''; 
        }
    };

    // Focus input when replying
    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    // Constant Glass Style (Reverted dynamic transparency)
    const glassStyle = {
        backgroundColor: 'rgba(20, 20, 20, 0.4)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
        border: '0.5px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
    };

    return (
        <div 
            ref={containerRef}
            // Removed transition-all to prevent "growing black space" artifact when keyboard opens
            className="fixed left-0 right-0 z-[100] px-3 pointer-events-none"
            style={{ 
                // When focused, strictly 0px to stick to keyboard.
                // When blurred, float with safe area.
                bottom: isFocused ? '0px' : 'calc(env(safe-area-inset-bottom) + 10px)',
            }}
        >
            <div className={`flex items-end gap-2 max-w-2xl mx-auto transition-all duration-300 ${isFocused ? 'pb-2' : 'pb-2'}`}>
                
                {/* + Button */}
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="pointer-events-auto w-[44px] h-[44px] rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-xl shrink-0 transform-gpu" 
                    style={glassStyle}
                >
                    <Icons.Plus />
                </button>
                
                {/* Input Container */}
                <div 
                    className="pointer-events-auto flex-1 relative flex flex-col rounded-[25px] overflow-hidden transition-all duration-300"
                    style={glassStyle}
                >
                    {/* REPLY PREVIEW BAR */}
                    {replyingTo && (
                        <div className="flex items-center justify-between pt-3 pb-1 pl-5 pr-2 bg-transparent animate-fade-in relative overflow-hidden">
                            {/* Vertical Line - shifted right (left-3) and rounded */}
                            <div className="absolute left-3 top-3 bottom-1 w-[3px] bg-[#0A84FF] rounded-full"></div>
                            
                            {/* Thumbnail in Input Preview */}
                            {replyingTo.imageUrl && (
                                <div className="w-9 h-9 rounded-md bg-black/30 overflow-hidden flex-shrink-0 mr-2 ml-1">
                                    <img src={replyingTo.imageUrl} className="w-full h-full object-cover" alt="reply thumb" />
                                </div>
                            )}

                            <div className={`flex-1 min-w-0 ${!replyingTo.imageUrl ? 'ml-1' : ''}`}>
                                <p className="text-[11px] text-[#0A84FF] font-bold uppercase truncate">
                                    {replyingTo.senderId === currentUser.id ? 'Вы' : otherUserName || 'Собеседник'}
                                </p>
                                <p className="text-[13px] text-white/80 truncate font-mono">
                                    {replyingTo.text || 'Фотография'}
                                </p>
                            </div>
                            <button 
                                onClick={onCancelReply}
                                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white"
                            >
                                <Icons.X />
                            </button>
                        </div>
                    )}

                    {/* Text Input - ENABLED NATIVE IOS FEATURES */}
                    <textarea
                        ref={inputRef}
                        value={inputText}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onChange={(e) => handleTyping(e.target.value)}
                        placeholder="Сообщение"
                        className="w-full bg-transparent py-[10px] pl-5 pr-14 text-white placeholder-neutral-500 focus:outline-none resize-none max-h-[220px] min-h-[44px] text-[17px] font-mono"
                        rows={1}
                        style={{ lineHeight: '24px' }}
                        autoComplete="on"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck="true"
                        inputMode="text"
                        enterKeyHint="send"
                    />
                    
                    {/* Send Button */}
                    <div className={`absolute right-1.5 bottom-[5px] transition-all duration-300 transform ${inputText.trim() ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                        <button 
                            // Prevent default mouse down behavior to stop focus loss (keep keyboard open)
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleSendClick} 
                            className="w-[34px] h-[34px] rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                        >
                            <div className="scale-75 flex items-center justify-center"><UpArrowIcon /></div>
                        </button>
                    </div>
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                    tabIndex={-1} 
                    aria-hidden="true" 
                />
            </div>
        </div>
    );
};
