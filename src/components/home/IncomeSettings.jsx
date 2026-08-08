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
    <div className="space-y-6">
      {/* ── Income Sources Widget ── */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-text">Income Sources</h2>
            <p className="text-xs text-text-muted mt-0.5">Base salary & additional earnings</p>
          </div>
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center space-x-1 text-xs bg-accent text-primary px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors font-semibold"
          >
            <Plus size={14} />
            <span>Add Source</span>
          </button>
        </div>

        {/* Primary Salary Row / Highlight */}
        <div className="space-y-3">
          {primarySalary ? (
            <div className="bg-[#2e5b45]/15 border border-[#2e5b45]/30 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#2e5b45]/25 text-[#3a7056] rounded-lg shrink-0">
                  <Briefcase size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-text">{primarySalary.name}</h3>
                    <span className="text-[10px] bg-[#2e5b45]/25 text-[#3a7056] px-1.5 py-0.2 rounded font-semibold border border-[#2e5b45]/30">
                      Primary Base
                    </span>
                  </div>
                  <p className="text-xs text-[#3a7056] font-semibold mt-0.5">
                    {formatCurrency(primarySalary.amount)} / {primarySalary.frequency}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSalaryModalOpen(true)}
                className="p-1.5 text-text-muted hover:text-accent transition-colors rounded-md hover:bg-primary flex items-center gap-1 text-xs"
                title="Edit Base Salary"
              >
                <Edit2 size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-[#2e5b45]/40 bg-[#2e5b45]/10 rounded-xl text-center space-y-2">
              <p className="text-xs text-text-muted">No primary base salary configured yet.</p>
              <button
                type="button"
                onClick={() => setIsSalaryModalOpen(true)}
                className="inline-flex items-center space-x-1.5 text-xs bg-[#2e5b45] text-white px-3.5 py-2 rounded-lg font-semibold hover:bg-[#3a7056] transition-colors shadow-sm"
              >
                <DollarSign size={14} />
                <span>Set Base Salary</span>
              </button>
            </div>
          )}

          {/* Other Income Sources List */}
          {incomeSources.filter(s => !s.isSalary && s.id !== 'salary_source' && s.name?.toLowerCase() !== 'primary salary').map(source => (
            <div key={source.id} className="bg-primary border border-border rounded-lg p-3 flex justify-between items-center group">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-sm text-text">{source.name}</h3>
                  {source.isBorrowed && (
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                      Debt
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatCurrency(source.amount)} / {source.frequency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleEditClick(source)}
                className="p-1.5 text-text-muted hover:text-accent transition-colors rounded-md hover:bg-card"
              >
                <Edit2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-border flex justify-between items-end">
          <p className="text-sm text-text-muted">Total Master Cycle Income</p>
          <p className="text-2xl font-bold text-accent">{formatCurrency(totalIncome)}</p>
        </div>
      </Card>

      {/* ── Cycle Configuration Widget ── */}
      <Card>
        <h2 className="text-xl font-semibold text-text mb-4">Cycle Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Master Cycle Frequency</label>
            <select
              name="frequency"
              value={cycleConfig.frequency}
              onChange={handleCycleChange}
              className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors text-sm"
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
              className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors text-sm [color-scheme:dark]"
            />
          </div>
        </div>
      </Card>

      <IncomeSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source={selectedSource}
      />

      <SalaryModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
      />
    </div>
  );
}

