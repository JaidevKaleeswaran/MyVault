import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
