import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import CategoryModal from './CategoryModal';
import { formatCurrency } from '../../utils/formatCurrency';
import { Plus, Edit2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CategoryGrid() {
  const { categories, categorySpending, totalIncome, dispatch } = useBudget();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);

  const handleAddClick = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleQuickFill = (templateType) => {
    if (totalIncome === 0) {
      toast.error('Set up your income first to use Quick-Fill.');
      setIsQuickFillOpen(false);
      return;
    }

    let splits = [];
    if (templateType === 'balanced') {
      splits = [
        { name: 'Savings', percent: 0.40, color: '#3b82f6', endOfCycleAction: 'rollover' },
        { name: 'Food', percent: 0.25, color: '#10b981', endOfCycleAction: 'none' },
        { name: 'Gas/Transport', percent: 0.15, color: '#facc15', endOfCycleAction: 'none' },
        { name: 'Entertainment', percent: 0.10, color: '#06b6d4', endOfCycleAction: 'none' },
        { name: 'Shopping', percent: 0.10, color: '#a855f7', endOfCycleAction: 'none' },
      ];
    } else if (templateType === 'savings') {
      splits = [
        { name: 'Savings', percent: 0.60, color: '#3b82f6', endOfCycleAction: 'rollover' },
        { name: 'Food', percent: 0.15, color: '#10b981', endOfCycleAction: 'none' },
        { name: 'Gas/Transport', percent: 0.15, color: '#facc15', endOfCycleAction: 'none' },
        { name: 'Ent/Shopping', percent: 0.10, color: '#a855f7', endOfCycleAction: 'none' },
      ];
    }

    const newCategories = splits.map(split => ({
      id: `qf-${Date.now()}-${Math.random()}`,
      name: split.name,
      limit: Math.round(totalIncome * split.percent),
      color: split.color,
      endOfCycleAction: split.endOfCycleAction,
    }));

    // Merge/Add alongside existing categories
    dispatch({ type: 'REPLACE_CATEGORIES', payload: [...categories, ...newCategories] });
    toast.success(`${templateType === 'balanced' ? 'Balanced' : 'Savings-First'} template added`);
    setIsQuickFillOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Budget Categories</h2>
        <div className="flex space-x-2 relative">
          <div className="relative">
            <button
              onClick={() => setIsQuickFillOpen(!isQuickFillOpen)}
              className="flex items-center space-x-1 text-sm bg-zinc-800 text-text px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors font-medium border border-zinc-700"
            >
              <span>Quick-Fill</span>
              <ChevronDown size={14} />
            </button>
            
            {isQuickFillOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#18181b] border border-zinc-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                <button
                  onClick={() => handleQuickFill('balanced')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors text-text"
                >
                  <div className="font-medium">Balanced</div>
                  <div className="text-xs text-text-muted">40% Save, 25% Food...</div>
                </button>
                <button
                  onClick={() => handleQuickFill('savings')}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors text-text border-t border-zinc-800"
                >
                  <div className="font-medium">Savings-First</div>
                  <div className="text-xs text-text-muted">60% Save, 15% Food...</div>
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleAddClick}
            className="flex items-center space-x-1 text-sm bg-accent text-primary px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors font-medium"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {isQuickFillOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsQuickFillOpen(false)} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const spent = categorySpending[category.id] || 0;
          const remaining = category.limit - spent;
          const percentUsed = Math.min(100, Math.round((spent / category.limit) * 100)) || 0;

          return (
            <Card key={category.id} className="group relative overflow-hidden flex flex-col">
              <div 
                className="absolute top-0 left-0 w-1 h-full" 
                style={{ backgroundColor: category.color }}
              />
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <h3 className="font-medium text-text">{category.name}</h3>
                </div>
                <button
                  onClick={() => handleEditClick(category)}
                  className="p-1.5 text-zinc-500 hover:text-accent opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="space-y-1 mb-4 pl-2 flex-grow">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Planned</span>
                  <span className="text-text font-medium">{formatCurrency(category.limit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Spent</span>
                  <span className="font-medium" style={{ color: category.color }}>{formatCurrency(spent)}</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-zinc-800/50 mt-1">
                  <span className="text-text-muted">Remaining</span>
                  <span className={`font-medium ${remaining < 0 ? 'text-red-400' : 'text-[#10b981]'}`}>
                    {remaining < 0 ? 'Over: ' : ''}{formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
              </div>
              
              <div className="pl-2">
                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden flex items-center mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentUsed > 100 ? 'bg-red-500' : 'bg-accent'}`}
                    style={{ width: `${Math.min(100, percentUsed)}%` }}
                  />
                </div>
                <div className="text-[10px] text-right text-text-muted">{percentUsed}%</div>
              </div>
            </Card>
          );
        })}

        {categories.length === 0 && (
          <div className="col-span-full py-8 text-center border border-dashed border-zinc-700 rounded-xl">
            <p className="text-text-muted mb-2">No budget categories yet.</p>
            <button
              onClick={handleAddClick}
              className="text-accent hover:underline text-sm"
            >
              Create your first category
            </button>
          </div>
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
      />
    </div>
  );
}
