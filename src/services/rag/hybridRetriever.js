/**
 * Hybrid Retriever
 * Combines Intent Classification, Metadata Filtering, BM25 Keyword Search,
 * Vector Similarity, Reciprocal Rank Fusion (RRF), Re-ranking, and Deduplication.
 */

import { globalVectorStore } from './vectorStore';

/**
 * 1. Intent Detection & Auto Metadata Filter Extraction
 */
export function detectIntentAndFilters(query) {
  const q = query.toLowerCase();

  let intent = "General Inquiry";
  const filters = {};

  // Intent classification rules
  if (/spend|spent|cost|costco|restaurant|food|grocer|dining|travel|shopping|buy|purchase/i.test(q)) {
    intent = "Spending Analysis";
  }
  if (/subscript|recurring|monthly payment|charge me every/i.test(q)) {
    intent = "Subscriptions";
  }
  if (/tax|deductible|w2|1099|write off/i.test(q)) {
    intent = "Taxes";
    filters.is_tax_deductible = true;
  }
  if (/invest|portfolio|stock|vti|shares|401k|asset/i.test(q)) {
    intent = "Investments";
    filters.category = "Investments";
  }
  if (/mortgage|loan|debt|lender|principal|interest rate/i.test(q)) {
    intent = "Debt & Mortgage";
  }
  if (/income|salary|bonus|paycheck|payroll|earned|make/i.test(q)) {
    intent = "Income";
    filters.category = "Income";
  }
  if (/budget|limit|within budget|allocat/i.test(q)) {
    intent = "Budgeting";
  }
  if (/net worth|wealth|total asset/i.test(q)) {
    intent = "Net Worth";
  }
  if (/cash flow|inflow|outflow|burn rate/i.test(q)) {
    intent = "Cash Flow";
  }
  if (/compare|january and february|vs|difference|trend/i.test(q)) {
    intent = "Monthly Comparison";
  }
  if (/unusual|spike|anomaly|abnormal|higher this month/i.test(q)) {
    intent = "Anomaly Detection";
  }
  if (/largest|biggest|most expensive/i.test(q)) {
    intent = "Large Purchases";
  }
  if (/save money|saving|recommend/i.test(q)) {
    intent = "Savings Optimization";
  }

  // Month detection
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  for (const m of months) {
    if (q.includes(m)) {
      filters.month = m.charAt(0).toUpperCase() + m.slice(1);
      break;
    }
  }
  if (q.includes("last month")) {
    filters.month = "February"; // Relative to current March 2026 dataset
  }
  if (q.includes("this month")) {
    filters.month = "March";
  }

  // Year detection
  if (q.includes("2026")) filters.year = 2026;
  if (q.includes("2025")) filters.year = 2025;
  if (q.includes("this year")) filters.year = 2026;
  if (q.includes("last year")) filters.year = 2025;

  // Merchant detection
  const knownMerchants = ["costco", "amazon", "chipotle", "din tai fung", "starbucks", "doordash", "whole foods", "trader joe's", "netflix", "spotify", "equinox", "airbnb", "delta"];
  for (const merch of knownMerchants) {
    if (q.includes(merch)) {
      filters.merchant = merch;
      break;
    }
  }

  return { intent, filters };
}

/**
 * 2. BM25 Keyword Search
 */
export function bm25KeywordSearch(query, items) {
  const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 1);
  if (queryTokens.length === 0) return items.map(item => ({ ...item, bm25_score: 0 }));

  return items.map(item => {
    const text = item.chunk_text.toLowerCase();
    let score = 0;
    queryTokens.forEach(token => {
      if (text.includes(token)) {
        score += 1.5;
        // Match exact merchant/number bonus
        if (item.metadata.merchant && item.metadata.merchant.toLowerCase().includes(token)) score += 2.0;
        if (item.metadata.category && item.metadata.category.toLowerCase().includes(token)) score += 1.5;
      }
    });
    return {
      ...item,
      bm25_score: score
    };
  });
}

/**
 * 3. Reciprocal Rank Fusion (RRF)
 */
export function reciprocalRankFusion(vectorResults, keywordResults, k = 60) {
  const rankMap = new Map();

  // Process Vector Ranks
  vectorResults.forEach((item, index) => {
    const rrfScore = 1.0 / (k + (index + 1));
    rankMap.set(item.id, { item, rrfScore });
  });

  // Process Keyword Ranks
  keywordResults.forEach((item, index) => {
    const rrfScore = 1.0 / (k + (index + 1));
    if (rankMap.has(item.id)) {
      rankMap.get(item.id).rrfScore += rrfScore;
    } else {
      rankMap.set(item.id, { item, rrfScore });
    }
  });

  const merged = Array.from(rankMap.values()).map(entry => ({
    ...entry.item,
    rrf_score: entry.rrfScore
  }));

  merged.sort((a, b) => b.rrf_score - a.rrf_score);
  return merged;
}

/**
 * 4. Deduplicate & Re-rank
 */
export function rerankAndDeduplicate(results, topK = 6) {
  const seenTexts = new Set();
  const deduped = [];

  for (const item of results) {
    const textSnippet = item.chunk_text.slice(0, 80);
    if (!seenTexts.has(textSnippet)) {
      seenTexts.add(textSnippet);
      deduped.push(item);
    }
  }

  return deduped.slice(0, topK);
}

/**
 * 5. Complete Hybrid Retrieval Pipeline
 */
export function hybridRetrieve(query, userId = "usr_vault_88921", extraFilters = {}) {
  const { intent, filters } = detectIntentAndFilters(query);
  const combinedFilters = { user_id: userId, ...filters, ...extraFilters };

  // Dense Vector Search
  const vectorHits = globalVectorStore.search(query, combinedFilters, 20);

  // Sparse BM25 Keyword Search
  const keywordHits = bm25KeywordSearch(query, globalVectorStore.vectors.filter(v => v.metadata.user_id === userId));
  keywordHits.sort((a, b) => b.bm25_score - a.bm25_score);
  const topKeywordHits = keywordHits.slice(0, 20);

  // Hybrid Fusion via RRF
  const fusedHits = reciprocalRankFusion(vectorHits, topKeywordHits);

  // Re-rank & Deduplicate
  const finalChunks = rerankAndDeduplicate(fusedHits, 7);

  // Build Context Window
  const contextText = finalChunks
    .map((c, i) => `[Document ${i + 1}] (Category: ${c.metadata.category || 'General'}, Source: ${c.metadata.source_doc || 'DB'}):\n${c.chunk_text}`)
    .join('\n\n');

  return {
    intent,
    appliedFilters: combinedFilters,
    retrievedChunks: finalChunks,
    contextWindowText: contextText
  };
}
