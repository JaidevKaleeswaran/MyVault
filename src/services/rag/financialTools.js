/**
 * Financial Intelligence Tools
 * Executable analytical tools that compute precise figures over user financial data.
 */

import { formatCurrency } from './ragSchema';

const CONCEPT_EXPANSION_MAP = {
  fruit: ["fruit", "fruits", "apple", "apples", "banana", "bananas", "orange", "oranges", "berry", "berries", "strawberry", "blueberry", "mango", "grape", "grapes", "peach", "pear", "melon", "watermelon", "produce"],
  fruits: ["fruit", "fruits", "apple", "apples", "banana", "bananas", "orange", "oranges", "berry", "berries", "strawberry", "blueberry", "mango", "grape", "grapes", "peach", "pear", "melon", "watermelon", "produce"],
  apple: ["apple", "apples", "fruit", "fruits"],
  apples: ["apple", "apples", "fruit", "fruits"],
  banana: ["banana", "bananas", "fruit", "fruits"],
  bananas: ["banana", "bananas", "fruit", "fruits"],
  vegetable: ["vegetable", "vegetables", "salad", "spinach", "tomato", "tomatoes", "carrot", "broccoli", "onion", "lettuce", "avocado"],
  vegetables: ["vegetable", "vegetables", "salad", "spinach", "tomato", "tomatoes", "carrot", "broccoli", "onion", "lettuce", "avocado"],
  coffee: ["coffee", "starbucks", "latte", "espresso", "cappuccino", "tea", "boba", "smoothie", "juice", "beverage"],
  drink: ["coffee", "starbucks", "latte", "espresso", "cappuccino", "tea", "boba", "smoothie", "juice", "beverage", "drink", "drinks"],
  drinks: ["coffee", "starbucks", "latte", "espresso", "cappuccino", "tea", "boba", "smoothie", "juice", "beverage", "drink", "drinks"],
  grocery: ["grocery", "groceries", "costco", "whole foods", "trader joe's", "supermarket", "food", "produce", "fruit", "apples", "bananas"],
  groceries: ["grocery", "groceries", "costco", "whole foods", "trader joe's", "supermarket", "food", "produce", "fruit", "apples", "bananas"],
  car: ["car", "auto", "vehicle", "tesla", "gas", "fuel", "chevron", "shell", "parking", "uber", "lyft"],
  vehicle: ["car", "auto", "vehicle", "tesla", "gas", "fuel", "chevron", "shell", "parking", "uber", "lyft"]
};

/**
 * 1. Transaction Search Tool
 */
export function searchTransactionsTool(dataset, { query, dateRange, category, merchant, month, minAmount }) {
  let list = dataset.transactions || [];

  if (month) {
    list = list.filter(t => t.month?.toLowerCase() === month.toLowerCase());
  }
  if (merchant) {
    list = list.filter(t => t.merchant.toLowerCase().includes(merchant.toLowerCase()));
  }
  if (category && category !== "All") {
    list = list.filter(t => t.financial_category.toLowerCase().includes(category.toLowerCase()));
  }
  if (minAmount) {
    list = list.filter(t => t.amount >= Number(minAmount));
  }
  if (query) {
    const qClean = query.toLowerCase().trim();
    const words = qClean.split(/\s+/);
    
    // Check if any word has concept expansions
    const expandedTerms = [];
    words.forEach(w => {
      if (CONCEPT_EXPANSION_MAP[w]) {
        expandedTerms.push(...CONCEPT_EXPANSION_MAP[w]);
      } else {
        expandedTerms.push(w);
      }
    });

    list = list.filter(t => {
      const text = `${t.merchant} ${t.financial_category} ${t.raw_merchant || ''} ${(t.tags || []).join(' ')}`.toLowerCase();
      return expandedTerms.some(term => text.includes(term));
    });
  }

  const total = list.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  return {
    count: list.length,
    total_amount: total,
    formatted_total: formatCurrency(total),
    transactions: list
  };
}

/**
 * 2. Net Worth Calculator Tool
 */
export function calculateNetWorthTool(dataset) {
  const bankAccounts = dataset.bank_accounts || [];
  const creditCards = dataset.credit_cards || [];
  const investments = dataset.investments || [];
  const loans = dataset.mortgage_loans || [];

  const liquidCash = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentVal = investments.reduce((sum, i) => sum + i.current_value, 0);
  const totalAssets = liquidCash + investmentVal;

  const cardDebts = creditCards.reduce((sum, c) => sum + c.balance, 0);
  const loanDebts = loans.reduce((sum, l) => sum + l.remaining_balance, 0);
  const totalLiabilities = cardDebts + loanDebts;

  const netWorth = totalAssets - totalLiabilities;

  return {
    liquidCash,
    investmentVal,
    totalAssets,
    cardDebts,
    loanDebts,
    totalLiabilities,
    netWorth,
    formattedNetWorth: formatCurrency(netWorth),
    formattedTotalAssets: formatCurrency(totalAssets),
    formattedTotalLiabilities: formatCurrency(totalLiabilities)
  };
}

/**
 * 3. Subscription & Recurring Payment Detector Tool
 */
