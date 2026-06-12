import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { Card } from '../ui/Card';
import CategoryModal from './CategoryModal';
import { formatCurrency } from '../../utils/formatCurrency';
import { Plus, Edit2 } from 'lucide-react';

export default function CategoryGrid() {
  const { categories, categorySpending } = useBudget();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddClick = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Budget Categories</h2>
        <button
          onClick={handleAddClick}
          className="flex items-center space-x-1 text-sm bg-accent text-primary px-3 py-1.5 rounded-lg hover:bg-accent-hover transition-colors font-medium"
        >
          <Plus size={16} />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const spent = categorySpending[category.id] || 0;
          const remaining = category.limit - spent;
          const percentUsed = Math.min(100, Math.round((spent / category.limit) * 100)) || 0;

          return (
            <Card key={category.id} className="group relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-1 h-full" 
                style={{ backgroundColor: category.color }}
              />
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                  <h3 className="font-medium text-text">{category.name}</h3>
                  <p className="text-sm text-text-muted">Limit: {formatCurrency(category.limit)}</p>
                </div>
                <button
                  onClick={() => handleEditClick(category)}
                  className="p-1.5 text-zinc-500 hover:text-accent opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="space-y-2 pl-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Spent: <span className="text-text">{formatCurrency(spent)}</span></span>
                  <span className={`font-medium ${remaining < 0 ? 'text-red-400' : 'text-accent'}`}>
                    {remaining < 0 ? 'Over: ' : 'Left: '}
                    {formatCurrency(Math.abs(remaining))}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentUsed > 90 ? 'bg-red-500' : 'bg-accent'}`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
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
