
import React from 'react';
import { useSwipeBack, SwipeBackShadow } from '../hooks/useSwipeBack';

interface SwipeableWrapperProps {
  children: React.ReactNode;
  onDismiss: () => void;
  zIndex?: number;
  id?: string;
  backgroundSelector?: string;
}

export const SwipeableWrapper: React.FC<SwipeableWrapperProps> = ({ children, onDismiss, zIndex = 150, id, backgroundSelector }) => {
  const { dragHandlers, pushedStyle, dragProgress } = useSwipeBack({
    onSwipeBack: onDismiss,
    enabled: true,
    backgroundSelector
  });

  return (
    <div
      id={id}
      {...dragHandlers}
      className="fixed inset-0 bg-black"
      style={{
        zIndex,
        ...pushedStyle,
        ...dragHandlers.style,
      }}
    >
      <SwipeBackShadow progress={dragProgress} />
      {children}
    </div>
  );
};
