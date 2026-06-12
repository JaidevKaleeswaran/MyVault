import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useBudget } from '../../contexts/BudgetContext';
import toast from 'react-hot-toast';

export default function TransactionModal({ isOpen, onClose, transaction = null }) {
  const { categories, dispatch } = useBudget();
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const isEditing = !!transaction;

  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setFormData({
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          description: transaction.description,
          date: transaction.date,
        });
      } else {
        setFormData({
          amount: '',
          categoryId: categories.length > 0 ? categories[0].id : '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [isOpen, transaction, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    const payload = {
      amount: Number(formData.amount),
      categoryId: formData.categoryId,
      description: formData.description,
      date: formData.date,
    };

    if (isEditing) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...payload, id: transaction.id } });
      toast.success('Transaction updated');
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: { ...payload, id: Date.now().toString() } });
      toast.success('Transaction added');
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: transaction.id });
      toast.success('Transaction deleted');
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Edit Transaction' : 'Add Transaction'}
    >
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
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Category</label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
            required
          >
            {categories.length === 0 && <option value="">No categories available</option>}
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
            placeholder="e.g. Weekly groceries"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full bg-[#09090b] border border-zinc-700 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors [color-scheme:dark]"
            required
          />
        </div>

        <div className="pt-4 flex space-x-3">
          <button
            type="submit"
            className="flex-1 bg-accent text-primary font-medium py-2 rounded-lg hover:bg-accent-hover transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Add Transaction'}
          </button>
          
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 bg-red-500/10 text-red-500 border border-red-500/20 font-medium py-2 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
