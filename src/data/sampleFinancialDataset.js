/**
 * Sample Financial Dataset for MyVault AI Financial Assistant
 * Covers all 18 financial categories required for RAG ingestion:
 * Transactions, Bank Accounts, Credit Cards, Income, Bills, Investments, Loans, Mortgage,
 * Taxes, Savings, Budgets, Subscriptions, Insurance, Assets, Liabilities, Goals, Receipts, Merchants.
 */

export const SAMPLE_USER_ID = "usr_vault_88921";

export const SAMPLE_BANK_ACCOUNTS = [
  {
    id: "acc_chk_01",
    user_id: SAMPLE_USER_ID,
    name: "Primary Checking",
    institution: "Chase Bank",
    account_number: "•••• 4821",
    type: "Checking",
    balance: 8450.25,
    currency: "USD",
    category: "Bank Accounts",
    last_updated: "2026-03-28",
    source_doc: "Chase_Statement_Mar2026.pdf"
  },
  {
    id: "acc_hysa_02",
    user_id: SAMPLE_USER_ID,
    name: "High Yield Savings",
    institution: "Marcus by Goldman Sachs",
    account_number: "•••• 9104",
    type: "Savings",
    balance: 34200.50,
    apy: 4.35,
    currency: "USD",
    category: "Bank Accounts",
    last_updated: "2026-03-28",
    source_doc: "Marcus_Summary_Q1_2026.pdf"
  }
];

export const SAMPLE_CREDIT_CARDS = [
  {
    id: "cc_csr_01",
    user_id: SAMPLE_USER_ID,
    name: "Sapphire Reserve",
    institution: "Chase",
    account_number: "•••• 7312",
    balance: 1420.80,
    credit_limit: 20000.00,
    apr: 21.99,
    due_date: "2026-04-15",
    category: "Credit Cards",
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "cc_cfu_02",
    user_id: SAMPLE_USER_ID,
    name: "Freedom Unlimited",
    institution: "Chase",
    account_number: "•••• 3390",
    balance: 412.15,
    credit_limit: 10000.00,
    apr: 19.99,
    due_date: "2026-04-18",
    category: "Credit Cards",
    source_doc: "Chase_Freedom_Mar2026.pdf"
  }
];

export const SAMPLE_INCOME = [
  {
    id: "inc_01",
    user_id: SAMPLE_USER_ID,
    source: "Acme Corp Payroll",
    type: "Salary",
    amount: 7500.00,
    frequency: "Monthly",
    date: "2026-03-01",
    month: "March",
    year: 2026,
    category: "Income",
    account: "Primary Checking (•••• 4821)",
    source_doc: "Paystub_Acme_Mar2026.pdf"
  },
  {
    id: "inc_02",
    user_id: SAMPLE_USER_ID,
    source: "Acme Corp Payroll",
    type: "Salary",
    amount: 7500.00,
    frequency: "Monthly",
    date: "2026-02-01",
    month: "February",
    year: 2026,
    category: "Income",
    account: "Primary Checking (•••• 4821)",
    source_doc: "Paystub_Acme_Feb2026.pdf"
  },
  {
    id: "inc_03",
    user_id: SAMPLE_USER_ID,
    source: "Acme Corp Payroll",
    type: "Salary",
    amount: 7500.00,
    frequency: "Monthly",
    date: "2026-01-01",
    month: "January",
    year: 2026,
    category: "Income",
    account: "Primary Checking (•••• 4821)",
    source_doc: "Paystub_Acme_Jan2026.pdf"
  },
  {
    id: "inc_04",
    user_id: SAMPLE_USER_ID,
    source: "Acme Corp Annual Bonus",
    type: "Bonus",
    amount: 12500.00,
    date: "2025-12-15",
    month: "December",
    year: 2025,
    category: "Income",
    account: "Primary Checking (•••• 4821)",
    source_doc: "Bonus_Statement_2025.pdf"
  },
  {
    id: "inc_05",
    user_id: SAMPLE_USER_ID,
    source: "Freelance UI Design",
    type: "Side Income",
    amount: 1800.00,
    date: "2026-03-14",
    month: "March",
    year: 2026,
    category: "Income",
    account: "Primary Checking (•••• 4821)",
    source_doc: "Invoice_INV-889.pdf"
  }
];

