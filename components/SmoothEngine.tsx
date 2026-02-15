
import React, { useEffect } from 'react';

/**
 * SMOOTH ENGINE (System Core)
 * 
 * Optimized for performance without breaking layout stacking contexts.
 */

export const SmoothEngine: React.FC = () => {
  useEffect(() => {
    const preventDefaultZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        // e.preventDefault(); 
      }
    };
    
    document.addEventListener('touchmove', preventDefaultZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventDefaultZoom);
    };
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --ease-ios: cubic-bezier(0.25, 0.1, 0.25, 1);
        --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      /* OPTIMIZED HARDWARE ACCELERATION */
      /* Only apply to elements explicitly needing performance boosts */
      .gpu-accelerated,
      .animate-fade-in,
      [class*="backdrop-blur"] {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000px;
        will-change: transform, opacity;
      }

      /* SMOOTH SCROLLING CONTAINER */
      .view-scroll-container {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
        overscroll-behavior-y: contain;
      }

      /* GLOBAL TRANSITION DEFAULTS */
      button, a, input {
        transition-timing-function: var(--ease-ios);
        transition-duration: 0.2s;
      }

      /* TAP HIGHLIGHT REMOVAL - CRITICAL FIX */
      * {
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
      }
      
      input:focus, textarea:focus, select:focus, button:focus {
        outline: none !important;
        box-shadow: none !important; /* Removes default browser glow if any */
      }

      /* AUTOFILL FIX: Removes white/yellow background flash on inputs */
      input:-webkit-autofill,
      input:-webkit-autofill:hover, 
      input:-webkit-autofill:focus, 
      input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 100px #1C1C1E inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 9999s ease-in-out 0s;
          background-color: transparent !important;
          background-clip: content-box !important;
      }

      /* TAP HIGHLIGHT REMOVAL */
      body {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `}} />
  );
};
