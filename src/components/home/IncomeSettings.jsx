import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';

export default function IncomeSettings() {
  const { incomeInfo, dispatch } = useBudget();
  const [formData, setFormData] = useState({
    amount: incomeInfo.amount || '',
    frequency: incomeInfo.frequency || 'monthly',
    isBorrowed: incomeInfo.isBorrowed || false,
  });

  // Sync if context updates externally
  useEffect(() => {
    setFormData({
      amount: incomeInfo.amount,
      frequency: incomeInfo.frequency,
      isBorrowed: incomeInfo.isBorrowed,
    });
  }, [incomeInfo]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({
      type: 'SET_INCOME_INFO',
      payload: {
        amount: Number(formData.amount),
        frequency: formData.frequency,
        isBorrowed: formData.isBorrowed,
      }
    });
    toast.success('Income settings updated');
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text">Income / Allowance</h2>
        {formData.isBorrowed && (
          <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded-full font-medium border border-red-500/20">
            ⚠️ Repayable Debt
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-muted mb-1">Amount ($)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Frequency</label>
          <select
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
          >
            <option value="weekly">Weekly</option>
            <option value="bi-weekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="one-time">One-time</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="isBorrowed"
            name="isBorrowed"
            checked={formData.isBorrowed}
            onChange={handleChange}
            className="w-4 h-4 rounded border-zinc-700 text-accent bg-[#09090b] focus:ring-accent focus:ring-offset-[#18181b]"
          />
          <label htmlFor="isBorrowed" className="text-sm text-text-muted select-none cursor-pointer">
            Is this money borrowed? (Needs to be paid back)
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-accent text-primary font-medium py-2 rounded-lg hover:bg-accent-hover transition-colors mt-2"
        >
          Save Settings
        </button>
      </form>
    </Card>
  );
}
