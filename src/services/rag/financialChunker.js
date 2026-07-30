/**
 * Semantic Financial Chunker
 * Transforms normalized raw records into rich, semantic financial chunks:
 * - Monthly spending summaries
 * - Merchant spending histories
 * - Subscription histories
 * - Income & salary history
 * - Investment performance reports
 * - Mortgage & loan summaries
 * - Tax documents & deductible schedules
 * - Budget reports & variance summaries
 * - Large purchases & anomaly logs
 * - Annual financial summaries
 */

import { formatCurrency } from './ragSchema';

export function generateFinancialChunks(dataset) {
  const chunks = [];
  const userId = dataset.user_id || "usr_vault_88921";

  // 1. INDIVIDUAL TRANSACTION CHUNKS (With rich context)
  if (dataset.transactions && dataset.transactions.length > 0) {
    dataset.transactions.forEach(tx => {
      const taxText = tx.is_tax_deductible ? " (Tax Deductible Expense)" : "";
      const recurringText = tx.is_recurring ? " (Recurring Transaction)" : "";
      const text = `Transaction on ${tx.date} (${tx.month} ${tx.year}): Paid ${formatCurrency(tx.amount)} to ${tx.merchant} using account ${tx.account}. Category: ${tx.financial_category}.${taxText}${recurringText} Source document: ${tx.source_doc}. Tags: ${tx.tags.join(', ')}.`;

      chunks.push({
        id: `chunk_tx_${tx.id}`,
        chunk_type: "Transaction",
        chunk_text: text,
        metadata: {
          user_id: userId,
          category: "Transactions",
          financial_category: tx.financial_category,
          account: tx.account,
          merchant: tx.merchant,
          amount: tx.amount,
          date: tx.date,
          month: tx.month,
          year: tx.year,
          tags: tx.tags,
          is_tax_deductible: tx.is_tax_deductible || false,
          is_recurring: tx.is_recurring || false,
          source_doc: tx.source_doc
        },
        raw_record: tx
      });
    });

    // 2. MONTHLY SPENDING SUMMARIES PER CATEGORY & MONTH
    const monthlyCategoryMap = {};
    const merchantMap = {};

    dataset.transactions.forEach(tx => {
      const key = `${tx.month}_${tx.year}_${tx.financial_category}`;
      if (!monthlyCategoryMap[key]) {
        monthlyCategoryMap[key] = {
          month: tx.month,
          year: tx.year,
          category: tx.financial_category,
          total_spent: 0,
          transactions: []
        };
      }
      monthlyCategoryMap[key].total_spent += tx.amount;
      monthlyCategoryMap[key].transactions.push(tx);

      // Merchant Map
      const mKey = `${tx.merchant.toLowerCase()}_${tx.year}`;
      if (!merchantMap[mKey]) {
        merchantMap[mKey] = {
          merchant: tx.merchant,
          year: tx.year,
          total_spent: 0,
          tx_count: 0,
          transactions: []
        };
      }
      merchantMap[mKey].total_spent += tx.amount;
      merchantMap[mKey].tx_count += 1;
      merchantMap[mKey].transactions.push(tx);
    });

    Object.values(monthlyCategoryMap).forEach(group => {
      const txListStr = group.transactions
        .map(t => `${t.merchant} (${formatCurrency(t.amount)} on ${t.date})`)
        .join(', ');
      
      const text = `Monthly Spending Summary for ${group.category} in ${group.month} ${group.year}: Total spent was ${formatCurrency(group.total_spent)} across ${group.transactions.length} transactions. Breakdown: ${txListStr}.`;

      chunks.push({
        id: `chunk_monthly_cat_${group.month}_${group.year}_${group.category.replace(/\s+/g, '_')}`,
        chunk_type: "Monthly Spending Summary",
        chunk_text: text,
        metadata: {
          user_id: userId,
          category: "Transactions",
          financial_category: group.category,
          month: group.month,
          year: group.year,
          amount: group.total_spent,
          source_doc: "Aggregate_Monthly_Summary"
        },
        structured_data: group
      });
    });

    // 3. MERCHANT SPENDING HISTORY CHUNKS
    Object.values(merchantMap).forEach(mGroup => {
      const dates = mGroup.transactions.map(t => t.date).join(', ');
      const text = `Merchant Spending History for ${mGroup.merchant} in ${mGroup.year}: Total spent at ${mGroup.merchant} was ${formatCurrency(mGroup.total_spent)} across ${mGroup.tx_count} transactions. Transaction dates: ${dates}.`;

      chunks.push({
        id: `chunk_merchant_${mGroup.merchant.replace(/\s+/g, '_')}_${mGroup.year}`,
        chunk_type: "Merchant Spending History",
        chunk_text: text,
        metadata: {
          user_id: userId,
          category: "Merchant Information",
          merchant: mGroup.merchant,
          year: mGroup.year,
          amount: mGroup.total_spent,
          source_doc: "Aggregate_Merchant_History"
        },
        structured_data: mGroup
      });
    });
  }

  // 4. INCOME HISTORY CHUNKS
  if (dataset.income && dataset.income.length > 0) {
    let totalIncome = 0;
    const incomeDetails = dataset.income.map(inc => {
      totalIncome += inc.amount;
      return `${inc.source} (${inc.type}): ${formatCurrency(inc.amount)} on ${inc.date} deposited to ${inc.account}`;
    }).join('; ');

    const incomeText = `Income History & Salary Summary: Total recorded income is ${formatCurrency(totalIncome)}. Paystubs & deposits: ${incomeDetails}.`;

    chunks.push({
      id: "chunk_income_summary",
      chunk_type: "Income History",
      chunk_text: incomeText,
      metadata: {
        user_id: userId,
        category: "Income",
        amount: totalIncome,
        source_doc: "Paystubs_Summary"
      },
      structured_data: dataset.income
    });
  }

  // 5. INVESTMENT PERFORMANCE CHUNKS
  if (dataset.investments && dataset.investments.length > 0) {
    let totalPortfolioVal = 0;
    let totalGain = 0;
    const invDetails = dataset.investments.map(inv => {
      totalPortfolioVal += inv.current_value;
      totalGain += inv.unrealized_gain;
      return `${inv.asset_name} (${inv.symbol}): ${inv.shares} shares @ ${formatCurrency(inv.current_price)} = Value ${formatCurrency(inv.current_value)} (Gain: ${formatCurrency(inv.unrealized_gain)}, Account: ${inv.account})`;
    }).join('; ');

    const text = `Quarterly Investment Performance Report: Total Portfolio Value is ${formatCurrency(totalPortfolioVal)} with an overall unrealized gain of ${formatCurrency(totalGain)}. Asset Breakdown: ${invDetails}.`;

    chunks.push({
      id: "chunk_investment_report",
      chunk_type: "Quarterly Investment Report",
      chunk_text: text,
      metadata: {
        user_id: userId,
        category: "Investments",
        amount: totalPortfolioVal,
        source_doc: "Vanguard_Fidelity_Summary.pdf"
      },
      structured_data: dataset.investments
    });
  }

  // 6. MORTGAGE & LOAN CHUNKS
  if (dataset.mortgage_loans && dataset.mortgage_loans.length > 0) {
    dataset.mortgage_loans.forEach(loan => {
      const text = `${loan.category} Summary for ${loan.lender} (Account ${loan.account_number}): Original Principal ${formatCurrency(loan.original_principal)}, Remaining Balance ${formatCurrency(loan.remaining_balance)}, Monthly Payment ${formatCurrency(loan.monthly_payment)}, Interest Rate ${loan.interest_rate}%. Principal Paid YTD: ${formatCurrency(loan.principal_paid_ytd || 0)}, Interest Paid YTD: ${formatCurrency(loan.interest_paid_ytd || 0)}. Property/Collateral: ${loan.property_address || 'N/A'}. Source: ${loan.source_doc}.`;

      chunks.push({
        id: `chunk_loan_${loan.id}`,
        chunk_type: loan.category === "Mortgage" ? "Mortgage Summary" : "Loan History",
        chunk_text: text,
        metadata: {
          user_id: userId,
          category: loan.category,
          account: loan.lender,
          amount: loan.remaining_balance,
          source_doc: loan.source_doc
        },
        raw_record: loan
      });
    });
  }

  // 7. TAX DOCUMENTS & DEDUCTIBLE EXPENSES CHUNKS
  if (dataset.taxes && dataset.taxes.length > 0) {
    dataset.taxes.forEach(taxDoc => {
      let text = `Tax Document ${taxDoc.document_type} for Tax Year ${taxDoc.tax_year}: Employer ${taxDoc.employer || 'Self'}. Gross Wages: ${formatCurrency(taxDoc.gross_wages || 0)}, Federal Tax Withheld: ${formatCurrency(taxDoc.federal_tax_withheld || 0)}, State Tax Withheld: ${formatCurrency(taxDoc.state_tax_withheld || 0)}, Social Security: ${formatCurrency(taxDoc.social_security_tax || 0)}. Source: ${taxDoc.source_doc}.`;

      if (taxDoc.items) {
        const itemStr = taxDoc.items.map(it => `${it.description}: ${formatCurrency(it.amount)} (${it.category})`).join(', ');
        text = `Tax Deductible Schedule for Year ${taxDoc.tax_year}: Total Deductible Expenses of ${formatCurrency(taxDoc.total_deductible_expenses)}. Itemized Deductions: ${itemStr}. Source: ${taxDoc.source_doc}.`;
      }

      chunks.push({
        id: `chunk_tax_${taxDoc.id}`,
        chunk_type: "Tax Documents",
        chunk_text: text,
        metadata: {
          user_id: userId,
          category: "Taxes",
          year: taxDoc.tax_year,
          amount: taxDoc.gross_wages || taxDoc.total_deductible_expenses || 0,
          source_doc: taxDoc.source_doc
        },
        raw_record: taxDoc
      });
    });
  }

  // 8. RECURRING SUBSCRIPTION HISTORY CHUNKS
  if (dataset.subscriptions && dataset.subscriptions.length > 0) {
    let totalSubMonthly = 0;
    const subListStr = dataset.subscriptions.map(sub => {
      totalSubMonthly += sub.amount;
      return `${sub.merchant}: ${formatCurrency(sub.amount)}/${sub.frequency} (Billed ${sub.billing_day} to ${sub.account})`;
    }).join('; ');

    const text = `Subscription History & Recurring Payments: Total Monthly Subscription Burn is ${formatCurrency(totalSubMonthly)}. Active Subscriptions: ${subListStr}.`;

    chunks.push({
      id: "chunk_subscriptions_summary",
      chunk_type: "Subscription History",
      chunk_text: text,
      metadata: {
        user_id: userId,
        category: "Subscriptions",
        amount: totalSubMonthly,
        source_doc: "Recurring_Bills_Analysis"
      },
      structured_data: dataset.subscriptions
    });
  }

  // 9. BUDGET REPORTS & VARIANCE SUMMARY
  if (dataset.budgets && dataset.budgets.length > 0) {
    const bListStr = dataset.budgets.map(b => `${b.category_name}: Budget ${formatCurrency(b.allocated_limit)}, Spent ${formatCurrency(b.current_spent)} (${b.status})`).join('; ');
    const text = `Budget Report for ${dataset.budgets[0].cycle}: Overview of category budgets and spending limits. ${bListStr}.`;

    chunks.push({
      id: "chunk_budget_report",
      chunk_type: "Budget Reports",
      chunk_text: text,
      metadata: {
        user_id: userId,
        category: "Budgets",
        source_doc: "Budget_Tracker_Mar2026"
      },
      structured_data: dataset.budgets
    });
  }

  // 10. BANK ACCOUNTS & CREDIT CARDS SUMMARY
  if (dataset.bank_accounts && dataset.credit_cards) {
    const bankStr = dataset.bank_accounts.map(b => `${b.name} (${b.institution} ${b.account_number}): Balance ${formatCurrency(b.balance)}`).join('; ');
    const cardStr = dataset.credit_cards.map(c => `${c.name} (${c.institution} ${c.account_number}): Balance ${formatCurrency(c.balance)} / Limit ${formatCurrency(c.credit_limit)}`).join('; ');
    
    const text = `Bank Accounts and Credit Cards Summary: Checking & Savings Accounts: ${bankStr}. Credit Cards & Balances: ${cardStr}.`;

    chunks.push({
      id: "chunk_accounts_summary",
      chunk_type: "Bank Accounts",
      chunk_text: text,
      metadata: {
        user_id: userId,
        category: "Bank Accounts",
        source_doc: "Account_Balances_Live"
      }
    });
  }

  return chunks;
}
