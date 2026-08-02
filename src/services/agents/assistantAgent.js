/**
 * AI Assistant Agent — Replaces RAG for financial Q&A
 * 
 * Receives the full financial snapshot from the Manager Agent and uses it
 * as direct context for Gemini, enabling accurate answers without vector search.
 * All data is small enough to fit in the context window.
 */

import { GoogleGenAI } from '@google/genai';

const ASSISTANT_API_KEY = import.meta.env.VITE_ASSISTANT_API_KEY;

let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: ASSISTANT_API_KEY });
  }
  return aiInstance;
}

// ── Conversation memory (simple sliding window) ──────────────────────────────

const MAX_HISTORY = 10;
let conversationHistory = [];

export function clearConversationHistory() {
  conversationHistory = [];
}

function addToHistory(role, text) {
  conversationHistory.push({ role, text, timestamp: Date.now() });
  if (conversationHistory.length > MAX_HISTORY * 2) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(snapshot) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `You are the AI Financial Advisor for MyVault, a personal finance dashboard. Today is ${today}.

You have COMPLETE access to the user's REAL financial data. Answer questions accurately using ONLY the data provided below. Never fabricate numbers — if data is insufficient, say so honestly.

═══ FINANCIAL SNAPSHOT ═══

📊 SUMMARY:
• Total Income: $${snapshot.summary.totalIncome}
• Total Spent (current cycle): $${snapshot.summary.totalSpent}
• Total Budget Allocated: $${snapshot.summary.totalAllocated}
• Left to Budget: $${snapshot.summary.leftToBudget}
• Net Balance: $${snapshot.summary.netBalance}
• Total Transactions: ${snapshot.summary.transactionCount}
• Budget Cycle: ${snapshot.summary.cycleFrequency}
${snapshot.summary.currentCycleWindow ? `• Cycle Window: ${snapshot.summary.currentCycleWindow.start} to ${snapshot.summary.currentCycleWindow.end}` : ''}

💰 INCOME SOURCES:
${snapshot.incomeSources.length > 0
    ? snapshot.incomeSources.map(s => `• ${s.name}: $${s.amount} (${s.frequency})`).join('\n')
    : '• No income sources configured'}

📂 BUDGET CATEGORIES (Current Cycle):
${snapshot.categoryBreakdown.length > 0
    ? snapshot.categoryBreakdown.map(c =>
      `• ${c.name}: Spent $${c.spent.toFixed(2)} of $${c.budgetLimit} limit (${c.status}, $${c.remaining.toFixed(2)} remaining)`
    ).join('\n')
    : '• No categories configured'}

🏪 TOP MERCHANTS BY SPENDING:
${snapshot.topMerchants.length > 0
    ? snapshot.topMerchants.map((m, i) => `${i + 1}. ${m.name}: $${m.total}`).join('\n')
    : '• No transaction data'}

📋 RECENT TRANSACTIONS (up to 50):
${snapshot.recentTransactions.length > 0
    ? snapshot.recentTransactions.map(t =>
      `• ${t.date} | ${t.description} | $${t.amount} | ${t.category}`
    ).join('\n')
    : '• No transactions recorded'}

📈 MONTHLY SPENDING BY CATEGORY:
${Object.keys(snapshot.monthlySpending).length > 0
    ? Object.entries(snapshot.monthlySpending).map(([month, cats]) =>
      `${month}: ${Object.entries(cats).map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(', ')}`
    ).join('\n')
    : '• No monthly data available'}

═══ END SNAPSHOT ═══

RESPONSE GUIDELINES:
1. Be concise but thorough. Use bullet points for lists.
2. Always cite specific numbers from the data above.
3. When discussing spending, reference the actual category amounts.
4. Provide actionable insights and suggestions when relevant.
5. If asked about something not in the data, clearly state that.
6. Use currency formatting ($X.XX) for all monetary values.
7. For trend questions, analyze the monthly spending data.
8. Be friendly, professional, and helpful.`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Answer a user's financial question using the complete data snapshot
 */
export async function answerQuery(question, financialSnapshot) {
  const startTime = Date.now();

  try {
    const ai = getAI();
    const systemPrompt = buildSystemPrompt(financialSnapshot);

    // Build conversation context
    const conversationContext = conversationHistory.length > 0
      ? '\n\nPrevious conversation:\n' + conversationHistory
        .slice(-MAX_HISTORY * 2)
        .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n')
      : '';

    const fullPrompt = systemPrompt + conversationContext + `\n\nUser question: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    });

    const answerText = (response.text || '').trim();
    const latencyMs = Date.now() - startTime;

    // Record in conversation history
    addToHistory('user', question);
    addToHistory('assistant', answerText);

    return {
      success: true,
      answer: answerText,
      metrics: {
        latencyMs,
        dataPointsUsed: financialSnapshot.summary.transactionCount,
        categoriesAnalyzed: financialSnapshot.categoryBreakdown.length,
      },
    };
  } catch (err) {
    console.error('AI Assistant query failed:', err);

    // Fallback: try to answer simple questions from the snapshot directly
    const fallbackAnswer = tryFallbackAnswer(question, financialSnapshot);
    if (fallbackAnswer) {
      return {
        success: true,
        answer: fallbackAnswer,
        metrics: { latencyMs: Date.now() - startTime, dataPointsUsed: 0, categoriesAnalyzed: 0, fallback: true },
      };
    }

    return {
      success: false,
      answer: 'I apologize, but I encountered an error processing your question. Please try again.',
      error: err.message,
      metrics: { latencyMs: Date.now() - startTime },
    };
  }
}

/**
 * Simple fallback for common questions when AI is unavailable
 */
function tryFallbackAnswer(question, snapshot) {
  const q = question.toLowerCase();

  if (q.includes('total spent') || q.includes('how much') && q.includes('spent')) {
    return `You've spent **$${snapshot.summary.totalSpent.toFixed(2)}** in the current budget cycle.`;
  }

  if (q.includes('income') || q.includes('earn')) {
    return `Your total income is **$${snapshot.summary.totalIncome.toFixed(2)}** per cycle.\n\n${snapshot.incomeSources.map(s => `• ${s.name}: $${s.amount} (${s.frequency})`).join('\n')}`;
  }

  if (q.includes('balance') || q.includes('left')) {
    return `Your net balance is **$${snapshot.summary.netBalance.toFixed(2)}**. You have **$${snapshot.summary.leftToBudget.toFixed(2)}** left to budget.`;
  }

  if (q.includes('budget') || q.includes('category') || q.includes('categories')) {
    return `**Budget Status:**\n${snapshot.categoryBreakdown.map(c =>
      `• ${c.name}: $${c.spent.toFixed(2)} / $${c.budgetLimit} (${c.status})`
    ).join('\n')}`;
  }

  return null;
}

export function getConversationHistory() {
  return [...conversationHistory];
}
