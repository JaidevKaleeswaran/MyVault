import React, { useState } from 'react';
import { X, Mic, Calendar, FileText, Search, Trash2, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { useBudget } from '../../contexts/BudgetContext';

export default function VoiceAuditLogModal({ isOpen, onClose }) {
  const { voiceLogs = [], dispatch } = useBudget();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  if (!isOpen) return null;

  const filteredLogs = voiceLogs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.rawTranscript || '').toLowerCase().includes(term) ||
      (log.extracted?.merchant || '').toLowerCase().includes(term) ||
      (log.extracted?.category || '').toLowerCase().includes(term)
    );
  });

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all voice audit logs?')) {
      dispatch({ type: 'CLEAR_VOICE_LOGS' });
      setSelectedLog(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121217] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-violet-500/20 text-violet-400 rounded-xl border border-violet-500/30">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text flex items-center gap-2">
                Voice Audit Log Inspector
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={10} /> Option 2 Data Store
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Verbatim user speech transcripts and structured agent data logs.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {voiceLogs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors"
                title="Clear Voice Logs"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-zinc-800/50 bg-zinc-950/30 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search speech transcript, merchant, or category..."
              className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 text-xs text-text placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none transition-colors"
            />
          </div>
          <div className="text-xs text-zinc-400 px-2 font-mono">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                <Mic size={24} />
              </div>
              <p className="text-sm font-medium text-zinc-300">No voice logs found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Speak a receipt or query using the voice agent to record raw user speech transcripts into the audit store.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                className={`bg-zinc-900/60 hover:bg-zinc-900 border transition-all rounded-xl p-4 cursor-pointer space-y-3 ${
                  selectedLog?.id === log.id
                    ? 'border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Log Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 bg-violet-500/20 text-violet-300 rounded">
                      <Mic size={12} />
                    </span>
                    <span className="font-semibold text-zinc-200">
                      {log.extracted?.merchant || 'Voice Entry'}
                    </span>
                    {log.extracted?.amount > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded text-[11px]">
                        ${log.extracted.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {log.displayTime || new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    {log.transactionId && (
                      <span className="flex items-center gap-1 text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                        <Tag size={10} /> {log.transactionId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Verbatim Speech Transcript (Option 1 & 2 Core Requirement) */}
                <div className="bg-black/40 border border-zinc-800/60 rounded-lg p-3">
                  <p className="text-[10px] text-violet-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                    <FileText size={10} /> Raw User Speech (Verbatim Transcript)
                  </p>
                  <p className="text-xs text-zinc-200 italic font-sans leading-relaxed">
                    "{log.rawTranscript}"
                  </p>
                </div>

                {/* Expanded Details */}
                {selectedLog?.id === log.id && (
                  <div className="pt-2 border-t border-zinc-800/60 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                      Pydantic / Agent Extracted JSON Schema
                    </p>
                    <pre className="bg-zinc-950 p-3 rounded-lg text-[11px] text-emerald-400 font-mono overflow-x-auto border border-zinc-800">
                      {JSON.stringify(log.extracted || log, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center space-x-1 text-emerald-400">
            <CheckCircle2 size={13} />
            <span>Persisted in state log store (Option 1 & 2 Active)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
