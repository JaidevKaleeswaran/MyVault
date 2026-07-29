import React from 'react';

export default function TabNavigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'summary', label: 'Summary' },
    { id: 'transactions', label: 'Transactions' },
  ];

  return (
    <nav className="flex justify-center border-b border-zinc-800 bg-primary sticky top-0 z-10 pt-4">
      <div className="flex space-x-8 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 px-1 font-medium transition-colors duration-200 relative ${
              activeTab === tab.id
                ? 'text-accent'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
