import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatCurrency';
import TransactionModal from './TransactionModal';
import ReceiptScannerModal from './ReceiptScannerModal';
import { Plus, Edit2, Sparkles, Receipt } from 'lucide-react';

export default function TransactionsTab() {
  const { transactions, categories } = useBudget();
  const [selectedTx, setSelectedTx] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <Card className="min-h-[500px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text">Transactions</h2>
        <div className="flex items-center space-x-2">
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-text-muted border-b border-zinc-800">
            <tr>
              <th className="pb-3 font-medium px-4">Date</th>
              <th className="pb-3 font-medium px-4">Description</th>
              <th className="pb-3 font-medium px-4">Category</th>
              <th className="pb-3 font-medium px-4 text-right">Amount</th>
              <th className="pb-3 font-medium px-4 w-10"></th>
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
                  {new Date(tx.date).toLocaleDateString()}
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
                  <button
                    onClick={() => handleEditClick(tx)}
                    className="p-1.5 text-zinc-500 hover:text-accent opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                  >
                    <Edit2 size={16} />
                  </button>
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

