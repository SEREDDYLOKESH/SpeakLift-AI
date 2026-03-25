import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STOP_WORDS = [
  'goodbye', 'good bye', 'bye', 'bye bye', 'stop', 'quit', 'exit',
  'end', 'stop listening', "that's all", 'that is all', 'see you',
  'take care', 'pause', 'finish', 'done', 'stop conversation',
];

const isStopCommand = (text) => {
  const lower = text.toLowerCase().trim();
  return STOP_WORDS.some(word => lower.includes(word));
};

// ─── API Key Setup Screen ────────────────────────────────────────────────────
function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('gsk_')) {
      setError('Invalid key. Groq API keys start with "gsk_".');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-icon">🔑</div>
        <h2>Enter Your Groq API Key</h2>
        <p className="setup-desc">
          This app uses <strong>Groq</strong> (free) to power the AI coach.
          Your key is stored <strong>only in your browser</strong> — never on our server.
        </p>
        <ol className="setup-steps">
          <li>Go to <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a></li>
          <li>Sign up for free → click <strong>API Keys</strong></li>
          <li>Click <strong>Create API Key</strong> → copy it</li>
          <li>Paste it below 👇</li>
        </ol>
        <div className="setup-input-row">
          <input
            id="groq-api-key-input"
            type="password"
            placeholder="gsk_..."
            value={key}
            onChange={e => { setKey(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button id="groq-api-key-save-btn" className="btn btn-primary" onClick={handleSave}>
            Save &amp; Start
          </button>
        </div>
        {error && <p className="setup-error">{error}</p>}
      </div>
    </div>
  );
}

// ─── Settings Modal ──────────────────────────────────────────────────────────
function SettingsModal({ currentKey, onSave, onClose }) {
  const [key, setKey] = useState(currentKey || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('gsk_')) {
      setError('Invalid key. Groq API keys start with "gsk_".');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Settings</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="setup-desc">Update your Groq API key. It stays only in your browser.</p>
        <div className="setup-input-row">
          <input
            id="settings-api-key-input"
            type="password"
            placeholder="gsk_..."
            value={key}
            onChange={e => { setKey(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button id="settings-save-btn" className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
        {error && <p className="setup-error">{error}</p>}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [chatLog, setChatLog] = useState(() => {
    const saved = localStorage.getItem('english_coach_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [interimText, setInterimText] = useState('');

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const userTextRef = useRef('');

  // Refs so callbacks always get latest values
  const isSessionActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const processUserSpeechRef = useRef();
  const restartTimerRef = useRef(null);

  // Sync refs
  useEffect(() => { isSessionActiveRef.current = isSessionActive; }, [isSessionActive]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { processUserSpeechRef.current = processUserSpeech; });

  // Persist chat log
  useEffect(() => {
    localStorage.setItem('english_coach_history', JSON.stringify(chatLog));
  }, [chatLog]);

  // Auto-scroll
  useEffect(() => {
    if (!showHistory) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, interimText, isThinking, showHistory]);

  // Safe mic restart (with small delay to avoid InvalidStateError)
  const safeStartListening = () => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (
        isSessionActiveRef.current &&
        !isAiSpeakingRef.current &&
        !isThinkingRef.current &&
        recognitionRef.current
      ) {
        try { recognitionRef.current.start(); } catch (e) { /* already started */ }
      }
    }, 300);
  };

  const endSession = () => {
    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setIsListening(false);
    setIsAiSpeaking(false);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.stop(); } catch (e) {}
    window.speechSynthesis?.cancel();
  };

  // Speech recognition setup
  useEffect(() => {
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // stop-and-restart gives cleaner results
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalChunk = '';
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += chunk;
        else currentInterim += chunk;
      }
      setInterimText(currentInterim);
      if (finalChunk) userTextRef.current += ' ' + finalChunk;
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        endSession();
        alert('Microphone access denied. Please allow microphone access.');
      }
      // On no-speech or network error, restart if session still active
      if (['no-speech', 'network', 'audio-capture'].includes(event.error)) {
        setIsListening(false);
        safeStartListening();
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      const spokenText = userTextRef.current.trim();
      userTextRef.current = '';

      if (spokenText && isSessionActiveRef.current) {
        processUserSpeechRef.current?.(spokenText);
      } else if (isSessionActiveRef.current && !isAiSpeakingRef.current && !isThinkingRef.current) {
        // No speech detected but session is active — restart listening
        safeStartListening();
      }
    };

    return () => {
      recognition.stop();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    };
  }, []);

  const processUserSpeech = async (text) => {
    // ── Stop command check ──────────────────────────────────────────────────
    if (isStopCommand(text)) {
      endSession();
      const farewells = [
        "Goodbye! You did great today. Keep practicing!",
        "See you next time! Great effort today!",
        "Bye! Remember, practice makes perfect. Well done!",
        "Take care! You're making wonderful progress!",
      ];
      const farewell = farewells[Math.floor(Math.random() * farewells.length)];
      const messageId = Date.now();
      setChatLog(prev => [
        ...prev,
        { id: messageId, role: 'user', content: text },
        { id: messageId + 1, role: 'ai', response: farewell, corrected_sentence: '', explanation: '', suggestion: '' },
      ]);
      speakAIResponse(farewell, false); // false = don't restart mic after
      return;
    }

    // ── Normal speech processing ────────────────────────────────────────────
    const messageId = Date.now();
    setChatLog(prev => [...prev, { id: messageId, role: 'user', content: text }]);
    setIsThinking(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, apiKey }),
      });

      const data = await response.json();
      setIsThinking(false);

      if (!response.ok) {
        const errMsg = data.message || 'Something went wrong.';
        setChatLog(prev => [...prev, { id: messageId + 1, role: 'ai', response: `⚠️ ${errMsg}` }]);
        speakAIResponse('There was an error. Please check your API key in settings.', false);
        return;
      }

      setChatLog(prev => [...prev, { id: messageId + 1, relatedId: messageId, role: 'ai', ...data }]);
      speakAIResponse(data.response, true); // true = restart mic after AI speaks
    } catch (error) {
      console.error('API Error:', error);
      setIsThinking(false);
      setChatLog(prev => [...prev, { id: messageId + 1, role: 'ai', response: 'Connection issue detected.' }]);
      speakAIResponse("I'm having trouble connecting.", false);
    }
  };

  const speakAIResponse = (text, restartAfter = true) => {
    if (!window.speechSynthesis || !text) {
      if (restartAfter) safeStartListening();
      return;
    }
    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);

    const doSpeak = (voices) => {
      const englishVoice =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) utterance.voice = englishVoice;
      utterance.rate = 1.0;

      utterance.onend = () => {
        setIsAiSpeaking(false);
        if (restartAfter && isSessionActiveRef.current) safeStartListening();
      };
      utterance.onerror = () => {
        setIsAiSpeaking(false);
        if (restartAfter && isSessionActiveRef.current) safeStartListening();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => doSpeak(window.speechSynthesis.getVoices());
    } else {
      doSpeak(voices);
    }
  };

  const toggleSession = () => {
    if (isSessionActive || isListening || isAiSpeaking) {
      endSession();
    } else {
      setIsSessionActive(true);
      isSessionActiveRef.current = true;
      setShowHistory(false);
      // Give browser a moment then start
      setTimeout(() => {
        try { recognitionRef.current?.start(); } catch (e) {}
      }, 200);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire conversation history?')) {
      setChatLog([]);
    }
  };

  const saveApiKey = (key) => {
    localStorage.setItem('groq_api_key', key);
    setApiKey(key);
  };

  const getSpeechHistory = () => {
    const historyList = [];
    let lastUserMessage = null;
    chatLog.forEach((log) => {
      if (log.role === 'user') {
        lastUserMessage = log;
        historyList.push({ userContent: log.content, aiFeedback: null, id: log.id });
      } else if (log.role === 'ai' && lastUserMessage) {
        const target = historyList[historyList.length - 1];
        if (target && target.id === lastUserMessage.id) target.aiFeedback = log;
      }
    });
    return historyList.reverse();
  };

  const sessionStatus = isAiSpeaking
    ? 'AI is speaking...'
    : isThinking
    ? 'Thinking...'
    : isListening
    ? 'Listening — speak now'
    : isSessionActive
    ? 'Waiting...'
    : 'Tap to start conversation';

  // Show setup screen if no API key
  if (!apiKey) return <ApiKeySetup onSave={saveApiKey} />;

  return (
    <div className="main-container">
      {showSettings && (
        <SettingsModal
          currentKey={apiKey}
          onSave={saveApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      <header className="header">
        <div className="header-title">
          <h1>AI English Coach</h1>
          <p>Your real-time speaking partner.</p>
        </div>
        <div className="header-actions">
          <button id="view-history-btn" className="btn" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? '💬 Chat' : '📜 History'}
          </button>
          <button id="settings-btn" className="btn" onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </button>
          <button id="clear-btn" className="btn btn-danger" onClick={clearHistory}>
            🗑️ Clear
          </button>
        </div>
      </header>

      {/* Stop-word hint banner when session is active */}
      {isSessionActive && (
        <div className="session-hint">
          🎙️ Continuous mode active — say <strong>"goodbye"</strong> or <strong>"stop"</strong> to end
        </div>
      )}

      {showHistory ? (
        <div className="history-panel">
          <div className="history-header">
            <h2>Your Spoken Sentences</h2>
            <p style={{ color: 'var(--text-muted)' }}>Review everything you've said and learn from past mistakes.</p>
          </div>
          <div className="history-list">
            {getSpeechHistory().length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No history yet. Start speaking!</p>
            ) : (
              getSpeechHistory().map((item) => (
                <div key={item.id} className="history-item">
                  <div className="spoken">"{item.userContent}"</div>
                  {item.aiFeedback && (item.aiFeedback.corrected_sentence || item.aiFeedback.explanation) && (
                    <div className="feedback-section" style={{ marginTop: '0.5rem' }}>
                      {item.aiFeedback.corrected_sentence && (
                        <div className="feedback-item correction">
                          <span className="label">✓ Recommended phrasing</span>
                          <span className="feedback-content">{item.aiFeedback.corrected_sentence}</span>
                        </div>
                      )}
                      {item.aiFeedback.explanation && (
                        <div className="feedback-item explanation">
                          <span className="label">💡 Note</span>
                          <span className="feedback-content">{item.aiFeedback.explanation}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {(!item.aiFeedback || (!item.aiFeedback.corrected_sentence && !item.aiFeedback.explanation)) && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>✓ Perfect execution!</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="chat-container">
          {chatLog.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎤</div>
              <p>Tap the mic below to start a continuous English session!</p>
              <p className="empty-sub">The AI will coach you automatically after every sentence.</p>
            </div>
          )}

          {chatLog.map((log, index) => (
            <div key={log.id || index} className={`chat-bubble ${log.role}`}>
              <div className="chat-label">
                {log.role === 'user' ? '🎤 You' : '🤖 AI Coach'}
              </div>
              <div className="chat-text">
                {log.role === 'user' ? log.content : log.response}
              </div>
              {log.role === 'ai' && (log.corrected_sentence || log.explanation || log.suggestion) && (
                <div className="feedback-section">
                  {log.corrected_sentence && (
                    <div className="feedback-item correction">
                      <span className="label">✓ Corrected</span>
                      <span className="feedback-content">{log.corrected_sentence}</span>
                    </div>
                  )}
                  {log.explanation && (
                    <div className="feedback-item explanation">
                      <span className="label">💡 Note</span>
                      <span className="feedback-content">{log.explanation}</span>
                    </div>
                  )}
                  {log.suggestion && (
                    <div className="feedback-item suggestion">
                      <span className="label">✨ Suggestion</span>
                      <span className="feedback-content">{log.suggestion}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {interimText && (
            <div className="chat-bubble user interim">
              <div className="chat-label">🎤 Listening...</div>
              <div className="chat-text">{interimText}</div>
            </div>
          )}

          {isThinking && (
            <div className="chat-bubble ai typing">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="controls-dock" style={{ display: showHistory ? 'none' : 'flex' }}>
        <div className="mic-container">
          <button
            id="mic-btn"
            className={`mic-btn ${isListening ? 'listening' : ''} ${isAiSpeaking ? 'speaking' : ''} ${isSessionActive && !isListening && !isAiSpeaking ? 'session-idle' : ''}`}
            onClick={toggleSession}
            title={isSessionActive ? 'Stop Session' : 'Start Continuous Session'}
          >
            {isAiSpeaking ? '🔊' : isListening ? '🛑' : '🎙️'}
          </button>
        </div>
        <div className="status-text">{sessionStatus}</div>
      </div>
    </div>
  );
}

export default App;
