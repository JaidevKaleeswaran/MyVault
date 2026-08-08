import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TabNavigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'assistant', label: 'AI Assistant', isAi: true },
    { id: 'summary', label: 'Summary' },
    { id: 'transactions', label: 'Expenses' },
  ];

  return (
    <nav className="border-b border-border bg-primary sticky top-0 z-10 pt-2 sm:pt-4">
      <div className="flex justify-center max-w-6xl mx-auto px-2 sm:px-4">
        <div className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar whitespace-nowrap text-xs sm:text-sm px-1 py-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 sm:pb-4 px-2 sm:px-3 font-medium transition-colors duration-200 relative shrink-0 ${
                activeTab === tab.id
                  ? 'text-accent'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.isAi && <Sparkles size={14} className="text-accent animate-pulse" />}
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-t-md"></span>
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
