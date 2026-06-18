import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import TabNavigation from './components/layout/TabNavigation';
// Placeholders for tabs (to be implemented)
import HomeTab from './components/home/HomeTab';
import SummaryTab from './components/summary/SummaryTab';
import TransactionsTab from './components/transactions/TransactionsTab';
import { useCycleCheck } from './hooks/useCycleCheck';

function App() {
  useCycleCheck(); // Global hook for cycle logic
  
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="min-h-screen bg-primary text-text font-sans selection:bg-accent selection:text-primary">
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#18181b', // card background
            color: '#f3f4f6', // text
            border: '1px solid #27272a',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#18181b',
            },
          },
        }} 
      />
      
      <header className="py-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          My<span className="text-accent">Vault</span>
        </h1>
      </header>

      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-in fade-in duration-300">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'transactions' && <TransactionsTab />}
        </div>
      </main>
    </div>
  );
}

export default App;
