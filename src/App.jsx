import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import TabNavigation from './components/layout/TabNavigation';
import HomeTab from './components/home/HomeTab';
import SummaryTab from './components/summary/SummaryTab';
import TransactionsTab from './components/transactions/TransactionsTab';
import AIAssistantTab from './components/assistant/AIAssistantTab';
import LoginPage from './components/auth/LoginPage';
import VerifyEmailPage from './components/auth/VerifyEmailPage';
import { useCycleCheck } from './hooks/useCycleCheck';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LogOut } from 'lucide-react';

function MainApp() {
  useCycleCheck(); // Global hook for cycle logic
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('assistant');

  if (!user) {
    return <LoginPage />;
  }

  if (!user.emailVerified && !user.isGuest) {
    return <VerifyEmailPage />;
  }

  return (
    <div className="min-h-screen bg-primary text-text font-sans selection:bg-accent selection:text-primary">
      {/* Top Header */}
      <header className="py-4 px-6 border-b border-zinc-800 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-text">
            My<span className="text-accent">Vault</span>
          </h1>
        </div>

        {/* User Profile Badge & Logout */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#18181b] border border-zinc-800 px-3 py-1.5 rounded-full text-xs">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <span className="font-medium text-text">{user.displayName || user.email}</span>
            {user.isGuest && (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded">Guest</span>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            title="Log Out"
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-in fade-in duration-300">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'assistant' && <AIAssistantTab />}
          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'transactions' && <TransactionsTab />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f3f4f6',
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
      <MainApp />
    </AuthProvider>
  );
}
