import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, Upload, FileText, Download, ShieldCheck, Database,
  CreditCard, HelpCircle, RefreshCw, CheckCircle2, FileSpreadsheet, ChevronRight, X
} from 'lucide-react';
import { globalRAGEngine } from '../../services/rag/ragEngine';
import { adaptUserBudgetDataToRAG } from '../../services/rag/userDatasetAdapter';
import { useBudget } from '../../contexts/BudgetContext';
import { useAuth } from '../../contexts/AuthContext';
import { parseCSV, parsePlaidJSON, parseBankTextReport } from '../../services/rag/ingestionPipeline';
import { exportToCSV } from '../../services/rag/financialTools';
import { toast } from 'react-hot-toast';

function formatInlineMarkdown(str) {
  if (!str) return '';
  return String(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-zinc-400 font-normal">$1</em>');
}

function renderMarkdownText(text) {
  if (!text) return null;
  const paragraphs = String(text).split('\n\n');

  return (
    <div className="space-y-3 text-sm text-zinc-200 leading-relaxed font-sans">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        return (
          <div key={pIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (line.startsWith('• ') || line.startsWith('- ')) {
                const content = line.substring(2);
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-2 my-1 text-xs text-zinc-300">
                    <span className="text-accent font-bold mt-0.5">•</span>
                    <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
                  </div>
                );
              }
              if (line.startsWith('**') && line.endsWith(':**')) {
                return (
                  <h4 key={lIdx} className="font-semibold text-accent text-xs uppercase tracking-wider pt-2 border-t border-zinc-800/60 mt-2">
                    {line.replace(/\*\*/g, '')}
                  </h4>
                );
              }
              return (
                <p key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function AIAssistantTab() {
  const budgetState = useBudget();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTabTool, setActiveTabTool] = useState(null); // 'ingest' | null
  const [ingestPreview, setIngestPreview] = useState([]);
  const chatEndRef = useRef(null);

  // Sync user dataset into RAG engine whenever user budget data changes
  useEffect(() => {
    const userDataset = adaptUserBudgetDataToRAG(budgetState, user);
    globalRAGEngine.initializeDataset(userDataset);

    const recordCount = (budgetState.transactions?.length || 0) + (budgetState.categories?.length || 0) + (budgetState.incomeSources?.length || 0);

    setMessages(prev => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'msg_welcome',
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          query: null,
          intent: "System Initialization",
          grounded: true,
          response: {
            summary: `Hello ${user?.displayName || 'there'}! I am your AI Financial Assistant.`,
            evidence: [],
            fullText: `Hello ${user?.displayName || 'there'}! I am your AI Financial Assistant.\n\nI am connected directly to your personal MyVault dataset (${recordCount} live records). Ask me anything about your spending, budget limits, income, or recurring expenses. All answers are grounded 100% in your own financial records.`
          },
          retrievedChunks: []
        }
      ];
    });
  }, [budgetState.transactions, budgetState.categories, budgetState.incomeSources, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendQuery = async (queryToRun) => {
    const query = (queryToRun || inputQuery).trim();
    if (!query || isProcessing) return;

    setInputQuery('');
    const userMsgId = `user_${Date.now()}`;

    // Append user message
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setIsProcessing(true);

    try {
      // Execute RAG Pipeline
      const ragResult = await globalRAGEngine.processQuery(query);

      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          query: ragResult.query,
          resolvedQuery: ragResult.resolvedQuery,
          intent: ragResult.intent,
          grounded: ragResult.grounded,
          response: ragResult.response,
          retrievedChunks: ragResult.retrievedChunks
        }
      ]);
    } catch (error) {
      console.error("RAG Query Error:", error);
      toast.error("Failed to process financial query.");
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV / Data File Import Handler
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setRawUploadText(content);
      let parsed = [];
      if (file.name.endsWith('.csv')) {
        parsed = parseCSV(content, file.name);
      } else if (file.name.endsWith('.json')) {
        parsed = parsePlaidJSON(content, file.name);
      } else {
        parsed = parseBankTextReport(content, file.name);
      }

      setIngestPreview(parsed);
      toast.success(`Successfully parsed ${parsed.length} transactions from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleConfirmIngest = () => {
    if (ingestPreview.length === 0) return;
    ingestPreview.forEach(rec => {
      budgetState.dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: rec.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          amount: rec.amount,
          date: rec.date,
          description: rec.merchant,
          merchant: rec.merchant,
          category: rec.financial_category,
          source_doc: rec.source_doc
        }
      });
    });

    toast.success(`Indexed ${ingestPreview.length} new records into your live MyVault dataset & vector engine!`);
    setIngestPreview([]);
    setActiveTabTool(null);
  };

  const handleExportCSV = () => {
    const txs = globalRAGEngine.currentDataset?.transactions || [];
    const csvContent = exportToCSV(txs, "MyVault_Transactions_Export.csv");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MyVault_Transactions_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded!");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Action Header & Tools Bar */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-accent/10 rounded-lg text-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text flex items-center gap-2">
              AI CFO & RAG Assistant
              <span className="text-[10px] bg-accent/20 text-accent font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={10} /> 100% Grounded
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Grounded answers derived strictly from your financial data with zero hallucination.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTabTool(activeTabTool === 'ingest' ? null : 'ingest')}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-text rounded-lg border border-zinc-700 transition-colors"
          >
            <Upload size={14} />
            <span>Import Data</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-text rounded-lg border border-zinc-700 transition-colors"
          >
            <Download size={14} />
            <span>CSV Export</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-accent/10 hover:bg-accent/20 text-accent rounded-lg border border-accent/20 transition-colors"
          >
            <FileText size={14} />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Ingestion Drawer / Modal */}
      {activeTabTool === 'ingest' && (
        <div className="bg-[#18181b] border border-accent/30 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Database size={16} className="text-accent" />
              Multi-Format Data Ingestion Pipeline
            </h3>
            <button onClick={() => setActiveTabTool(null)} className="text-zinc-400 hover:text-text">
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            Import CSV files, JSON exports, bank statements, or Plaid payloads. The normalization engine automatically standardizes dates, merchants (e.g. AMZN Mktp &rarr; Amazon), and currency values before vector indexing.
          </p>

          <div className="border-2 border-dashed border-zinc-700 hover:border-accent rounded-xl p-6 text-center transition-colors">
            <input
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileImport}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-accent/80" />
              <span className="text-xs font-medium text-text">Click to choose CSV / JSON / Statement file</span>
              <span className="text-[10px] text-zinc-500">Supports Chase, Amex, Plaid JSON, and standard CSV formats</span>
            </label>
          </div>

          {ingestPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Previewing {ingestPreview.length} Normalized Records
                </span>
                <button
                  onClick={handleConfirmIngest}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent text-primary rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Index into Vector RAG Database
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto border border-zinc-800 rounded-lg p-2 bg-[#09090b]">
                <table className="w-full text-left text-xs">
                  <thead className="text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="pb-1">Date</th>
                      <th className="pb-1">Merchant (Normalized)</th>
                      <th className="pb-1">Amount</th>
                      <th className="pb-1">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {ingestPreview.slice(0, 5).map((rec, i) => (
                      <tr key={i}>
                        <td className="py-1">{rec.date}</td>
                        <td className="py-1 font-medium text-text">{rec.merchant}</td>
                        <td className="py-1 text-emerald-400">${rec.amount.toFixed(2)}</td>
                        <td className="py-1 text-zinc-400">{rec.financial_category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Chat Stream Container */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-4 sm:p-6 min-h-[420px] flex flex-col justify-between">
        <div className="space-y-6 overflow-y-auto max-h-[560px] pr-2">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {msg.sender === 'user' ? (
                /* User Message Bubble */
                <div className="flex justify-end">
                  <div className="bg-accent/10 border border-accent/20 text-text max-w-lg rounded-2xl rounded-tr-xs px-4 py-3 text-sm">
                    <p className="font-medium">{msg.text}</p>
                    <span className="text-[10px] text-accent/60 block text-right mt-1">{msg.timestamp}</span>
                  </div>
                </div>
              ) : (
                /* AI Assistant Response Box */
                <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  {/* Step Header & RAG Metadata Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-xs">
                        CFO
                      </div>
                      <span className="text-xs font-semibold text-text">AI Financial Advisor</span>
                    </div>

                    {msg.intent && (
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 bg-[#18181b] px-2.5 py-1 rounded-full border border-zinc-800">
                        <span className="text-accent font-medium">Intent: {msg.intent}</span>
                        {msg.retrievedChunks?.length > 0 && (
                          <span className="text-zinc-500">({msg.retrievedChunks.length} chunks retrieved)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Plain Text Response */}
                  <div className="pt-1">
                    {renderMarkdownText(msg.response?.fullText || msg.response?.summary)}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center space-x-2 text-xs text-zinc-400 bg-[#09090b] p-4 rounded-xl border border-zinc-800 animate-pulse">
              <RefreshCw size={14} className="animate-spin text-accent" />
              <span>Retrieving vectors, executing metadata filter, and verifying grounded evidence...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder="Ask a question about your spending, investments, taxes, or subscriptions..."
            className="flex-1 bg-[#09090b] border border-zinc-800 hover:border-zinc-700 focus:border-accent text-text placeholder-zinc-500 text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors"
          />
          <button
            onClick={() => handleSendQuery()}
            disabled={!inputQuery.trim() || isProcessing}
            className="bg-accent hover:bg-accent-hover text-primary p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
