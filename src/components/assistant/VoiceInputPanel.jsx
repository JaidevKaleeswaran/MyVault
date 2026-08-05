import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, X, Volume2, Bot } from 'lucide-react';
import { parseSpokenReceipt, createWebSpeechRecognition, speakTransactionDetails } from '../../services/agents/voiceAgent';

/**
 * VoiceInputPanel — MyVault Native Voice Receipt Agent
 * 
 * Uses our internal AI agent pipeline to recognize, parse, and process
 * voice receipts into structured transactions without external SDK dependencies.
 */
export default function VoiceInputPanel({ onTransactionReady, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);

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

  // Start native speech recognition
  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);

    const recognition = createWebSpeechRecognition(
      (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript('');
          const parsed = parseSpokenReceipt(text);
          setParsedData({
            ...parsed,
            raw_transcript: text,
          });
          setIsListening(false);
        } else {
          setInterimTranscript(text);
        }
      },
      (err) => {
        console.error('Voice agent recognition error:', err);
        setError(err.message === 'not-allowed'
          ? 'Microphone permission denied. Please enable microphone access.'
          : `Speech error: ${err.message || 'Could not process audio'}`
        );
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (!recognition) {
      setError('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Speech recognition start error:', e);
      setIsListening(false);
    }
  }, []);

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
        raw_transcript: parsedData.raw_transcript || transcript,
      });
    }
  };

  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);
    setError(null);
  };

  // Waveform animation height
  const barCount = 24;
  const getBarHeight = (index) => {
    if (!isListening) return 4;
    const wave = Math.sin((pulsePhase * 0.08) + (index * 0.5)) * 0.5 + 0.5;
    const rand = Math.sin(pulsePhase * 0.05 + index * 1.7) * 0.3 + 0.7;
    return 4 + wave * rand * 28;
  };

  return (
    <div className="bg-gradient-to-b from-[#0c0c14] to-[#18181b] border border-zinc-800 rounded-2xl p-6 space-y-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-accent/5 pointer-events-none" />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors z-10"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="text-center relative z-10">
        <h3 className="text-sm font-semibold text-text flex items-center justify-center gap-2">
          <Bot size={16} className="text-violet-400" />
          MyVault Voice Receipt Agent
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Say what you bought, how much, and when (e.g. "$15 on Taco Bell")
        </p>
      </div>

      {/* Mic Button */}
      <div className="flex justify-center relative z-10">
        <div className="relative">
          {isListening && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-violet-400/30 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute -inset-3 rounded-full border border-violet-400/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
            </>
          )}

          <button
            onClick={isListening ? stopListening : startListening}
            disabled={!!parsedData}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isListening
                ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-500/30 scale-110'
                : parsedData
                  ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30 cursor-default'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-2 border-zinc-700 hover:border-violet-500/50'
            }`}
          >
            {parsedData ? (
              <CheckCircle2 size={32} />
            ) : isListening ? (
              <MicOff size={32} />
            ) : (
              <Mic size={32} />
            )}
          </button>
        </div>
      </div>

      {/* Waveform Visualizer */}
      <div className="flex items-center justify-center gap-[2px] h-10 relative z-10">
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all ${
              isListening ? 'bg-gradient-to-t from-violet-500 to-violet-300' : 'bg-zinc-700'
            }`}
            style={{
              height: `${getBarHeight(i)}px`,
              transition: isListening ? 'height 0.1s ease' : 'height 0.3s ease',
              opacity: isListening ? 0.8 + Math.sin(i * 0.5) * 0.2 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="text-center relative z-10">
        {isListening && (
          <p className="text-xs text-violet-400 flex items-center justify-center gap-1.5 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Listening... speak your receipt
          </p>
        )}
        {!isListening && !transcript && !error && !parsedData && (
          <p className="text-xs text-zinc-500">
            Tap mic to speak your receipt details
          </p>
        )}
      </div>

      {/* Live Transcript */}
      {(interimTranscript || transcript) && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 relative z-10">
          <p className="text-[10px] text-zinc-500 uppercase font-medium mb-1">Transcript</p>
          <p className="text-sm text-zinc-200">
            {transcript || <span className="text-zinc-400 italic">{interimTranscript}</span>}
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
              Re-record
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
            onClick={startListening}
            className="mt-2 text-xs text-violet-300 hover:text-violet-200 underline block"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
