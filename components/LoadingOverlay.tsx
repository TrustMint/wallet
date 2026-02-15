
import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1000] flex flex-col items-center justify-center space-y-6 transition-opacity duration-500 animate-fade-in"
    >
      <div className="relative">
        {/* Glow behind spinner */}
        <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full scale-150"></div>
        {/* Spinner Ring */}
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin relative z-10"></div>
      </div>
      
      {message && (
        <p className="text-white/60 font-medium text-[15px] animate-pulse tracking-wide text-center px-6">
          {message}
        </p>
      )}
    </div>
  );
};
