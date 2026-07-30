/**
 * Data Ingestion Pipeline
 * Processes CSVs, JSON, Bank Exports, Plaid Data, PDF statements, and Spreadsheets.
 * Normalizes every record into the common schema and cleans duplicates.
 */

import { normalizeFinancialRecord } from './ragSchema';

/**
 * Parses raw CSV text into array of normalized financial records.
 * Supports flexible column naming (Date, Merchant/Description, Amount, Category).
 */
export function parseCSV(csvText, filename = "imported_statement.csv") {
  if (!csvText || typeof csvText !== 'string') return [];

  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  
  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const merchantIdx = headers.findIndex(h => h.includes('merchant') || h.includes('payee') || h.includes('description') || h.includes('name'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('price') || h.includes('total') || h.includes('cost'));
  const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type'));
  const accountIdx = headers.findIndex(h => h.includes('account') || h.includes('bank') || h.includes('card'));

  const parsedRecords = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV splitter handling quoted strings
    const row = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rawLine.split(',');
    const cleanRow = row.map(cell => cell.replace(/^["']|["']$/g, '').trim());

    const date = dateIdx >= 0 ? cleanRow[dateIdx] : new Date().toISOString().split('T')[0];
    const merchant = merchantIdx >= 0 ? cleanRow[merchantIdx] : "Unknown Merchant";
    const amountStr = amountIdx >= 0 ? cleanRow[amountIdx] : "0.00";
    const category = categoryIdx >= 0 ? cleanRow[categoryIdx] : "General Expenses";
    const account = accountIdx >= 0 ? cleanRow[accountIdx] : "Checking Account";

    const normalized = normalizeFinancialRecord({
      date,
      merchant,
      amount: amountStr,
      financial_category: category,
      account,
      source_doc: filename
    });

    parsedRecords.push(normalized);
  }

  return removeDuplicates(parsedRecords);
}

/**
 * Parses Plaid JSON payloads or custom JSON exports.
 */
export function parsePlaidJSON(jsonPayload, filename = "plaid_export.json") {
  let data = jsonPayload;
  if (typeof jsonPayload === 'string') {
    try {
      data = JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to parse JSON payload", e);
      return [];
    }
  }

  const rawTxList = Array.isArray(data) ? data : (data.transactions || data.records || [data]);
  const parsedRecords = rawTxList.map(tx => {
    return normalizeFinancialRecord({
      id: tx.transaction_id || tx.id,
      user_id: tx.user_id,
      merchant: tx.merchant_name || tx.name || tx.payee || tx.merchant,
      amount: tx.amount,
      date: tx.date || tx.authorized_date,
      financial_category: Array.isArray(tx.category) ? tx.category.join(' > ') : (tx.category || "General"),
      account: tx.account_name || tx.account || "Plaid Account",
      source_doc: filename,
      is_recurring: Boolean(tx.is_recurring)
    });
  });

  return removeDuplicates(parsedRecords);
}

/**
 * Ingests bank PDF text or raw text extracts.
 */
export function parseBankTextReport(textReport, filename = "bank_report.pdf") {
  if (!textReport || typeof textReport !== 'string') return [];

  // Match pattern: DATE MERCHANT $AMOUNT
  const lines = textReport.split('\n');
  const extracted = [];

  const txPattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$?([0-9,]+\.\d{2})/i;

  for (const line of lines) {
    const match = line.match(txPattern);
    if (match) {
      const date = match[1];
      const merchant = match[2].trim();
      const amount = match[3].replace(',', '');

      extracted.push(normalizeFinancialRecord({
        date,
        merchant,
        amount,
        source_doc: filename
      }));
    }
  }

  return removeDuplicates(extracted);
}

/**
 * Deduplicates transactions based on date, merchant, amount, and account.
 */
export function removeDuplicates(records) {
  const seen = new Set();
  const unique = [];

  for (const rec of records) {
    const key = `${rec.date}_${rec.merchant.toLowerCase()}_${rec.amount.toFixed(2)}_${rec.account}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rec);
    }
  }

  return unique;
}
