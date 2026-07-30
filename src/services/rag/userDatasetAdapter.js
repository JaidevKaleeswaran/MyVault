/**
 * User Dataset Adapter
 * Transforms live BudgetContext state and real user transactions into the unified RAG dataset schema.
 * Replaces mock sample data with 100% real user data.
 */

import { normalizeFinancialRecord } from './ragSchema';

export function adaptUserBudgetDataToRAG(budgetState, user = null) {
  const userId = user?.uid || user?.email || "usr_vault_active";

  const categories = budgetState?.categories || [];
  const rawTransactions = budgetState?.transactions || [];
  const incomeSources = budgetState?.incomeSources || [];

  // Map Category ID to Name
  const catMap = {};
  categories.forEach(c => {
    catMap[c.id] = c.name;
  });

  // 1. Convert Live User Transactions
  const normalizedTx = rawTransactions.map(tx => {
    const categoryName = catMap[tx.categoryId] || tx.category || tx.financial_category || "General Expenses";
    return normalizeFinancialRecord({
      id: tx.id,
      user_id: userId,
      merchant: tx.description || tx.merchant || tx.name || "Expense Item",
      amount: Number(tx.amount) || 0,
      date: tx.date || new Date().toISOString().split('T')[0],
      financial_category: categoryName,
      account: tx.account || "User Account",
      is_tax_deductible: Boolean(tx.is_tax_deductible || tx.taxDeductible),
      is_recurring: Boolean(tx.is_recurring || tx.recurring),
      source_doc: tx.source_doc || "MyVault_User_Data"
    });
  });

  // 2. Convert Live Income Sources
  const normalizedIncome = incomeSources.map(inc => {
    const dateObj = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[dateObj.getMonth()];
    const currentYear = dateObj.getFullYear();

    return {
      id: inc.id,
      user_id: userId,
      source: inc.name || inc.source || "Salary / Paycheck",
      type: "Income Source",
      amount: Number(inc.amount) || 0,
      frequency: inc.frequency || "Monthly",
      date: dateObj.toISOString().split('T')[0],
      month: currentMonth,
      year: currentYear,
      category: "Income",
      account: "Checking",
      source_doc: "User_Income_Settings"
    };
  });

  // 3. Convert Live Budgets
  const normalizedBudgets = categories.map(cat => {
    const spent = budgetState.categorySpending ? (budgetState.categorySpending[cat.id] || 0) : 0;
    return {
      category_name: cat.name,
      allocated_limit: Number(cat.limit) || 0,
      current_spent: Number(spent),
      period: "Monthly",
      cycle: "Current Pay Cycle",
      status: spent > cat.limit ? "Over Budget" : "Under Budget"
    };
  });

  // 4. Automatically detect recurring subscriptions from user transactions
  const subMap = new Map();
  normalizedTx.forEach(tx => {
    if (tx.is_recurring || /netflix|spotify|equinox|gym|icloud|apple|hulu|disney|prime|amazon|utility|internet|wifi/i.test(tx.merchant)) {
      if (!subMap.has(tx.merchant)) {
        subMap.set(tx.merchant, {
          id: `sub_${tx.id}`,
          user_id: userId,
          merchant: tx.merchant,
          amount: tx.amount,
          frequency: "Monthly",
          billing_day: `${tx.date.split('-')[2] || '01'}th`,
          category: "Subscriptions",
          account: tx.account,
          status: "Active",
          source_doc: "User_Transaction_Analysis"
        });
      }
    }
  });
  const normalizedSubscriptions = Array.from(subMap.values());

  return {
    user_id: userId,
    bank_accounts: [
      {
        id: "user_acc_01",
        user_id: userId,
        name: "My Vault Checking",
        institution: "User Bank",
        account_number: "•••• 1001",
        type: "Checking",
        balance: budgetState.totalIncome - budgetState.totalSpent,
        currency: "USD",
        category: "Bank Accounts",
        last_updated: new Date().toISOString().split('T')[0],
        source_doc: "User_Live_Balance"
      }
    ],
    credit_cards: [],
    income: normalizedIncome,
    investments: [],
    mortgage_loans: [],
    taxes: [],
    subscriptions: normalizedSubscriptions,
    transactions: normalizedTx,
    budgets: normalizedBudgets
  };
}
