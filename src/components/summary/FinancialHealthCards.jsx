import React from 'react';
import { TrendingUp, DollarSign, PieChart, CreditCard } from 'lucide-react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * Detect recurring subscriptions from transactions (replaces RAG tool)
 */
function detectSubscriptions(transactions) {
  const subKeywords = /netflix|spotify|equinox|gym|icloud|apple|hulu|disney|prime|amazon prime|utility|internet|wifi|youtube|hbo|paramount|subscription/i;

  const subMap = new Map();
  (transactions || []).forEach(tx => {
    const desc = tx.description || '';
    if (tx.recurring || subKeywords.test(desc)) {
      if (!subMap.has(desc)) {
        subMap.set(desc, { name: desc, amount: Number(tx.amount) || 0 });
      }
    }
  });

  const subs = Array.from(subMap.values());
  const monthlyTotal = subs.reduce((sum, s) => sum + s.amount, 0);

  return {
    count: subs.length,
    monthlyTotal,
    formattedMonthlyTotal: formatCurrency(monthlyTotal),
    subscriptions: subs,
  };
}

export default function FinancialHealthCards() {
  const budgetState = useBudget();

  const subscriptions = detectSubscriptions(budgetState.transactions);

  const totalIncome = budgetState.totalIncome || 0;
  const totalSpent = budgetState.totalSpent || 0;
  const netCashFlow = totalIncome - totalSpent;
  const savingsRatePct = totalIncome > 0 ? `${((netCashFlow / totalIncome) * 100).toFixed(1)}%` : '0%';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs font-medium text-text-muted">Total Income</p>
          <p className="text-xl font-bold text-[#3a7056] mt-1">
            {formatCurrency(totalIncome)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Master Cycle Income</p>
        </div>
        <div className="p-3 bg-[#2e5b45]/15 rounded-lg text-[#3a7056]">
          <TrendingUp size={22} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs font-medium text-text-muted">Net Cash Flow</p>
          <p className={`text-xl font-bold mt-1 ${netCashFlow < 0 ? 'text-red-400' : 'text-accent'}`}>
            {formatCurrency(netCashFlow)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Income - Total Spent</p>
        </div>
        <div className="p-3 bg-accent/10 rounded-lg text-accent">
          <DollarSign size={22} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs font-medium text-text-muted">Savings Rate</p>
          <p className="text-xl font-bold text-accent mt-1">
            {savingsRatePct}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Of Total Income</p>
        </div>
        <div className="p-3 bg-accent/10 rounded-lg text-accent">
          <PieChart size={22} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs font-medium text-text-muted">Active Subscriptions</p>
          <p className="text-xl font-bold text-[#a48246] mt-1">
            {subscriptions.formattedMonthlyTotal}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">{subscriptions.count} Services</p>
        </div>
        <div className="p-3 bg-[#8c6d37]/15 rounded-lg text-[#a48246]">
          <CreditCard size={22} />
        </div>
      </div>
    </div>
  );
}
