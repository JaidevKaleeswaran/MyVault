/**
 * RAG Schema and Normalization Rules
 * Ensures every financial record is clean, standardized, and secure.
 */

// Known Merchant Normalization Rules
export const MERCHANT_NORMALIZATION_MAP = [
  { pattern: /amzn|amazon/i, canonical: "Amazon" },
  { pattern: /chipotle/i, canonical: "Chipotle" },
  { pattern: /din tai fung/i, canonical: "Din Tai Fung" },
  { pattern: /doordash/i, canonical: "DoorDash" },
  { pattern: /starbucks/i, canonical: "Starbucks" },
  { pattern: /costco/i, canonical: "Costco" },
  { pattern: /whole\s*fds|whole\s*foods/i, canonical: "Whole Foods Market" },
  { pattern: /trader\s*joe/i, canonical: "Trader Joe's" },
  { pattern: /delta\s*air/i, canonical: "Delta Air Lines" },
  { pattern: /airbnb/i, canonical: "Airbnb" },
  { pattern: /equinox/i, canonical: "Equinox Fitness" },
  { pattern: /netflix/i, canonical: "Netflix" },
  { pattern: /spotify/i, canonical: "Spotify" },
  { pattern: /apple\s*store|apple\.com/i, canonical: "Apple" },
  { pattern: /icloud/i, canonical: "Apple iCloud+" },
  { pattern: /chatgpt|openai/i, canonical: "ChatGPT Plus" },
  { pattern: /tesla/i, canonical: "Tesla" },
  { pattern: /walmart|wm\s*supercenter/i, canonical: "Walmart" },
  { pattern: /uber/i, canonical: "Uber" },
  { pattern: /lyft/i, canonical: "Lyft" }
];

/**
 * Normalizes raw merchant strings to clean canonical names
 */
export function normalizeMerchant(rawMerchant) {
  if (!rawMerchant) return "Unknown Merchant";
  const cleanStr = String(rawMerchant).trim();
  for (const rule of MERCHANT_NORMALIZATION_MAP) {
    if (rule.pattern.test(cleanStr)) {
      return rule.canonical;
    }
  }
  // Fallback: strip numbers and clean punctuation
  return cleanStr
    .replace(/(?:#\d+|\*\w+|\d{4,})/g, '')
    .replace(/\s+/g, ' ')
    .trim() || rawMerchant;
}

/**
 * Normalizes dates into ISO format (YYYY-MM-DD) and extracts month/year
 */
export function normalizeDate(dateInput) {
  let dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date(); // fallback to current if invalid
  }
  const year = dateObj.getFullYear();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[dateObj.getMonth()];
  const isoDate = dateObj.toISOString().split('T')[0];

  return { isoDate, month, year };
}

/**
 * Formats float numbers into clean currency strings ($1,234.56)
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Security function: Masks sensitive account numbers (e.g. "123456789" -> "•••• 6789")
 */
export function maskAccountNumber(accStr) {
  if (!accStr) return "•••• 0000";
  const digits = String(accStr).replace(/\D/g, '');
  if (digits.length >= 4) {
    return `•••• ${digits.slice(-4)}`;
  }
  return accStr;
}

/**
 * Core Record Validator & Normalizer
 * Conforms all inputs to standard metadata schema.
 */
export function normalizeFinancialRecord(rawRecord, categoryDefault = "Transactions") {
  const amount = Math.abs(parseFloat(rawRecord.amount) || 0);
  const rawMerchant = rawRecord.merchant || rawRecord.raw_merchant || rawRecord.description || rawRecord.payee || "Unknown";
  const merchant = normalizeMerchant(rawMerchant);
  const { isoDate, month, year } = normalizeDate(rawRecord.date || rawRecord.transaction_date);

  return {
    id: rawRecord.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: rawRecord.user_id || "usr_vault_88921",
    category: rawRecord.category || categoryDefault,
    financial_category: rawRecord.financial_category || rawRecord.category_name || "General Expenses",
    account: rawRecord.account || "Primary Checking",
    merchant: merchant,
    raw_merchant: rawMerchant,
    amount: amount,
    date: isoDate,
    month: month,
    year: year,
    tags: Array.isArray(rawRecord.tags) ? rawRecord.tags : (rawRecord.tags ? [rawRecord.tags] : []),
    is_tax_deductible: Boolean(rawRecord.is_tax_deductible),
    is_recurring: Boolean(rawRecord.is_recurring),
    source_doc: rawRecord.source_doc || "Manual_Import.json",
    confidence_score: 1.0
  };
}