export const SAMPLE_INVESTMENTS = [
  {
    id: "inv_vti_01",
    user_id: SAMPLE_USER_ID,
    asset_name: "Vanguard Total Stock Market ETF (VTI)",
    symbol: "VTI",
    account: "Vanguard Brokerage",
    shares: 145.5,
    average_cost: 210.40,
    current_price: 278.50,
    current_value: 40521.75,
    unrealized_gain: 9907.05,
    category: "Investments",
    asset_type: "ETF",
    allocation_pct: 45.2,
    source_doc: "Vanguard_Q1_2026_Statement.pdf"
  },
  {
    id: "inv_401k_02",
    user_id: SAMPLE_USER_ID,
    asset_name: "Fidelity Target Date 2055 Fund",
    symbol: "FDEWX",
    account: "Fidelity 401(k)",
    shares: 820.0,
    average_cost: 38.20,
    current_price: 47.10,
    current_value: 38622.00,
    unrealized_gain: 7298.00,
    category: "Investments",
    asset_type: "Retirement",
    allocation_pct: 43.1,
    source_doc: "Fidelity_401k_Mar2026.pdf"
  },
  {
    id: "inv_tech_03",
    user_id: SAMPLE_USER_ID,
    asset_name: "Apple Inc.",
    symbol: "AAPL",
    account: "Vanguard Brokerage",
    shares: 42.0,
    average_cost: 165.00,
    current_price: 228.30,
    current_value: 9588.60,
    unrealized_gain: 2658.60,
    category: "Investments",
    asset_type: "Individual Stock",
    allocation_pct: 10.7,
    source_doc: "Vanguard_Q1_2026_Statement.pdf"
  }
];

export const SAMPLE_MORTGAGE_LOANS = [
  {
    id: "loan_mort_01",
    user_id: SAMPLE_USER_ID,
    lender: "Chase Home Mortgage",
    account_number: "•••• 6610",
    original_principal: 450000.00,
    remaining_balance: 382450.00,
    monthly_payment: 2450.00,
    principal_paid_ytd: 4210.00,
    interest_paid_ytd: 3140.00,
    interest_rate: 4.25,
    category: "Mortgage",
    property_address: "742 Evergreen Terrace, Seattle WA",
    source_doc: "Chase_Mortgage_Statement_Mar2026.pdf"
  },
  {
    id: "loan_auto_02",
    user_id: SAMPLE_USER_ID,
    lender: "Tesla Financial",
    account_number: "•••• 1928",
    original_principal: 42000.00,
    remaining_balance: 14800.00,
    monthly_payment: 620.00,
    interest_rate: 3.49,
    category: "Loans",
    source_doc: "Tesla_Loan_Statement_Mar2026.pdf"
  }
];

export const SAMPLE_TAXES = [
  {
    id: "tax_2025_01",
    user_id: SAMPLE_USER_ID,
    tax_year: 2025,
    document_type: "Form W-2",
    employer: "Acme Corp",
    gross_wages: 90000.00,
    federal_tax_withheld: 14200.00,
    state_tax_withheld: 4500.00,
    social_security_tax: 5580.00,
    medicare_tax: 1305.00,
    category: "Taxes",
    source_doc: "2025_W2_Acme_Corp.pdf"
  },
  {
    id: "tax_2025_ded_02",
    user_id: SAMPLE_USER_ID,
    tax_year: 2025,
    document_type: "Tax Deductible Schedule",
    total_deductible_expenses: 4850.00,
    items: [
      { description: "Home Office Ergonomic Desk & Equipment", amount: 1420.00, category: "Office Equipment" },
      { description: "Professional Software Licenses (Figma, GitHub)", amount: 890.00, category: "Software" },
      { description: "Charitable Donations to Red Cross", amount: 1200.00, category: "Charity" },
      { description: "State Property Taxes (Mortgage Escrow)", amount: 1340.00, category: "Property Tax" }
    ],
    category: "Taxes",
    source_doc: "2025_Tax_Deductions_Summary.pdf"
  }
];

