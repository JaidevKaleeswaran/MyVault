import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
