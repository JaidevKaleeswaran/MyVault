import React, { createContext, useReducer, useEffect, useContext } from 'react';

// Initial state with some default categories for demonstration
const initialState = {
  incomeInfo: {
    amount: 0,
    frequency: 'monthly', // weekly, bi-weekly, monthly, one-time
    isBorrowed: false,
  },
  categories: [
    { id: '1', name: 'Bills', limit: 1000, color: '#facc15' }, // yellow
    { id: '2', name: 'Groceries', limit: 400, color: '#10b981' }, // emerald
    { id: '3', name: 'Entertainment', limit: 200, color: '#06b6d4' }, // cyan
  ],
  transactions: [],
};

const BudgetContext = createContext();

function budgetReducer(state, action) {
  switch (action.type) {
    case 'SET_INCOME_INFO':
      return { ...state, incomeInfo: { ...state.incomeInfo, ...action.payload } };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((cat) =>
          cat.id === action.payload.id ? { ...cat, ...action.payload } : cat
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((cat) => cat.id !== action.payload),
        // optionally remove transactions for this category or mark them as uncategorized
      };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((tx) =>
          tx.id === action.payload.id ? { ...tx, ...action.payload } : tx
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((tx) => tx.id !== action.payload),
      };
    case 'SET_FULL_STATE':
      return action.payload; // For hydrating from Firebase later
    default:
      return state;
  }
}

export function BudgetProvider({ children }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  // Calculate totals
  const totalIncome = state.incomeInfo.amount;
  const totalSpent = state.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalAllocated = state.categories.reduce((sum, cat) => sum + Number(cat.limit), 0);
  
  // Calculate spent per category
  const categorySpending = state.categories.reduce((acc, cat) => {
    acc[cat.id] = state.transactions
      .filter((tx) => tx.categoryId === cat.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    return acc;
  }, {});

  const value = {
    ...state,
    dispatch,
    totalIncome,
    totalSpent,
    totalAllocated,
    categorySpending,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
