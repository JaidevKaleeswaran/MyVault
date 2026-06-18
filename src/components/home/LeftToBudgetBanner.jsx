import React from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatCurrency } from '../../utils/formatCurrency';

export default function LeftToBudgetBanner() {
  const { totalIncome, leftToBudget } = useBudget();

  if (totalIncome === 0) return null;

  let bgColor = '';
  let textColor = '';
  let borderColor = '';
  let icon = '';
  let message = '';

  if (leftToBudget > 0) {
    bgColor = 'bg-[#10b981]/10';
    textColor = 'text-[#10b981]';
    borderColor = 'border-[#10b981]/20';
    icon = '🟢';
    message = `${formatCurrency(leftToBudget)} Left to Budget`;
  } else if (leftToBudget === 0) {
    bgColor = 'bg-[#facc15]/10';
    textColor = 'text-[#facc15]';
    borderColor = 'border-[#facc15]/20';
    icon = '✨';
    message = 'Perfect! Every dollar has a job.';
  } else {
    bgColor = 'bg-[#ef4444]/10';
    textColor = 'text-[#ef4444]';
    borderColor = 'border-[#ef4444]/20';
    icon = '🚨';
    message = `Over-allocated by ${formatCurrency(Math.abs(leftToBudget))}! Reduce your category limits.`;
  }

  return (
    <div className={`w-full rounded-xl border p-4 flex items-center justify-center space-x-3 shadow-sm mb-6 ${bgColor} ${borderColor} ${textColor}`}>
      <span className="text-xl">{icon}</span>
      <span className="font-semibold text-lg">{message}</span>
    </div>
  );
}
