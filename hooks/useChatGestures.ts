import React, { useRef, useState, useCallback } from 'react';

interface UseChatGesturesProps {
    onReply: () => void;
    threshold?: number;
}

export const useChatGestures = ({ onReply, threshold = 50 }: UseChatGesturesProps) => {
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const isHorizontalRef = useRef<boolean | null>(null); // null = unknown, true = swipe, false = scroll
    const lastX = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isHorizontalRef.current = null;
        lastX.current = 0;
        setIsSwiping(false);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - touchStartX.current;
        const deltaY = currentY - touchStartY.current;

        // 1. Determine Axis in the first few pixels
        if (isHorizontalRef.current === null) {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            if (absX < 5 && absY < 5) return; // Not enough movement yet

            // Determine intent
            if (absX > absY) {
                // Horizontal Intent
                // Only allow LEFT swipe (deltaX < 0) for Reply.
                // RIGHT swipe (deltaX > 0) is reserved for "Go Back" (handled by parent/browser).
                if (deltaX < 0) {
                    isHorizontalRef.current = true;
                    setIsSwiping(true);
                } else {
                    isHorizontalRef.current = false; // Treat right swipe as non-bubble interaction
                }
            } else {
                // Vertical Intent -> Scroll
                isHorizontalRef.current = false;
            }
        }

        // 2. Handle Logic based on Axis
        if (isHorizontalRef.current) {
            // It's a valid Left Swipe on the message
            if (e.cancelable) e.preventDefault(); // Lock Y-Scroll
            
            // Logarithmic resistance
            // We want deltaX to map to translateX but with diminishing returns
            const rawDrag = deltaX; // negative value
            const resistance = 0.4;
            const drag = rawDrag * resistance;
            
            // Limit max drag visually
            const maxDrag = -100;
            const visualX = Math.max(maxDrag, drag);
            
            setTranslateX(visualX);
            lastX.current = visualX;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (isHorizontalRef.current && lastX.current < -threshold) {
            // Trigger Reply
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            onReply();
        }

        // Reset Physics
        setIsSwiping(false);
        setTranslateX(0);
        isHorizontalRef.current = null;
        lastX.current = 0;
    }, [onReply, threshold]);

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchEnd,
        },
        style: {
            transform: `translateX(${translateX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy spring back
            touchAction: 'pan-y' // Hint browser that Y is handled natively, X might be custom
        },
        isSwiping
    };
};