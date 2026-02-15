
import React, { useState, useRef, useCallback, useEffect } from 'react';

// === ПРОФЕССИОНАЛЬНЫЕ ПАРАМЕТРЫ СВАЙПА ===
const SWIPE_CONFIG = {
  // Пороги жестов
  MOVEMENT_THRESHOLD: 5, // Чуть увеличил порог, чтобы избежать ложных срабатываний
  HORIZONTAL_BIAS: 1.5,
  COMPLETION_THRESHOLD: 0.5, 
  VELOCITY_THRESHOLD: 0.4,
  MIN_FLING_DISTANCE: 30, 
  EDGE_THRESHOLD: 50,
  
  // Визуальные эффекты (Параллакс)
  PARALLAX_OFFSET: 25, // % сдвига заднего фона
  SHADOW_OPACITY: 0.25,
  SCREEN_CORNER_RADIUS: '58px',
  
  // Физика анимации
  RETURN_ANIMATION_DURATION: 250, 
  COMPLETION_ANIMATION_DURATION: 200,
  VELOCITY_SMOOTHING: 0.6,
  
  // Настройки определения жестов
  TOUCH_HISTORY_SIZE: 10,
  VELOCITY_SAMPLES: 4,
} as const;

interface UseSwipeBackProps {
  onSwipeBack: () => void;
  enabled: boolean;
  swipeThreshold?: number;
  backgroundSelector?: string; // Восстановлено для параллакса
}

interface TouchInfo {
  x: number;
  y: number;
  time: number;
}

interface SwipeMetrics {
  distance: number;
  progress: number;
  velocity: number;
  isComplete: boolean;
  shouldComplete: boolean;
}

