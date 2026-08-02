import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import { Edit2, Plus, DollarSign, Briefcase, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import IncomeSourceModal from './IncomeSourceModal';
import SalaryModal from './SalaryModal';

export default function IncomeSettings() {
  const { incomeSources, primarySalary, cycleStartDate, cycleFrequency, totalIncome, dispatch } = useBudget();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);

  const [cycleConfig, setCycleConfig] = useState({
    frequency: cycleFrequency || 'monthly',
    startDate: cycleStartDate ? cycleStartDate.split('T')[0] : new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setCycleConfig({
      frequency: cycleFrequency,
      startDate: cycleStartDate ? cycleStartDate.split('T')[0] : new Date().toISOString().split('T')[0]
    });
  }, [cycleFrequency, cycleStartDate]);

  const handleCycleChange = (e) => {
    const { name, value } = e.target;
    setCycleConfig(prev => ({ ...prev, [name]: value }));
    
    // Dispatch whenever it changes
    dispatch({
      type: 'SET_CYCLE_CONFIG',
      payload: {
        cycleFrequency: name === 'frequency' ? value : cycleConfig.frequency,
        cycleStartDate: name === 'startDate' ? value : cycleConfig.startDate,
      }
    });
  };

  const handleAddClick = () => {
    setSelectedSource(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (source) => {
    setSelectedSource(source);
    setIsModalOpen(true);
  };

  return (
    <Card className="h-full flex flex-col space-y-6">
      {/* Primary Salary Featured Box */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Briefcase size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
                Primary Salary
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-medium">Main</span>
              </h3>
              <p className="text-xs text-text-muted">
                {primarySalary ? `${primarySalary.name} • ${primarySalary.frequency}` : 'No base salary configured'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSalaryModalOpen(true)}
            className="flex items-center space-x-1 text-xs bg-emerald-500 text-black px-3 py-1.5 rounded-lg hover:bg-emerald-400 transition-colors font-semibold shadow-sm"
          >
            <DollarSign size={14} />
            <span>{primarySalary ? 'Edit Salary' : 'Set Salary'}</span>
          </button>
        </div>

        {primarySalary && (
          <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-baseline">
            <span className="text-xs text-zinc-400">Salary Amount</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(primarySalary.amount)} <span className="text-xs font-normal text-zinc-400">/ {primarySalary.frequency}</span></span>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-text mb-4">Cycle Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Master Cycle Frequency</label>
            <select
              name="frequency"
              value={cycleConfig.frequency}
              onChange={handleCycleChange}
              className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
            >
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Cycle Start Date</label>
            <input
              type="date"
              name="startDate"
              value={cycleConfig.startDate}
              onChange={handleCycleChange}
              className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text">Income Sources</h2>
          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1 text-sm bg-accent text-primary px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>

        <div className="space-y-3">
          {incomeSources.length === 0 ? (
             <div className="py-6 text-center border border-dashed border-zinc-700 rounded-xl">
               <p className="text-text-muted text-sm">No income sources yet.</p>
             </div>
          ) : (
            incomeSources.map(source => (
              <div key={source.id} className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 flex justify-between items-center group">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-sm text-text">{source.name}</h3>
                    {source.isSalary && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Salary
                      </span>
                    )}
                    {source.isBorrowed && (
                      <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">
                        Debt
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatCurrency(source.amount)} / {source.frequency}
                  </p>
                </div>
                <button
                  onClick={() => handleEditClick(source)}
                  className="p-1.5 text-zinc-500 hover:text-accent opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <div className="flex justify-between items-end">
          <p className="text-sm text-text-muted">Total for Cycle</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      <IncomeSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source={selectedSource}
      />

      <SalaryModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
      />
    </Card>
  );
}