export const SAMPLE_SUBSCRIPTIONS = [
  {
    id: "sub_01",
    user_id: SAMPLE_USER_ID,
    merchant: "Netflix",
    amount: 22.99,
    frequency: "Monthly",
    billing_day: "15th",
    category: "Subscriptions",
    account: "Sapphire Reserve (•••• 7312)",
    status: "Active",
    annual_cost: 275.88,
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "sub_02",
    user_id: SAMPLE_USER_ID,
    merchant: "Spotify",
    amount: 11.99,
    frequency: "Monthly",
    billing_day: "03rd",
    category: "Subscriptions",
    account: "Freedom Unlimited (•••• 3390)",
    status: "Active",
    annual_cost: 143.88,
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "sub_03",
    user_id: SAMPLE_USER_ID,
    merchant: "Equinox Fitness",
    amount: 260.00,
    frequency: "Monthly",
    billing_day: "01st",
    category: "Subscriptions",
    account: "Sapphire Reserve (•••• 7312)",
    status: "Active",
    annual_cost: 3120.00,
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "sub_04",
    user_id: SAMPLE_USER_ID,
    merchant: "Apple iCloud+",
    amount: 9.99,
    frequency: "Monthly",
    billing_day: "20th",
    category: "Subscriptions",
    account: "Freedom Unlimited (•••• 3390)",
    status: "Active",
    annual_cost: 119.88,
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "sub_05",
    user_id: SAMPLE_USER_ID,
    merchant: "ChatGPT Plus",
    amount: 20.00,
    frequency: "Monthly",
    billing_day: "10th",
    category: "Subscriptions",
    account: "Sapphire Reserve (•••• 7312)",
    status: "Active",
    annual_cost: 240.00,
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "sub_06",
    user_id: SAMPLE_USER_ID,
    merchant: "Amazon Prime",
    amount: 139.00,
    frequency: "Annual",
    billing_day: "Nov 12",
    category: "Subscriptions",
    account: "Sapphire Reserve (•••• 7312)",
    status: "Active",
    annual_cost: 139.00,
    source_doc: "Chase_Credit_Nov2025.pdf"
  }
];