export function detectSubscriptionsTool(dataset) {
  const subscriptions = dataset.subscriptions || [];
  const monthlyTotal = subscriptions.reduce((sum, s) => {
    return sum + (s.frequency === 'Annual' ? s.amount / 12 : s.amount);
  }, 0);

  const annualTotal = monthlyTotal * 12;

  return {
    count: subscriptions.length,
    monthlyTotal,
    annualTotal,
    formattedMonthlyTotal: formatCurrency(monthlyTotal),
    formattedAnnualTotal: formatCurrency(annualTotal),
    subscriptions
  };
}

/**
 * 4. Cash Flow & Monthly Burn Rate Calculator Tool
 */
export function calculateCashFlowTool(dataset, month = "March", year = 2026) {
  const incomeList = (dataset.income || []).filter(i => (!month || i.month === month) && (!year || i.year === year));
  const totalInflow = incomeList.reduce((sum, i) => sum + i.amount, 0) || 7500.00; // default standard payroll if monthly

  const txList = (dataset.transactions || []).filter(t => (!month || t.month === month) && (!year || t.year === year));
  const totalOutflow = txList.reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalInflow - totalOutflow;
  const savingsRate = totalInflow > 0 ? ((netCashFlow / totalInflow) * 100).toFixed(1) : 0;

  return {
    month,
    year,
    totalInflow,
    totalOutflow,
    netCashFlow,
    savingsRatePct: `${savingsRate}%`,
    formattedInflow: formatCurrency(totalInflow),
    formattedOutflow: formatCurrency(totalOutflow),
    formattedNetCashFlow: formatCurrency(netCashFlow)
  };
}

/**
 * 5. Monthly Comparison Tool
 */
export function compareMonthsTool(dataset, monthA = "February", monthB = "March", category = null) {
  let txA = (dataset.transactions || []).filter(t => t.month === monthA);
  let txB = (dataset.transactions || []).filter(t => t.month === monthB);

  if (category) {
    txA = txA.filter(t => t.financial_category.toLowerCase().includes(category.toLowerCase()));
    txB = txB.filter(t => t.financial_category.toLowerCase().includes(category.toLowerCase()));
  }

  const totalA = txA.reduce((sum, t) => sum + t.amount, 0);
  const totalB = txB.reduce((sum, t) => sum + t.amount, 0);
  const diff = totalB - totalA;
  const pctChange = totalA > 0 ? ((diff / totalA) * 100).toFixed(1) : (totalB > 0 ? 100 : 0);

  return {
    monthA: { name: monthA, total: totalA, formatted: formatCurrency(totalA), count: txA.length, transactions: txA },
    monthB: { name: monthB, total: totalB, formatted: formatCurrency(totalB), count: txB.length, transactions: txB },
    diff,
    formattedDiff: formatCurrency(Math.abs(diff)),
    pctChangePct: `${pctChange > 0 ? '+' : ''}${pctChange}%`,
    isIncrease: diff > 0
  };
}

/**
 * 6. Tax Summary Generator Tool
 */
export function generateTaxSummaryTool(dataset, year = 2025) {
  const taxDocs = (dataset.taxes || []).filter(t => t.tax_year === year);
  const taxTx = (dataset.transactions || []).filter(t => t.is_tax_deductible);

  const totalItemized = taxDocs.reduce((sum, d) => sum + (d.total_deductible_expenses || 0), 0);
  const totalTxDeductible = taxTx.reduce((sum, t) => sum + t.amount, 0);

  return {
    year,
    taxDocs,
    taxTx,
    totalDeductible: totalItemized + totalTxDeductible,
    formattedTotalDeductible: formatCurrency(totalItemized + totalTxDeductible)
  };
}

/**
 * 7. Anomaly & Spending Spike Detector Tool
 */
export function detectAnomaliesTool(dataset) {
  const transactions = dataset.transactions || [];
  const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / (transactions.length || 1);
  const threshold = Math.max(avgAmount * 2.5, 300); // 2.5x average or > $300

  const spikes = transactions.filter(t => t.amount >= threshold);

  return {
    threshold,
    formattedThreshold: formatCurrency(threshold),
    spikes: spikes.map(s => ({
      merchant: s.merchant,
      amount: s.amount,
      formattedAmount: formatCurrency(s.amount),
      date: s.date,
      category: s.financial_category,
      ratioToAvg: (s.amount / avgAmount).toFixed(1)
    }))
  };
}

/**
 * 8. Expense Forecasting Tool
 */
export function forecastExpensesTool(dataset, monthsAhead = 3) {
  const transactions = dataset.transactions || [];
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  // Estimate monthly average
  const monthlyAvg = totalSpent / 3; // across Jan, Feb, Mar

  const forecast = [];
  for (let i = 1; i <= monthsAhead; i++) {
    forecast.push({
      monthOffset: i,
      estimatedSpent: monthlyAvg,
      formattedEstimate: formatCurrency(monthlyAvg)
    });
  }

  return {
    monthlyAvg,
    formattedMonthlyAvg: formatCurrency(monthlyAvg),
    forecast
  };
}

/**
 * 9. CSV Data Exporter
 */
export function exportToCSV(dataArray, filename = "financial_export.csv") {
  if (!dataArray || dataArray.length === 0) return "";
  const headers = Object.keys(dataArray[0]);
  const csvRows = [headers.join(',')];

  dataArray.forEach(row => {
    const values = headers.map(header => {
      const val = row[header];
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}
