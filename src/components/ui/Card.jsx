import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#18181b] border border-zinc-800 rounded-xl p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
