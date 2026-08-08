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
    bgColor = 'bg-[#2e5b45]/20';
    textColor = 'text-[#3a7056]';
    borderColor = 'border-[#2e5b45]/40';
    icon = '🟢';
    message = `${formatCurrency(leftToBudget)} Left to Budget`;
  } else if (leftToBudget === 0) {
    bgColor = 'bg-[#e7b956]/20';
    textColor = 'text-[#e7b956]';
    borderColor = 'border-[#e7b956]/40';
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
