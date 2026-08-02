import React, { createContext, useReducer, useContext } from 'react';
import { normalizeToMasterCycle, getCycleWindow, isWithinCycle } from '../utils/cycleUtils';

// Initial state with some default categories for demonstration
const initialState = {
  incomeSources: [],
  cycleStartDate: null, // ISO date string — anchor for pay-cycle window
  cycleFrequency: 'monthly', // The master cycle the budget operates on
  categories: [
    { id: '1', name: 'Bills', limit: 1000, color: '#facc15', endOfCycleAction: 'none' },
    { id: '2', name: 'Groceries', limit: 400, color: '#10b981', endOfCycleAction: 'none' },
    { id: '3', name: 'Entertainment', limit: 200, color: '#06b6d4', endOfCycleAction: 'none' },
  ],
  transactions: [],
};

const BudgetContext = createContext();

function budgetReducer(state, action) {
  switch (action.type) {
    case 'ADD_INCOME_SOURCE':
      return { ...state, incomeSources: [...state.incomeSources, action.payload] };
    case 'UPDATE_INCOME_SOURCE':
      return {
        ...state,
        incomeSources: state.incomeSources.map((source) =>
          source.id === action.payload.id ? { ...source, ...action.payload } : source
        ),
      };
    case 'DELETE_INCOME_SOURCE':
      return {
        ...state,
        incomeSources: state.incomeSources.filter((source) => source.id !== action.payload),
      };
    case 'SET_SALARY': {
      const salarySource = {
        id: action.payload.id || 'salary_source',
        name: action.payload.name || 'Primary Salary',
        amount: Number(action.payload.amount),
        frequency: action.payload.frequency || 'monthly',
        isBorrowed: false,
        isSalary: true,
      };

      const existingIndex = state.incomeSources.findIndex(
        (s) => s.isSalary || s.id === 'salary_source' || s.name.toLowerCase() === 'primary salary' || s.name.toLowerCase() === 'salary'
      );

      let updatedSources;
      if (existingIndex >= 0) {
        updatedSources = [...state.incomeSources];
        updatedSources[existingIndex] = { ...updatedSources[existingIndex], ...salarySource };
      } else {
        updatedSources = [salarySource, ...state.incomeSources];
      }

      return {
        ...state,
        incomeSources: updatedSources,
      };
    }
    case 'SET_CYCLE_CONFIG':

      return {
        ...state,
        cycleStartDate: action.payload.cycleStartDate !== undefined ? action.payload.cycleStartDate : state.cycleStartDate,
        cycleFrequency: action.payload.cycleFrequency !== undefined ? action.payload.cycleFrequency : state.cycleFrequency,
      };
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
      };
    case 'REPLACE_CATEGORIES': // Used by Quick-Fill (if replacing) or merging (if handled outside)
      return {
        ...state,
        categories: action.payload,
      };
    case 'ADD_TRANSACTION': {
      const newTx = {
        receipt_image_url: null,
        line_items: null,
        source: 'manual',
        ...action.payload, // caller can override defaults (e.g. source: 'receipt_scan')
      };
      return { ...state, transactions: [newTx, ...state.transactions] };
    }
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

  // Calculate normalized total income
  const totalIncome = state.incomeSources.reduce((sum, source) => {
    return sum + normalizeToMasterCycle(source.amount, source.frequency, state.cycleFrequency);
  }, 0);

  // Determine current cycle window
  const cycleWindow = getCycleWindow(state.cycleStartDate, state.cycleFrequency);

  // Filter transactions to the current cycle
  const currentCycleTransactions = state.transactions.filter(tx => isWithinCycle(tx.date, cycleWindow));

  // Calculate totals for the current cycle
  const totalSpent = currentCycleTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalAllocated = state.categories.reduce((sum, cat) => sum + Number(cat.limit), 0);
  const leftToBudget = totalIncome - totalAllocated;

  // Calculate spent per category for the current cycle
  const categorySpending = state.categories.reduce((acc, cat) => {
    acc[cat.id] = currentCycleTransactions
      .filter((tx) => tx.categoryId === cat.id)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    return acc;
  }, {});

  // Find primary salary income source if present
  const primarySalary = state.incomeSources.find(
    (s) => s.isSalary || s.id === 'salary_source' || s.name?.toLowerCase() === 'primary salary' || s.name?.toLowerCase() === 'salary'
  ) || null;

  const value = {
    ...state,
    dispatch,
    primarySalary,
    totalIncome,
    totalSpent,
    totalAllocated,
    leftToBudget,
    categorySpending,
    currentCycleWindow: cycleWindow,
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
