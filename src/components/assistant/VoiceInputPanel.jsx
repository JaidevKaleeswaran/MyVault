import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, X, Volume2, Bot, Send, MessageSquare, Sparkles } from 'lucide-react';
import { parseSpokenReceipt, createWebSpeechRecognition, speakTransactionDetails } from '../../services/agents/voiceAgent';

/**
 * VoiceInputPanel — MyVault Smart Receipt Input Agent
 * 
 * Primary mode: Text input with AI parsing
 * Secondary mode: Voice input (when available on HTTPS)
 * 
 * Uses our internal AI agent pipeline to parse natural language
 * purchase descriptions into structured transactions.
 */
export default function VoiceInputPanel({ onTransactionReady, onClose }) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const inputRef = useRef(null);

  // Check if voice is supported on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  // Auto-focus text input
  useEffect(() => {
    if (inputRef.current && !parsedData) {
      inputRef.current.focus();
    }
  }, [parsedData]);

  // Pulse animation for mic ring
  useEffect(() => {
    if (!isListening) return;
    let frame = 0;
    const animate = () => {
      frame++;
      setPulsePhase(frame);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isListening]);

  // Process text input through the parseSpokenReceipt pipeline
  const processText = useCallback((text) => {
    if (!text || !text.trim()) return;

    setIsProcessing(true);
    setError(null);

    // Small delay for visual feedback
    setTimeout(() => {
      try {
        const parsed = parseSpokenReceipt(text.trim());
        if (parsed && parsed.amount > 0) {
          setParsedData({
            ...parsed,
            raw_transcript: text.trim(),
          });
        } else {
          setError('Could not extract a valid amount. Try something like "$15 on Taco Bell" or "Spent 20 dollars at Walmart"');
        }
      } catch (err) {
        setError(`Failed to parse: ${err.message}`);
      }
      setIsProcessing(false);
    }, 300);
  }, []);

  // Handle form submit (Enter key or button click)
  const handleSubmit = (e) => {
    e?.preventDefault();
    processText(inputText);
  };

  // Try voice input (with graceful fallback)
  const startListening = useCallback(() => {
    setError(null);
    setInterimTranscript('');
    setParsedData(null);

    const recognition = createWebSpeechRecognition(
      (text, isFinal) => {
        if (isFinal) {
          setInputText(text);
          setInterimTranscript('');
          setIsListening(false);
          processText(text);
        } else {
          setInterimTranscript(text);
        }
      },
      (err) => {
        setIsListening(false);
        if (err.message === 'not-allowed') {
          setError('Microphone permission denied. Please enable microphone access in your browser settings.');
        } else if (err.message === 'network') {
          // This is the common localhost issue — guide user to use text input instead
          setError('Voice recognition requires HTTPS. Please type your receipt details below instead.');
        } else {
          setError(`Voice error: ${err.message}. You can type your receipt details below instead.`);
        }
      },
      () => {
        setIsListening(false);
      }
    );

    if (!recognition) {
      setError('Speech recognition is not supported. Please type your receipt details below.');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      setIsListening(false);
      setError('Could not start speech recognition. Please type your receipt details below.');
    }
  }, [processText]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleConfirm = () => {
    if (parsedData && onTransactionReady) {
      onTransactionReady({
        ...parsedData,
        raw_transcript: parsedData.raw_transcript || inputText,
      });
    }
  };

  const handleReset = () => {
    setInputText('');
    setInterimTranscript('');
    setParsedData(null);
    setError(null);
    setIsProcessing(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Waveform animation height
  const barCount = 20;
  const getBarHeight = (index) => {
    if (!isListening) return 3;
    const wave = Math.sin((pulsePhase * 0.08) + (index * 0.5)) * 0.5 + 0.5;
    const rand = Math.sin(pulsePhase * 0.05 + index * 1.7) * 0.3 + 0.7;
    return 3 + wave * rand * 22;
  };

  return (
    <div className="bg-gradient-to-b from-[#0c0c14] to-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-accent/5 pointer-events-none" />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors z-10"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="text-center relative z-10">
        <h3 className="text-sm font-semibold text-text flex items-center justify-center gap-2">
          <Sparkles size={16} className="text-violet-400" />
          Quick Receipt Entry
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Describe your purchase naturally
        </p>
      </div>

      {/* Text Input Form — Primary mode */}
      {!parsedData && (
        <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={isListening ? interimTranscript : inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='e.g. "$15 on Taco Bell" or "Spent 30 at Walmart yesterday"'
              disabled={isListening || isProcessing}
              className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl px-4 py-3 pr-24 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Voice mic button (secondary) */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-all ${
                    isListening
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-105'
                      : 'text-zinc-500 hover:text-violet-400 hover:bg-zinc-800'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak receipt'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              {/* Submit button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !isListening) || isProcessing}
                className="p-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Parse receipt"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5">
            {['$12 at Subway', '$50 groceries at Target', 'Paid $9.99 for Netflix'].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setInputText(example);
                  processText(example);
                }}
                className="text-[11px] px-2.5 py-1 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 rounded-full border border-zinc-700/50 hover:border-zinc-600 transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* Waveform Visualizer (only when listening) */}
      {isListening && (
        <div className="flex items-center justify-center gap-[2px] h-8 relative z-10">
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className="w-[2.5px] rounded-full bg-gradient-to-t from-violet-500 to-violet-300"
              style={{
                height: `${getBarHeight(i)}px`,
                transition: 'height 0.1s ease',
                opacity: 0.7 + Math.sin(i * 0.5) * 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* Listening status */}
      {isListening && (
        <div className="text-center relative z-10">
          <p className="text-xs text-violet-400 flex items-center justify-center gap-1.5 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Listening... speak your receipt
          </p>
        </div>
      )}

      {/* Parsed Receipt Summary */}
      {parsedData && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3 relative z-10 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="text-xs font-semibold">Extracted Receipt Data</span>
            </div>
            <button
              type="button"
              onClick={() => speakTransactionDetails(parsedData)}
              className="flex items-center gap-1 text-[11px] bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 px-2.5 py-1 rounded-md transition-colors"
            >
              <Volume2 size={12} />
              <span>Speak</span>
            </button>
          </div>

          {/* Source text */}
          <div className="bg-zinc-900/50 rounded-lg p-2.5">
            <p className="text-[10px] text-zinc-500 uppercase mb-1">Input</p>
            <p className="text-xs text-zinc-300 italic">"{parsedData.raw_transcript}"</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase">Item</p>
              <p className="text-sm font-semibold text-text mt-0.5">{parsedData.description}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase">Amount</p>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">${Number(parsedData.amount).toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase">Date</p>
              <p className="text-sm font-semibold text-text mt-0.5">{parsedData.date}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white rounded-lg transition-all shadow-lg shadow-violet-500/20"
            >
              Add Transaction
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 relative z-10">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={handleReset}
            className="mt-2 text-xs text-violet-300 hover:text-violet-200 underline block"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