export const useSwipeBack = ({ 
  onSwipeBack, 
  enabled,
  swipeThreshold = SWIPE_CONFIG.COMPLETION_THRESHOLD,
  backgroundSelector = 'main > .absolute.z-0' // Селектор по умолчанию
}: UseSwipeBackProps) => {
  const [touchStart, setTouchStart] = useState<TouchInfo | null>(null);
  const [gestureType, setGestureType] = useState<'undecided' | 'swipe' | 'scroll' | 'tap'>('undecided');
  const [dragDistance, setDragDistance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const screenRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const touchHistoryRef = useRef<TouchInfo[]>([]);
  
  const isScrollLockedRef = useRef(false);

  // --- PARALLAX EFFECT LOGIC ---
  const updateBackgroundPosition = useCallback((progress: number) => {
    const backgroundEl = document.querySelector(backgroundSelector) as HTMLElement;
    if (backgroundEl) {
        // Сдвигаем фон от -25% до 0%
        const offset = -SWIPE_CONFIG.PARALLAX_OFFSET + (Math.min(1, progress) * SWIPE_CONFIG.PARALLAX_OFFSET);
        backgroundEl.style.transform = `translateX(${offset}%)`;
        backgroundEl.style.transition = 'none'; // Отключаем плавность CSS при драге
        // Дополнительная фиксация, чтобы фон не прыгал
        backgroundEl.style.willChange = 'transform';
    }
  }, [backgroundSelector]);

  const resetBackgroundPosition = useCallback(() => {
    const backgroundEl = document.querySelector(backgroundSelector) as HTMLElement;
    if (backgroundEl) {
        backgroundEl.style.transform = '';
        backgroundEl.style.transition = '';
        backgroundEl.style.willChange = '';
    }
  }, [backgroundSelector]);

  // --- SCROLL LOCKING ---
  // Блокируем вообще всё движение body, чтобы приложение не "ездило"
  const lockScroll = useCallback(() => {
    if (isScrollLockedRef.current) return;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none'; // Важно для блокировки "резинки" браузера
    document.body.style.touchAction = 'none';
    isScrollLockedRef.current = true;
  }, []);

  const unlockScroll = useCallback(() => {
    if (!isScrollLockedRef.current) return;
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    document.body.style.touchAction = '';
    isScrollLockedRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      unlockScroll();
      resetBackgroundPosition();
    };
  }, [unlockScroll, resetBackgroundPosition]);

  const getScreenWidth = useCallback(() => screenRef.current?.offsetWidth || window.innerWidth, []);

  const calculateSwipeMetrics = useCallback((distance: number): SwipeMetrics => {
    const screenWidth = getScreenWidth();
    const progress = Math.max(0, Math.min(1, distance / screenWidth));
    const velocity = Math.abs(velocityRef.current);
    const shouldComplete = progress >= swipeThreshold || (velocity >= SWIPE_CONFIG.VELOCITY_THRESHOLD && distance >= SWIPE_CONFIG.MIN_FLING_DISTANCE);
    return { distance, progress, velocity, isComplete: progress >= swipeThreshold, shouldComplete };
  }, [getScreenWidth, swipeThreshold]);

  const calculateVelocity = useCallback((currentTouch: TouchInfo): number => {
    const history = touchHistoryRef.current;
    if (history.length < 2) return 0;
    const recent = history.slice(-SWIPE_CONFIG.VELOCITY_SAMPLES);
    let totalV = 0;
    for (let i = 1; i < recent.length; i++) {
      const dt = recent[i].time - recent[i - 1].time;
      if (dt > 0) totalV += (recent[i].x - recent[i - 1].x) / dt;
    }
    return totalV / (recent.length - 1);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled || isAnimating) return;
    const target = e.target as HTMLElement;
    // Don't start swipe if interacting with sliders, maps or specific inputs
    if (target.closest('[data-no-swipe], input[type="range"], .leaflet-container')) return;
    
    const touch = e.touches[0];
    const info: TouchInfo = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    
    setTouchStart(info);
    setGestureType('undecided');
    setDragDistance(0);
    velocityRef.current = 0;
    touchHistoryRef.current = [info];
  }, [enabled, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart || isAnimating) return;
    const touch = e.touches[0];
    const currentTouch: TouchInfo = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    touchHistoryRef.current.push(currentTouch);
    if (touchHistoryRef.current.length > SWIPE_CONFIG.TOUCH_HISTORY_SIZE) touchHistoryRef.current.shift();
    
    const rawV = calculateVelocity(currentTouch);
    velocityRef.current = SWIPE_CONFIG.VELOCITY_SMOOTHING * velocityRef.current + (1 - SWIPE_CONFIG.VELOCITY_SMOOTHING) * rawV;

    if (gestureType === 'swipe') {
      const screenWidth = getScreenWidth();
      let dist = deltaX;
      if (deltaX < 0) dist = deltaX * 0.15; // Resistance when dragging left (rubber band)
      setDragDistance(dist);
      
      // Обновляем параллакс
      updateBackgroundPosition(Math.max(0, dist / screenWidth));
      
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (gestureType === 'undecided') {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Ignore small jitter
      if (absX < SWIPE_CONFIG.MOVEMENT_THRESHOLD && absY < SWIPE_CONFIG.MOVEMENT_THRESHOLD) return;
      
      // Determine intention: Horizontal Swipe vs Vertical Scroll
      if (absX > absY * SWIPE_CONFIG.HORIZONTAL_BIAS && deltaX > 0) {
        // --- KEYBOARD DISMISSAL ---
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setGestureType('swipe');
        setDragDistance(deltaX);
        lockScroll(); // БЛОКИРУЕМ СКРОЛЛ И ДВИЖЕНИЕ BODY
        
        if (e.cancelable) e.preventDefault();
      } else if (absY > absX) {
        setGestureType('scroll');
      }
    }
  }, [touchStart, gestureType, isAnimating, calculateVelocity, lockScroll, updateBackgroundPosition, getScreenWidth]);

  const animateTo = useCallback((startDist: number, targetDist: number, duration: number, callback?: () => void) => {
    const startTime = performance.now();
    const screenWidth = getScreenWidth();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      
      // Cubic Out Easing
      const easedT = 1 - Math.pow(1 - t, 3);
      
      const currentDist = startDist + (targetDist - startDist) * easedT;
      setDragDistance(currentDist);
      
      // Анимация параллакса
      updateBackgroundPosition(Math.max(0, currentDist / screenWidth));

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        if (callback) callback();
        else setIsAnimating(false);
      }
    };
    
    setIsAnimating(true);
    animationFrameRef.current = requestAnimationFrame(step);
  }, [getScreenWidth, updateBackgroundPosition]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || gestureType !== 'swipe') {
      setTouchStart(null); setGestureType('undecided'); setDragDistance(0);
      unlockScroll(); resetBackgroundPosition(); return;
    }

    const metrics = calculateSwipeMetrics(dragDistance);
    const screenWidth = getScreenWidth();

    if (metrics.shouldComplete) {
      // Animate out completely
      animateTo(dragDistance, screenWidth, SWIPE_CONFIG.COMPLETION_ANIMATION_DURATION, () => {
        onSwipeBack();
        unlockScroll();
        resetBackgroundPosition();
        setIsAnimating(false);
        setDragDistance(0);
      });
    } else {
      // Spring back to 0
      animateTo(dragDistance, 0, SWIPE_CONFIG.RETURN_ANIMATION_DURATION, () => {
        unlockScroll();
        resetBackgroundPosition();
        setIsAnimating(false);
        setDragDistance(0);
      });
    }

    setTouchStart(null);
    setGestureType('undecided');
  }, [gestureType, dragDistance, touchStart, calculateSwipeMetrics, getScreenWidth, animateTo, onSwipeBack, unlockScroll, resetBackgroundPosition]);

  const isDragging = gestureType === 'swipe' && dragDistance > 0;
  const metrics = calculateSwipeMetrics(dragDistance);
  
  const pushedStyle: React.CSSProperties = {
    transform: `translateX(${dragDistance}px)`,
    transition: 'none', 
    touchAction: 'none',
    overscrollBehavior: 'none',
    zIndex: 1000,
    // Native rounding during swipe
    borderTopLeftRadius: (isDragging || isAnimating) ? SWIPE_CONFIG.SCREEN_CORNER_RADIUS : '0',
    borderBottomLeftRadius: (isDragging || isAnimating) ? SWIPE_CONFIG.SCREEN_CORNER_RADIUS : '0',
    overflow: 'hidden'
  };
  
  return {
    dragHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      ref: screenRef,
      style: { touchAction: 'pan-y' } as React.CSSProperties
    },
    pushedStyle,
    isDragging,
    isAnimating,
    dragProgress: metrics.progress
  };
};

export const SwipeBackShadow: React.FC<{ progress: number }> = ({ progress }) => {
  const opacity = Math.min(SWIPE_CONFIG.SHADOW_OPACITY, progress * 1.5);
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: '-20px', bottom: 0, width: '20px',
        background: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 100%)',
        opacity, pointerEvents: 'none', zIndex: 1001,
      }}
    />
  );
};
