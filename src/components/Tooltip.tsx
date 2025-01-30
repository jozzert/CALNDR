import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipButtonProps {
  children: React.ReactNode;
}

interface TooltipPanelProps {
  children: React.ReactNode;
}

const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative">{children}</div>
    </TooltipContext.Provider>
  );
}

Tooltip.Button = function TooltipButton({ children }: TooltipButtonProps) {
  const { setIsOpen } = React.useContext(TooltipContext);
  
  return (
    <div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className="w-full"
    >
      {children}
    </div>
  );
};

Tooltip.Panel = function TooltipPanel({ children }: TooltipPanelProps) {
  const { isOpen } = React.useContext(TooltipContext);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute z-50 left-0 -translate-y-full mt-1 top-0"
    >
      {children}
    </div>
  );
};