export const SAMPLE_TRANSACTIONS = [
  // --- MARCH 2026 TRANSACTIONS ---
  {
    id: "tx_mar_01",
    user_id: SAMPLE_USER_ID,
    merchant: "Din Tai Fung",
    raw_merchant: "DIN TAI FUNG #402 SEATTLE",
    amount: 96.40,
    date: "2026-03-24",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining", "Restaurants", "Food"],
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "tx_mar_02",
    user_id: SAMPLE_USER_ID,
    merchant: "Chipotle",
    raw_merchant: "TST* CHIPOTLE ONLINE",
    amount: 24.11,
    date: "2026-03-21",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining", "Fast Food"],
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "tx_mar_03",
    user_id: SAMPLE_USER_ID,
    merchant: "DoorDash",
    raw_merchant: "DOORDASH*PAD THAI SEATTLE",
    amount: 42.13,
    date: "2026-03-18",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining", "Delivery"],
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "tx_mar_04",
    user_id: SAMPLE_USER_ID,
    merchant: "Starbucks",
    raw_merchant: "STARBUCKS STORE #1982 SEATTLE",
    amount: 18.22,
    date: "2026-03-15",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Coffee", "Dining"],
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "tx_mar_05",
    user_id: SAMPLE_USER_ID,
    merchant: "Chipotle",
    raw_merchant: "CHIPOTLE MEXICAN GRILL SEATTLE",
    amount: 32.50,
    date: "2026-03-11",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining"],
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "tx_mar_06",
    user_id: SAMPLE_USER_ID,
    merchant: "Costco",
    raw_merchant: "COSTCO WHOLESALE #062 SEATTLE WA",
    amount: 342.15,
    date: "2026-03-12",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Groceries & Household",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Groceries", "Household", "Bulk"],
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "tx_mar_07",
    user_id: SAMPLE_USER_ID,
    merchant: "Whole Foods Market",
    raw_merchant: "WHOLEFDS SEATTLE 1042",
    amount: 128.40,
    date: "2026-03-05",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Groceries & Household",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Groceries", "Organic"],
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "tx_mar_08",
    user_id: SAMPLE_USER_ID,
    merchant: "Trader Joe's",
    raw_merchant: "TRADER JOE'S #140 SEATTLE",
    amount: 84.60,
    date: "2026-03-19",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Groceries & Household",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Groceries"],
    source_doc: "Chase_Freedom_Mar2026.pdf"
  },
  {
    id: "tx_mar_09",
    user_id: SAMPLE_USER_ID,
    merchant: "Amazon",
    raw_merchant: "AMZN Mktp US*4K18B2",
    amount: 145.99,
    date: "2026-03-10",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Shopping & Electronics",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Shopping", "Electronics", "Tax Deductible"],
    is_tax_deductible: true,
    source_doc: "Amazon_Receipt_Mar10.pdf"
  },
  {
    id: "tx_mar_10",
    user_id: SAMPLE_USER_ID,
    merchant: "Delta Air Lines",
    raw_merchant: "DELTA AIR 006249129844",
    amount: 680.00,
    date: "2026-03-02",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Travel & Flights",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Travel", "Flights", "Large Purchase"],
    source_doc: "Delta_Ticket_Receipt_Mar2026.pdf"
  },
  {
    id: "tx_mar_11",
    user_id: SAMPLE_USER_ID,
    merchant: "Airbnb",
    raw_merchant: "AIRBNB * HM491209",
    amount: 450.00,
    date: "2026-03-03",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Travel & Lodging",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Travel", "Lodging"],
    source_doc: "Airbnb_Confirmation_Mar2026.pdf"
  },
  {
    id: "tx_mar_12",
    user_id: SAMPLE_USER_ID,
    merchant: "Equinox Fitness",
    raw_merchant: "EQUINOX FITNESS SEATTLE",
    amount: 260.00,
    date: "2026-03-01",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Subscriptions & Health",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Subscriptions", "Gym", "Fitness"],
    is_recurring: true,
    source_doc: "Chase_Credit_Mar2026.pdf"
  },
  {
    id: "tx_mar_13",
    user_id: SAMPLE_USER_ID,
    merchant: "Netflix",
    raw_merchant: "NETFLIX.COM DIGITAL",
    amount: 22.99,
    date: "2026-03-15",
    month: "March",
    year: 2026,
    category: "Transactions",
    financial_category: "Subscriptions & Entertainment",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Subscriptions", "Entertainment"],
    is_recurring: true,
    source_doc: "Chase_Credit_Mar2026.pdf"
  },

  // --- FEBRUARY 2026 TRANSACTIONS ---
  {
    id: "tx_feb_01",
    user_id: SAMPLE_USER_ID,
    merchant: "Chipotle",
    raw_merchant: "CHIPOTLE ONLINE SEATTLE",
    amount: 22.10,
    date: "2026-02-22",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining"],
    source_doc: "Chase_Credit_Feb2026.pdf"
  },
  {
    id: "tx_feb_02",
    user_id: SAMPLE_USER_ID,
    merchant: "Din Tai Fung",
    raw_merchant: "DIN TAI FUNG SEATTLE",
    amount: 88.00,
    date: "2026-02-14",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining"],
    source_doc: "Chase_Credit_Feb2026.pdf"
  },
  {
    id: "tx_feb_03",
    user_id: SAMPLE_USER_ID,
    merchant: "Starbucks",
    raw_merchant: "STARBUCKS STORE SEATTLE",
    amount: 14.50,
    date: "2026-02-08",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Coffee"],
    source_doc: "Chase_Freedom_Feb2026.pdf"
  },
  {
    id: "tx_feb_04",
    user_id: SAMPLE_USER_ID,
    merchant: "Costco",
    raw_merchant: "COSTCO WHOLESALE #062 SEATTLE WA",
    amount: 295.40,
    date: "2026-02-10",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Groceries & Household",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Groceries", "Household"],
    source_doc: "Chase_Freedom_Feb2026.pdf"
  },
  {
    id: "tx_feb_05",
    user_id: SAMPLE_USER_ID,
    merchant: "Amazon",
    raw_merchant: "AMAZON.COM*3K91A",
    amount: 89.50,
    date: "2026-02-18",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Shopping",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Shopping"],
    source_doc: "Chase_Credit_Feb2026.pdf"
  },
  {
    id: "tx_feb_06",
    user_id: SAMPLE_USER_ID,
    merchant: "Equinox Fitness",
    raw_merchant: "EQUINOX FITNESS SEATTLE",
    amount: 260.00,
    date: "2026-02-01",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Subscriptions & Health",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Subscriptions", "Gym"],
    is_recurring: true,
    source_doc: "Chase_Credit_Feb2026.pdf"
  },
  {
    id: "tx_feb_07",
    user_id: SAMPLE_USER_ID,
    merchant: "Apple Store",
    raw_merchant: "APPLE STORE #R102 SEATTLE WA",
    amount: 1299.00,
    date: "2026-02-25",
    month: "February",
    year: 2026,
    category: "Transactions",
    financial_category: "Electronics & Tech",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Electronics", "Large Purchase", "Tax Deductible"],
    is_tax_deductible: true,
    source_doc: "Apple_Store_Receipt_Feb25.pdf"
  },

  // --- JANUARY 2026 TRANSACTIONS ---
  {
    id: "tx_jan_01",
    user_id: SAMPLE_USER_ID,
    merchant: "Costco",
    raw_merchant: "COSTCO WHOLESALE SEATTLE",
    amount: 388.90,
    date: "2026-01-14",
    month: "January",
    year: 2026,
    category: "Transactions",
    financial_category: "Groceries & Household",
    account: "Freedom Unlimited (•••• 3390)",
    tags: ["Groceries"],
    source_doc: "Chase_Freedom_Jan2026.pdf"
  },
  {
    id: "tx_jan_02",
    user_id: SAMPLE_USER_ID,
    merchant: "Amazon",
    raw_merchant: "AMZN MKTP SEATTLE",
    amount: 210.00,
    date: "2026-01-20",
    month: "January",
    year: 2026,
    category: "Transactions",
    financial_category: "Shopping",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Shopping"],
    source_doc: "Chase_Credit_Jan2026.pdf"
  },
  {
    id: "tx_jan_03",
    user_id: SAMPLE_USER_ID,
    merchant: "Din Tai Fung",
    raw_merchant: "DIN TAI FUNG SEATTLE",
    amount: 112.50,
    date: "2026-01-28",
    month: "January",
    year: 2026,
    category: "Transactions",
    financial_category: "Dining / Restaurants",
    account: "Sapphire Reserve (•••• 7312)",
    tags: ["Dining"],
    source_doc: "Chase_Credit_Jan2026.pdf"
  }
];

export const SAMPLE_BUDGETS = [
  {
    category_name: "Dining / Restaurants",
    allocated_limit: 600.00,
    current_spent: 215.36,
    period: "Monthly",
    cycle: "March 2026",
    status: "Under Budget"
  },
  {
    category_name: "Groceries & Household",
    allocated_limit: 700.00,
    current_spent: 555.15,
    period: "Monthly",
    cycle: "March 2026",
    status: "Under Budget"
  },
  {
    category_name: "Travel & Lodging",
    allocated_limit: 500.00,
    current_spent: 1130.00,
    period: "Monthly",
    cycle: "March 2026",
    status: "Over Budget"
  },
  {
    category_name: "Subscriptions & Health",
    allocated_limit: 400.00,
    current_spent: 344.97,
    period: "Monthly",
    cycle: "March 2026",
    status: "Under Budget"
  }
];
