/**
 * AI Automation SDK — Voice Engine
 * Wraps the Web Speech API and emits `ai:voice` custom events on the document.
 */

const SUPPORTED = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

class VoiceEngine {
    constructor() {
        this.recognition = null;
        this.listening = false;
        this.indicator = null;
        this._restartTimer = null;
        this._setupUI();
    }

    get isSupported() {
        return SUPPORTED;
    }

    start() {
        if (!SUPPORTED) {
            console.warn('[AI SDK] Speech Recognition is not supported in this browser. Try Chrome or Edge.');
            return;
        }
        if (this.listening) return;

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SR();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.listening = true;
            this._setIndicatorState('listening');
            console.log('[AI SDK] Voice engine started — listening…');
        };

        this.recognition.onend = () => {
            this.listening = false;
            // Auto restart unless explicitly stopped
            if (!this._stopped) {
                this._restartTimer = setTimeout(() => this.start(), 300);
            } else {
                this._setIndicatorState('idle');
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error === 'not-allowed') {
                console.error('[AI SDK] Microphone access denied. Please grant microphone permission.');
                this._setIndicatorState('error');
                this._stopped = true;
                return;
            }
            if (event.error === 'no-speech') return; // benign, will restart
            console.warn('[AI SDK] Voice error:', event.error);
        };

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            if (!result.isFinal) return;

            const transcript = result[0].transcript.trim().toLowerCase().replace(/[.,!?;:]+$/, '');
            const confidence = result[0].confidence;

            this._setIndicatorState('processing');
            setTimeout(() => this._setIndicatorState('listening'), 800);

            console.log(`[AI SDK] Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);

            document.dispatchEvent(new CustomEvent('ai:voice', {
                detail: { transcript, confidence, raw: result[0].transcript.trim() },
                bubbles: true,
            }));
        };

        this._stopped = false;
        this.recognition.start();
    }

    stop() {
        this._stopped = true;
        clearTimeout(this._restartTimer);
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        this.listening = false;
        this._setIndicatorState('idle');
        console.log('[AI SDK] Voice engine stopped.');
    }

    toggle() {
        this.listening ? this.stop() : this.start();
    }

    // ─── Floating UI indicator ────────────────────────────────────────────────

    _setupUI() {
        if (typeof document === 'undefined') return;

        const container = document.createElement('div');
        container.id = 'ai-sdk-mic-indicator';
        container.innerHTML = `
      <button id="ai-sdk-mic-btn" title="Toggle voice commands (AI SDK)" aria-label="Toggle AI voice commands">
        <svg id="ai-sdk-mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor"/>
          <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span id="ai-sdk-mic-label">AI Voice</span>
      </button>
      <div id="ai-sdk-transcript"></div>
    `;

        const style = document.createElement('style');
        style.textContent = `
      #ai-sdk-mic-indicator {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        font-family: 'Inter', system-ui, sans-serif;
      }
      #ai-sdk-mic-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.02em;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: linear-gradient(135deg, #7c3aed, #06b6d4);
        color: #fff;
        box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
      }
      #ai-sdk-mic-btn:hover {
        transform: scale(1.06);
        box-shadow: 0 6px 28px rgba(124, 58, 237, 0.55);
      }
      #ai-sdk-mic-btn svg {
        width: 18px;
        height: 18px;
        color: #fff;
      }
      #ai-sdk-mic-indicator.listening #ai-sdk-mic-btn {
        background: linear-gradient(135deg, #059669, #10b981);
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5);
        animation: ai-pulse 1.6s ease-in-out infinite;
      }
      #ai-sdk-mic-indicator.processing #ai-sdk-mic-btn {
        background: linear-gradient(135deg, #d97706, #f59e0b);
        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5);
      }
      #ai-sdk-mic-indicator.error #ai-sdk-mic-btn {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
      }
      @keyframes ai-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5); }
        50%       { box-shadow: 0 4px 32px rgba(16, 185, 129, 0.85), 0 0 0 8px rgba(16, 185, 129, 0.15); }
      }
      #ai-sdk-transcript {
        background: rgba(10, 10, 15, 0.92);
        color: #e2e8f0;
        border: 1px solid rgba(124, 58, 237, 0.35);
        border-radius: 12px;
        padding: 8px 14px;
        font-size: 12px;
        max-width: 260px;
        display: none;
        backdrop-filter: blur(12px);
      }
      #ai-sdk-transcript.visible { display: block; }
    `;

        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(style);
            document.body.appendChild(container);

            document.getElementById('ai-sdk-mic-btn').addEventListener('click', () => this.toggle());

            // Show transcript briefly on voice event
            document.addEventListener('ai:voice', (e) => {
                const el = document.getElementById('ai-sdk-transcript');
                if (!el) return;
                el.textContent = `"${e.detail.raw}"`;
                el.classList.add('visible');
                clearTimeout(this._transcriptTimer);
                this._transcriptTimer = setTimeout(() => el.classList.remove('visible'), 2800);
            });
        });
    }

    _setIndicatorState(state) {
        const el = document.getElementById('ai-sdk-mic-indicator');
        if (!el) return;
        el.className = state;
        const label = document.getElementById('ai-sdk-mic-label');
        if (!label) return;
        const labels = { idle: 'AI Voice', listening: 'Listening…', processing: 'Processing…', error: 'No Access' };
        label.textContent = labels[state] || 'AI Voice';
    }
}

// Singleton
const voiceEngine = new VoiceEngine();
export default voiceEngine;
