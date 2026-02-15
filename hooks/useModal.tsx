
import React, { useState, createContext, useContext, useCallback, useRef, useEffect } from 'react';

// Эта реализация полностью переработана для соответствия UX iOS-приложений.
// Включает полноценную физику свайпа, velocity-check (флик) и плавные анимации.

interface ModalContextType {
  showModal: (component: React.ReactNode, locked?: boolean) => void;
  hideModal: () => void;
  isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: React.ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // State to control if the modal can be dismissed by user gestures
  const [isLocked, setIsLocked] = useState(false);
  
  // Refs for DOM manipulation and gesture tracking
  const modalRef = useRef<HTMLDivElement>(null); // Backdrop
  const contentRef = useRef<HTMLDivElement>(null); // The card itself
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  
  const isModalOpen = modalContent !== null;

  // Cleanup helper
  const resetState = useCallback(() => {
    setModalContent(null);
    setIsVisible(false);
    setIsLocked(false);
    isDraggingRef.current = false;
  }, []);

  const showModal = useCallback((component: React.ReactNode, locked: boolean = false) => {
    setModalContent(component);
    setIsLocked(locked);
    
    // Slight delay to allow render before animating in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const hideModal = useCallback(() => {
    if (!contentRef.current) {
        resetState();
        return;
    }

    setIsVisible(false); // Triggers React state transition (fade out)
    
    // Animate OUT: Smoother curve for exit
    contentRef.current.style.transition = 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease, scale 0.5s cubic-bezier(0.32, 0.72, 0, 1)'; 
    contentRef.current.style.transform = 'translateY(100%) scale(0.95)';
    contentRef.current.style.opacity = '0';

    // Wait for animation to finish before unmounting (matched to duration)
    setTimeout(() => {
      resetState();
    }, 500); 
  }, [resetState]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // If locked, ignore backdrop clicks
    if (isLocked) return;

    if (modalRef.current && e.target === modalRef.current) {
      hideModal();
    }
  }, [hideModal, isLocked]);

  // --- GESTURE LOGIC ---

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // If locked, prevent swipe gestures completely
    if (!contentRef.current || isLocked) return;

    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    
    // Check if we are inside the scrollable content area
    const scrollContainer = contentRef.current.querySelector('.modal-scroll-content');
    const isInsideScroll = scrollContainer?.contains(target);
    
    // If inside scrollable area, only allow drag if we are at the very top (scrollTop === 0)
    if (isInsideScroll && scrollContainer) {
        if (scrollContainer.scrollTop > 0) return;
    }

    isDraggingRef.current = true;
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    startTimeRef.current = Date.now();

    // Disable transition during drag for 1:1 physics
    contentRef.current.style.transition = 'none';
  }, [isLocked]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !contentRef.current) return;

    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    
    // Calculate distance moved
    const deltaY = currentYRef.current - startYRef.current;

    // If pulling UP (deltaY < 0), we ignore to allow native scroll behavior
    if (deltaY < 0) {
        return;
    }

    // Pulling DOWN
    if (deltaY > 0) {
        // Prevent default only if we are effectively dragging the modal
        if (e.cancelable) e.preventDefault();

        // 1:1 movement with slight resistance calculation could go here, but 1:1 is standard for sheet dismiss
        const resistance = 1; 
        contentRef.current.style.transform = `translateY(${deltaY * resistance}px)`;
        
        // Dim the backdrop based on percentage of screen height
        if (modalRef.current) {
            const screenHeight = window.innerHeight;
            const progress = Math.min(1, deltaY / (screenHeight * 0.8));
            const opacity = Math.max(0, 0.4 * (1 - progress)); // Max opacity 0.4
            modalRef.current.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
        }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || !contentRef.current) return;
    isDraggingRef.current = false;

    const deltaY = currentYRef.current - startYRef.current;
    const timeDelta = Date.now() - startTimeRef.current;
    
    // Calculate velocity (pixels per ms)
    const velocity = Math.abs(deltaY / timeDelta);

    // THRESHOLDS - Specific Long Swipe
    const SCREEN_HEIGHT = window.innerHeight;
    
    // Increased threshold to 40% of screen height for safer accidental drags
    const DISTANCE_THRESHOLD = SCREEN_HEIGHT * 0.4; 
    
    // Stricter velocity check: must have dragged at least 100px and be fast
    const VELOCITY_THRESHOLD = 0.8; 

    const shouldClose = (deltaY > DISTANCE_THRESHOLD) || (deltaY > 100 && velocity > VELOCITY_THRESHOLD);

    if (shouldClose) {
        // ANIMATE OUT
        hideModal();
    } else {
        // SPRING BACK (Revert)
        // Restore transition with the iOS bounce curve
        contentRef.current.style.transition = 'transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)'; 
        contentRef.current.style.transform = ''; // Clear inline transform to revert to CSS state
        
        // Restore backdrop
        if (modalRef.current) {
            modalRef.current.style.transition = 'background-color 0.6s ease';
            modalRef.current.style.backgroundColor = ''; // Revert to class style
            
            // Clean up inline transition after animation
            setTimeout(() => {
                if (modalRef.current) modalRef.current.style.transition = '';
            }, 600);
        }
    }
  }, [hideModal]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      // If locked, prevent Escape key
      if (e.key === 'Escape' && isModalOpen && !isLocked) hideModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, hideModal, isLocked]);

  const value = { showModal, hideModal, isModalOpen };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modalContent && (
        <div
          ref={modalRef}
          onClick={handleOverlayClick}
          className={`
            fixed inset-0 z-[1000]
            flex items-end justify-center sm:items-center
            transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isVisible ? 'bg-black/40' : 'bg-transparent pointer-events-none'}
            backdrop-blur-[4px]
          `}
        >
          <div
            ref={contentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
              w-full
              /* MATCHING CHAT INPUT GLASS STYLE EXACTLY */
              bg-[rgba(20,20,20,0.4)] 
              backdrop-blur-[5px] 
              border-[0.5px] border-white/10
              shadow-[0_15px_40px_rgba(0,0,0,0.6)]
              
              /* INCREASED RADIUS to 56px (25% more than 44px) */
              rounded-[56px]
              
              flex flex-col
              overflow-hidden /* System fix for content overflow */
              max-h-[calc(100vh-60px)] sm:max-h-[calc(100vh-160px)]
              max-w-full sm:max-w-md
              /* SPRING ANIMATION STATES */
              transform-gpu will-change-transform
              transition-all duration-[700ms] cubic-bezier(0.175, 0.885, 0.32, 1.1)
              ${isVisible 
                ? 'translate-y-0 scale-100 opacity-100' 
                : 'translate-y-[110%] scale-[0.9] opacity-0'
              }
            `}
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: '0 8px 8px 8px', // Reduced margin for fuller feel
              ...(typeof window !== 'undefined' && window.innerWidth >= 640 && { 
                margin: 'auto',
                maxHeight: 'calc(100vh - 160px)'
              })
            }}
          >
            {/* Header / Handle (iOS Style) */}
            <div className="flex-shrink-0 relative h-7 w-full flex justify-center pt-2.5 cursor-grab active:cursor-grabbing touch-none z-50">
              {/* Handle Bar: Darker grey, slightly shorter */}
              {!isLocked && <div className="w-10 h-1 bg-[#5A5A5E]/60 rounded-full" />}
              
              {/* Close Button - EXACT iOS 26 SPEC */}
              {!isLocked && (
                <button
                    onClick={hideModal}
                    className="absolute top-4 right-4 w-[30px] h-[30px] flex items-center justify-center rounded-full bg-[#3A3A3C] transition-transform active:scale-90"
                >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-[#8E8E93]">
                        <path d="M1 13L13 1M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
              )}
            </div>
            
            {/* Scrollable Content */}
            <div 
                className="overflow-y-auto flex-1 modal-scroll-content px-1 pb-6 overscroll-contain relative z-10"
                style={{ overscrollBehaviorY: 'none' }}
            >
              {modalContent}
            </div>

            {/* Bottom Safe Area Spacer */}
            <div className="sm:hidden absolute bottom-0 left-0 right-0 h-6 bg-transparent pointer-events-none" />
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
