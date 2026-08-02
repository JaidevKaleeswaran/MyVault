import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, X, Volume2 } from 'lucide-react';
import { parseSpokenReceipt, createWebSpeechRecognition } from '../../services/agents/voiceAgent';

/**
 * VoiceInputPanel — Premium voice interaction component
 * 
 * Uses the Web Speech API for real-time speech-to-text,
 * parses the transcript into structured transaction data,
 * and allows the user to confirm before adding to the dashboard.
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

  // Animate pulse ring
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

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);

    const recognition = createWebSpeechRecognition(
      // onResult
      (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setInterimTranscript('');
          // Auto-parse the spoken receipt
          const parsed = parseSpokenReceipt(text);
          setParsedData(parsed);
          setIsListening(false);
        } else {
          setInterimTranscript(text);
        }
      },
      // onError
      (err) => {
        console.error('Speech recognition error:', err);
        setError(err.message === 'not-allowed'
          ? 'Microphone access denied. Please allow microphone permissions.'
          : `Speech recognition error: ${err.message}`
        );
        setIsListening(false);
      },
      // onEnd
      () => {
        setIsListening(false);
      }
    );

    if (!recognition) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleConfirm = () => {
    if (parsedData && onTransactionReady) {
      onTransactionReady(parsedData);
    }
  };

  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setParsedData(null);
    setError(null);
  };

  // Waveform bar heights for animation
  const barCount = 24;
  const getBarHeight = (index) => {
    if (!isListening) return 4;
    const wave = Math.sin((pulsePhase * 0.08) + (index * 0.5)) * 0.5 + 0.5;
    const rand = Math.sin(pulsePhase * 0.05 + index * 1.7) * 0.3 + 0.7;
    return 4 + wave * rand * 28;
  };

  return (
    <div className="bg-gradient-to-b from-[#0c0c14] to-[#18181b] border border-zinc-800 rounded-2xl p-6 space-y-5 relative overflow-hidden">
      {/* Glassmorphism background effect */}
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
          <Volume2 size={16} className="text-violet-400" />
          Voice Receipt Input
        </h3>
        <p className="text-xs text-zinc-500 mt-1">
          Say what you bought, how much, and when
        </p>
      </div>

      {/* Microphone Button with Pulse Ring */}
      <div className="flex justify-center relative z-10">
        <div className="relative">
          {/* Animated pulse rings */}
          {isListening && (
            <>
              <div
                className="absolute inset-0 rounded-full border-2 border-violet-400/30 animate-ping"
                style={{ animationDuration: '1.5s' }}
              />
              <div
                className="absolute -inset-3 rounded-full border border-violet-400/20 animate-ping"
                style={{ animationDuration: '2s', animationDelay: '0.3s' }}
              />
              <div
                className="absolute -inset-6 rounded-full border border-violet-400/10 animate-ping"
                style={{ animationDuration: '2.5s', animationDelay: '0.6s' }}
              />
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
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-2 border-zinc-700 hover:border-violet-500/50 hover:shadow-violet-500/20'
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
              isListening
                ? 'bg-gradient-to-t from-violet-500 to-violet-300'
                : 'bg-zinc-700'
            }`}
            style={{
              height: `${getBarHeight(i)}px`,
              transition: isListening ? 'height 0.1s ease' : 'height 0.3s ease',
              opacity: isListening ? 0.8 + Math.sin(i * 0.5) * 0.2 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Status text */}
      <div className="text-center relative z-10">
        {isListening && (
          <p className="text-xs text-violet-400 flex items-center justify-center gap-1.5 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Listening... speak your receipt
          </p>
        )}
        {!isListening && !transcript && !error && !parsedData && (
          <p className="text-xs text-zinc-500">
            Tap the microphone and say something like "<span className="text-zinc-400">$10 on Taco Bell</span>"
          </p>
        )}
      </div>

      {/* Live Transcript */}
      {(interimTranscript || transcript) && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 relative z-10">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">Transcript</p>
          <p className="text-sm text-zinc-200">
            {transcript || <span className="text-zinc-400 italic">{interimTranscript}</span>}
          </p>
        </div>
      )}

      {/* Parsed Receipt Data */}
      {parsedData && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3 relative z-10 animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span className="text-xs font-semibold">Receipt Data Extracted</span>
            </div>
            <button
              type="button"
              onClick={() => speakTransactionDetails(parsedData)}
              className="flex items-center gap-1 text-[11px] bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 px-2.5 py-1 rounded-md transition-colors"
              title="Listen to receipt spoken with ElevenLabs"
            >
              <Volume2 size={12} />
              <span>Speak Receipt</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Item</p>
              <p className="text-sm font-semibold text-text mt-0.5">{parsedData.description}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Amount</p>
              <p className="text-sm font-semibold text-emerald-400 mt-0.5">${parsedData.amount.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900/50 rounded-lg p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Date</p>
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
              Add to Dashboard
            </button>
          </div>
        </div>
      )}


      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 relative z-10">
          <p className="text-xs text-red-400">{error}</p>
          <button
            onClick={handleReset}
            className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
