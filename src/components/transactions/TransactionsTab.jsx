import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';
import TransactionModal from './TransactionModal';
import ReceiptScannerModal from './ReceiptScannerModal';
import VoiceInputPanel from '../assistant/VoiceInputPanel';
import { speakTransactionDetails, stopSpeech } from '../../services/agents/voiceAgent';
import { processTransaction } from '../../services/agents/managerAgent';
import toast from 'react-hot-toast';
import { Plus, Edit2, Sparkles, Receipt, Volume2, VolumeX, Mic, Loader2 } from 'lucide-react';

export default function TransactionsTab() {
  const budgetState = useBudget();
  const { transactions, categories, dispatch } = budgetState;
  const [selectedTx, setSelectedTx] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [speakingTxId, setSpeakingTxId] = useState(null);

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  const getCategoryColor = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat ? cat.color : '#27272a';
  };

  const handleAddClick = () => {
    setSelectedTx(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (tx) => {
    setSelectedTx(tx);
    setIsModalOpen(true);
  };

  const handleSpeakTransaction = async (tx) => {
    if (speakingTxId === tx.id) {
      stopSpeech();
      setSpeakingTxId(null);
      return;
    }

    setSpeakingTxId(tx.id);
    const categoryName = getCategoryName(tx.categoryId);

    await speakTransactionDetails(tx, categoryName, {
      onStart: () => setSpeakingTxId(tx.id),
      onEnd: () => setSpeakingTxId(null),
      onError: (err) => {
        toast.error('Failed to play voice transaction.');
        setSpeakingTxId(null);
      },
    });
  };

  const handleVoiceTransaction = async (parsedData) => {
    setShowVoicePanel(false);
    try {
      const result = await processTransaction(parsedData, budgetState, dispatch);
      toast.success(result.message || 'Voice receipt transaction added!');
    } catch (err) {
      console.error('Voice transaction processing error:', err);
      toast.error('Failed to add voice transaction');
    }
  };

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Today';
    try {
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) ? d.toLocaleDateString() : String(dateStr);
    } catch {
      return String(dateStr);
    }
  };

  return (
    <Card className="min-h-[500px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text">Transactions</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowVoicePanel(!showVoicePanel)}
            className="flex items-center space-x-1.5 text-sm bg-violet-500/15 text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg hover:bg-violet-500/25 transition-colors font-medium"
          >
            <Mic size={16} className="text-violet-400" />
            <span>Speak Receipt</span>
          </button>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 text-sm bg-purple-500/15 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/25 transition-colors font-medium"
          >
            <Sparkles size={16} className="text-purple-400" />
            <span>Scan Receipt</span>
          </button>
          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1 text-sm bg-accent text-primary px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {showVoicePanel && (
        <VoiceInputPanel
          onTransactionReady={handleVoiceTransaction}
          onClose={() => setShowVoicePanel(false)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-text-muted border-b border-zinc-800">
            <tr>
              <th className="pb-3 font-medium px-4">Date</th>
              <th className="pb-3 font-medium px-4">Description</th>
              <th className="pb-3 font-medium px-4">Category</th>
              <th className="pb-3 font-medium px-4 text-right">Amount</th>
              <th className="pb-3 font-medium px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedTransactions.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-text-muted">
                  No transactions found.
                </td>
              </tr>
            )}
            {sortedTransactions.map(tx => (
              <tr key={tx.id} className="group hover:bg-[#09090b]/50 transition-colors">
                <td className="py-4 px-4 text-text-muted whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className="py-4 px-4 text-text font-medium flex items-center space-x-2">
                  <span>{tx.description}</span>
                  {tx.source === 'receipt_scan' && (
                    <span
                      title="Scanned from receipt"
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    >
                      <Receipt size={10} className="mr-1" /> Receipt
                    </span>
                  )}
                  {tx.source === 'voice' && (
                    <span
                      title="Added via voice receipt"
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    >
                      <Mic size={10} className="mr-1" /> Voice
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <span 
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-zinc-800"
                    style={{ color: getCategoryColor(tx.categoryId), borderColor: `${getCategoryColor(tx.categoryId)}40`, backgroundColor: `${getCategoryColor(tx.categoryId)}10` }}
                  >
                    {getCategoryName(tx.categoryId)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right font-medium text-text">
                  {formatCurrency(tx.amount)}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {/* Speaker Button - ElevenLabs TTS */}
                    <button
                      onClick={() => handleSpeakTransaction(tx)}
                      title="Speak transaction with ElevenLabs voice"
                      className={`p-1.5 rounded-md transition-all ${
                        speakingTxId === tx.id
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40 animate-pulse opacity-100'
                          : 'text-zinc-500 hover:text-violet-400 opacity-60 group-hover:opacity-100 hover:bg-zinc-800'
                      }`}
                    >
                      {speakingTxId === tx.id ? (
                        <VolumeX size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>

                    <button
                      onClick={() => handleEditClick(tx)}
                      className="p-1.5 text-zinc-500 hover:text-accent opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedTx}
      />

      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </Card>
  );
}


