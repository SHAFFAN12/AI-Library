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

        const initUI = () => {
            if (document.getElementById('ai-sdk-mic-indicator')) return;
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
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
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

/**
 * AI Automation SDK — Core
 * Scans the DOM for ai-* classes and activates the corresponding modules.
 */

const _registry = new Map(); // className → module activate fn

function register(className, activateFn) {
    _registry.set(className, activateFn);
}

function init() {
    _scanAndActivate(document.body);

    // Watch for dynamic DOM changes
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                _scanAndActivate(node);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log(`[AI SDK] Initialized. Active modules: ${[..._registry.keys()].join(', ')}`);
}

function _scanAndActivate(root) {
    for (const [className, activate] of _registry) {
        // Check root element itself
        if (root.classList && root.classList.contains(className)) {
            _activate(root, className, activate);
        }
        // Check descendants
        root.querySelectorAll && root.querySelectorAll(`.${className}`).forEach((el) => {
            _activate(el, className, activate);
        });
    }
}

function _activate(el, className, activate) {
    const flag = `__ai_${className}_activated`;
    if (el[flag]) return; // already activated
    el[flag] = true;
    activate(el);
}

/**
 * AI Automation SDK — Module: ai-voice-fill  (v2)
 * Add class="ai-voice-fill" to any <form> to enable voice-powered field filling.
 *
 * On activation the module SCRAPES the form to detect all fillable fields,
 * builds a labelled field map, and displays what was found.
 *
 * Voice commands:
 *   "what fields" / "show fields"          → announces detected fields
 *   "autofill" / "fill form"               → starts sequential fill session
 *   "fill [field name] [value]"            → fills a specific field
 *   "fill [field name]"                    → selects field, awaits value next
 *   "next field" / "skip"                  → skip current session field
 *   "submit" / "submit form"               → submits the form
 *   "clear form"                           → clears all inputs
 *   "stop filling" / "cancel"             → exits any active session
 */


const HIGHLIGHT_COLOR = 'rgba(124, 58, 237, 0.18)';

register('ai-voice-fill', (form) => {
    // ── State ────────────────────────────────────────────────────────────────
    let activeField = null;
    let awaitingValue = false;

    // Sequential autofill session state
    let sessionFields = [];
    let sessionIdx = -1;
    let inSession = false;

    // ── Badge (status label above form) ──────────────────────────────────────
    // Badge lives in a wrapper OUTSIDE the form so badge text changes
    // don't trigger the MutationObserver that watches the form's children.
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;';
    form.parentNode.insertBefore(wrapper, form);
    wrapper.appendChild(form);
    const badge = _createBadge();
    wrapper.appendChild(badge);

    // ── Field scraping ────────────────────────────────────────────────────────
    // Scrape all fillable inputs and produce enriched metadata objects
    function scrapeFields() {
        const rawEls = [
            ...form.querySelectorAll(
                'input:not([type=submit]):not([type=button]):not([type=hidden])' +
                ':not([type=checkbox]):not([type=radio]):not([type=file]),' +
                'textarea, select'
            ),
        ];

        return rawEls.map((el) => {
            // Attempt to find associated <label>
            const labelEl =
                (el.id && form.querySelector(`label[for="${el.id}"]`)) ||
                el.closest('label') ||
                null;

            const label = (
                (labelEl && labelEl.textContent.trim()) ||
                el.getAttribute('aria-label') ||
                el.getAttribute('data-label') ||
                el.placeholder ||
                el.name ||
                el.id ||
                '(unlabelled)'
            ).trim();

            // All aliases (lowercased) used for fuzzy matching
            const aliases = [
                el.name,
                el.placeholder,
                el.id,
                el.getAttribute('aria-label'),
                el.getAttribute('data-label'),
                labelEl ? labelEl.textContent.trim() : null,
            ]
                .filter(Boolean)
                .map((s) => s.toLowerCase().trim());

            return {
                el,
                label,
                aliases,
                type: el.type || el.tagName.toLowerCase(),
            };
        });
    }

    // Initial scrape on activation
    let fieldMap = scrapeFields();
    console.log(
        `[AI SDK] voice-fill: detected ${fieldMap.length} field(s) →`,
        fieldMap.map((f) => `"${f.label}" (${f.type})`).join(', ')
    );

    // Show the field detection panel
    _showFieldPanel(form, fieldMap);
    badge.textContent = `🎙 ${fieldMap.length} field${fieldMap.length !== 1 ? 's' : ''} detected`;

    // Re-scrape if form DOM changes (SPA / dynamic forms)
    // Disconnect before updating to avoid re-entry cascade
    let _observing = false;
    const formObserver = new MutationObserver(() => {
        if (_observing) return; // guard re-entry
        _observing = true;
        formObserver.disconnect();
        fieldMap = scrapeFields();
        _showFieldPanel(form, fieldMap);
        badge.textContent = `🎙 ${fieldMap.length} fields detected`;
        formObserver.observe(form, { childList: true, subtree: true });
        _observing = false;
    });
    formObserver.observe(form, { childList: true, subtree: true });

    // ── Field matching ────────────────────────────────────────────────────────
    function findField(query) {
        query = query.toLowerCase().trim();
        // 1. Exact alias match
        let m = fieldMap.find((f) => f.aliases.some((a) => a === query));
        if (m) return m;
        // 2. Alias starts-with query OR query starts-with alias
        m = fieldMap.find((f) => f.aliases.some((a) => a.startsWith(query) || query.startsWith(a)));
        if (m) return m;
        // 3. Contains
        m = fieldMap.find((f) => f.aliases.some((a) => a.includes(query) || query.includes(a)));
        return m || null;
    }

    // ── Fill helper ──────────────────────────────────────────────────────────
    function fillField(fieldMeta, value) {
        const el = fieldMeta.el;
        if (!el || !el.isConnected) {
            console.warn('[AI SDK] fillField: element not in DOM, re-scraping…');
            fieldMap = scrapeFields();
            const fresh = fieldMap.find((f) => f.label === fieldMeta.label || f.aliases.some((a) => fieldMeta.aliases.includes(a)));
            if (!fresh) return;
            return fillField(fresh, value);
        }
        el.focus();
        // Use native value setter so React / Vue controlled inputs detect the change
        let nativeSet = null;
        let proto = Object.getPrototypeOf(el);
        while (proto && proto !== Object.prototype) {
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) {
                nativeSet = desc.set;
                break;
            }
            proto = Object.getPrototypeOf(proto);
        }

        if (nativeSet) {
            nativeSet.call(el, value);
        } else {
            el.value = value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        _highlightField(form, el);
    }

    // ── Sequential session ───────────────────────────────────────────────────
    function startSession() {
        fieldMap = scrapeFields(); // fresh scrape
        // Prefer unfilled fields; fall back to all
        sessionFields = fieldMap.filter((f) => !f.el.value.trim());
        if (sessionFields.length === 0) sessionFields = [...fieldMap];
        sessionIdx = 0;
        inSession = true;
        promptSessionField();
    }

    function promptSessionField() {
        if (sessionIdx >= sessionFields.length) { endSession(); return; }
        const f = sessionFields[sessionIdx];
        f.el.focus();
        _highlightField(form, f.el, true);
        badge.textContent = `🎯 [${sessionIdx + 1}/${sessionFields.length}] "${f.label}" — say value or "skip"`;
        awaitingValue = true;
        activeField = f;
    }

    function advanceSession() {
        if (activeField) _clearHighlight(activeField.el);
        sessionIdx++;
        activeField = null;
        awaitingValue = false;
        promptSessionField();
    }

    function endSession() {
        inSession = false;
        sessionFields = [];
        sessionIdx = -1;
        if (activeField) _clearHighlight(activeField.el);
        activeField = null;
        awaitingValue = false;
        badge.textContent = `✅ Autofill done — say "submit" to submit`;
        setTimeout(() => (badge.textContent = `🎙 ${fieldMap.length} fields detected`), 4000);
    }

    // ── Voice event handler ──────────────────────────────────────────────────
    document.addEventListener('ai:voice', (e) => {
        const t = e.detail.transcript;
        const raw = e.detail.raw;

        // --- Bug Fix #1: Removed bare |stop which was too greedy and cancelled fill
        //     when users spoke values containing the word "stop".
        // Cancel / stop
        if (t.match(/stop filling|cancel fill|exit fill|stop session|cancel session/)) {
            if (inSession && activeField) _clearHighlight(activeField.el);
            inSession = false; activeField = null; awaitingValue = false;
            badge.textContent = `🎙 ${fieldMap.length} fields detected`;
            return;
        }

        // "what fields" | "show fields" — announce detected fields
        if (t.match(/what fields|show fields|list fields|what are the fields|detect fields|which fields/)) {
            const names = fieldMap.map((f, i) => `${i + 1}. "${f.label}"`).join(', ');
            badge.textContent = `📋 ${names}`;
            console.log('[AI SDK] Detected fields:', names);
            setTimeout(() => (badge.textContent = `🎙 ${fieldMap.length} fields detected`), 5000);
            return;
        }

        // --- Bug Fix #3: Moved awaitingValue BEFORE the "autofill"/"fill form" trigger
        //     so that a pending field value is never misrouted as a new fill-all command.
        // Awaiting value (session or targeted)
        if (awaitingValue && activeField) {
            fillField(activeField, raw);
            badge.textContent = `✅ "${activeField.label}" → "${raw}"`;
            if (inSession) {
                const filled = activeField;
                awaitingValue = false;
                activeField = null;
                setTimeout(() => { _clearHighlight(filled.el); sessionIdx++; promptSessionField(); }, 900);
            } else {
                awaitingValue = false;
                activeField = null;
                setTimeout(() => (badge.textContent = `🎙 ${fieldMap.length} fields detected`), 2500);
            }
            return;
        }

        // "autofill" / "fill form" — start sequential guided session
        if (t.match(/^(autofill|auto fill|fill form|fill all|fill all fields|fill the form|start filling|start autofill)$/)) {
            startSession();
            return;
        }

        // "clear form"
        if (t.match(/clear form|clear all|reset form/)) {
            fieldMap.forEach((f) => {
                f.el.value = '';
                f.el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            badge.textContent = '🧹 Form cleared';
            setTimeout(() => (badge.textContent = `🎙 ${fieldMap.length} fields detected`), 2000);
            return;
        }

        // "submit"
        if (t.match(/^submit( form)?$/)) {
            badge.textContent = '📤 Submitting…';
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            return;
        }

        // "skip" / "next field" — advance session
        if (inSession && t.match(/^(skip|next field|skip this|pass|next)$/)) {
            badge.textContent = `⏭ Skipped "${activeField ? activeField.label : ''}"`;
            setTimeout(() => advanceSession(), 300);
            return;
        }

        // "fill [field] [value]" or "fill [field]" — targeted fill
        const fillMatch = t.match(/^(?:fill|autofill|auto fill|set|enter|type)\s+(.+)$/);
        if (fillMatch) {
            const rest = fillMatch[1].trim();
            let matched = null;
            let value = null;

            // --- Bug Fix #2: safe max alias length to avoid -Infinity on empty aliases
            const maxAliasLen = (fm) => fm.aliases.length ? Math.max(...fm.aliases.map((x) => x.length)) : 0;

            // Longest-alias-first search
            const sorted = [...fieldMap].sort((a, b) => maxAliasLen(b) - maxAliasLen(a));
            for (const fm of sorted) {
                for (const alias of fm.aliases.sort((a, b) => b.length - a.length)) {
                    if (rest.startsWith(alias + ' ') || rest === alias) {
                        matched = fm;
                        value = rest.startsWith(alias + ' ') ? rest.slice(alias.length).trim() : null;
                        break;
                    }
                    if (rest.includes(' ' + alias + ' ')) {
                        const idx = rest.indexOf(' ' + alias + ' ');
                        matched = fm;
                        value = (rest.slice(0, idx) + ' ' + rest.slice(idx + alias.length + 1)).trim();
                        break;
                    }
                }
                if (matched) break;
            }

            // Fallback: tokenized alias matching for partial fields (e.g., "name" matching "complete name")
            if (!matched) {
                for (const fm of sorted) {
                    for (const alias of fm.aliases) {
                        const words = alias.split(/\s+/);
                        for (const word of words) {
                            if (word.length >= 3 && (rest.startsWith(word + ' ') || rest === word)) {
                                matched = fm;
                                value = rest.startsWith(word + ' ') ? rest.slice(word.length).trim() : null;
                                break;
                            }
                        }
                        if (matched) break;
                    }
                    if (matched) break;
                }
            }

            if (!matched) matched = findField(rest);

            if (matched && value) {
                fillField(matched, value);
                badge.textContent = `✅ "${matched.label}" → "${value}"`;
                setTimeout(() => (badge.textContent = `🎙 ${fieldMap.length} fields detected`), 2500);
            } else if (matched) {
                activeField = matched;
                awaitingValue = true;
                matched.el.focus();
                _highlightField(form, matched.el, true);
                badge.textContent = `🎯 "${matched.label}" — say the value`;
            }
        }
    });
});

// ── DOM Helpers ──────────────────────────────────────────────────────────────

function _highlightField(form, el, persistent = false) {
    if (!el) return;
    // Clear previous
    const prev = form ? form.querySelector('.__ai-highlighted') : null;
    if (prev && prev !== el) _clearHighlight(prev);

    el.style.outline = '2px solid #7c3aed';
    el.style.background = HIGHLIGHT_COLOR;
    el.classList.add('__ai-highlighted');

    if (!persistent) {
        setTimeout(() => _clearHighlight(el), 1800);
    }
}

function _clearHighlight(el) {
    if (!el) return;
    el.style.outline = '';
    el.style.background = '';
    el.classList.remove('__ai-highlighted');
}

// ── Field Detection Panel ────────────────────────────────────────────────────

function _showFieldPanel(form, fieldMap) {
    const old = form.querySelector('.__ai-field-panel');
    if (old) old.remove();
    if (!fieldMap.length) return;

    const panel = document.createElement('div');
    panel.className = '__ai-field-panel';
    panel.innerHTML = `
    <div class="__ai-fp-title">🔍 ${fieldMap.length} field${fieldMap.length !== 1 ? 's' : ''} detected</div>
    <div class="__ai-fp-chips">
      ${fieldMap.map((f, i) => `
        <span class="__ai-fp-chip" data-idx="${i}" title='Say "fill ${f.label} [value]"'>
          <span class="__ai-fp-num">${i + 1}</span>
          ${f.label}
          <span class="__ai-fp-type">${_typeIcon(f.type)}</span>
        </span>`).join('')}
    </div>
    <div class="__ai-fp-hint">Say <b>"autofill"</b> to fill all step-by-step, or <b>"fill [field] [value]"</b></div>
  `;

    panel.querySelectorAll('.__ai-fp-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const f = fieldMap[parseInt(chip.dataset.idx, 10)];
            if (f) f.el.focus();
        });
    });

    form.insertBefore(panel, form.firstChild);
}

function _typeIcon(type) {
    return ({
        email: '✉', tel: '📞', password: '🔒', number: '🔢',
        url: '🔗', date: '📅', textarea: '📝', select: '▾'
    })[type] || 'T';
}

// ── Badge + Styles ───────────────────────────────────────────────────────────

function _createBadge() {
    if (!document.getElementById('__ai-vf-styles')) {
        const style = document.createElement('style');
        style.id = '__ai-vf-styles';
        style.textContent = `
      .__ai-voice-fill-badge {
        position: absolute;
        top: -30px; right: 0;
        font-size: 11px;
        font-family: 'Inter', system-ui, sans-serif;
        font-weight: 600;
        padding: 3px 12px;
        border-radius: 6px;
        background: rgba(124,58,237,0.1);
        border: 1px solid rgba(124,58,237,0.3);
        color: #a78bfa;
        pointer-events: none;
        z-index: 999;
        white-space: nowrap;
        transition: background 0.2s;
      }
      .__ai-field-panel {
        background: rgba(124,58,237,0.06);
        border: 1px solid rgba(124,58,237,0.22);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 16px;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .__ai-fp-title {
        font-size: 12px; font-weight: 700; color: #a78bfa; margin-bottom: 10px;
      }
      .__ai-fp-chips {
        display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;
      }
      .__ai-fp-chip {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px;
        background: rgba(124,58,237,0.12);
        border: 1px solid rgba(124,58,237,0.25);
        border-radius: 99px;
        font-size: 12px; font-weight: 600; color: #c4b5fd;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
        user-select: none;
      }
      .__ai-fp-chip:hover { background: rgba(124,58,237,0.25); transform: translateY(-1px); }
      .__ai-fp-num {
        width: 16px; height: 16px;
        background: rgba(124,58,237,0.4);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 800; color: #fff;
      }
      .__ai-fp-type { font-size: 10px; opacity: 0.65; }
      .__ai-fp-hint { font-size: 11px; color: #6b7280; }
      .__ai-fp-hint b { color: #a78bfa; font-weight: 700; }
    `;
        document.head.appendChild(style);
    }
    const b = document.createElement('div');
    b.className = '__ai-voice-fill-badge';
    return b;
}

/**
 * AI Automation SDK — Module: ai-smart-scroll
 * Add class="ai-smart-scroll" to <body> or any scrollable container.
 *
 * Voice commands:
 *   "scroll down" / "scroll up"                   → scroll 40% of viewport
 *   "scroll to top" / "go to top"                 → scroll to page top
 *   "scroll to bottom" / "go to bottom"           → scroll to page bottom
 *   "next section" / "previous section"           → jump between headings/sections
 *   "scroll a lot" / "scroll fast"                → scroll 80% of viewport
 *   "page down" / "page up"                       → scroll full viewport height
 */


register('ai-smart-scroll', (container) => {
    const isBody = container === document.body || container.tagName === 'BODY';

    function scrollBy(px) {
        if (isBody) {
            window.scrollBy({ top: px, behavior: 'smooth' });
        } else {
            container.scrollBy({ top: px, behavior: 'smooth' });
        }
    }

    function scrollTo(pos) {
        if (isBody) {
            window.scrollTo({ top: pos, behavior: 'smooth' });
        } else {
            container.scrollTo({ top: pos, behavior: 'smooth' });
        }
    }

    function getScrollTop() {
        return isBody ? window.scrollY : container.scrollTop;
    }

    function getScrollHeight() {
        return isBody ? document.documentElement.scrollHeight : container.scrollHeight;
    }

    function viewportHeight() {
        return isBody ? window.innerHeight : container.clientHeight;
    }

    // Gather section anchors (headings, sections, articles, divs with id)
    function getSections() {
        return [...document.querySelectorAll('h1, h2, h3, section[id], article[id], [data-section]')]
            .filter((el) => el.getBoundingClientRect().height > 0);
    }

    function currentSectionIndex(sections) {
        const scrollY = getScrollTop() + viewportHeight() * 0.2;
        let idx = 0;
        sections.forEach((s, i) => {
            const top = s.getBoundingClientRect().top + (isBody ? window.scrollY : container.scrollTop);
            if (top <= scrollY) idx = i;
        });
        return idx;
    }

    document.addEventListener('ai:voice', (e) => {
        const t = e.detail.transcript;
        const vh = viewportHeight();

        // Scroll to top
        if (t.match(/scroll to top|go to top|back to top|jump to top/)) {
            scrollTo(0);
            _showScrollToast('⬆ Top');
            return;
        }

        // Scroll to bottom
        if (t.match(/scroll to bottom|go to bottom|jump to bottom|end of page/)) {
            scrollTo(getScrollHeight());
            _showScrollToast('⬇ Bottom');
            return;
        }

        // Page down / page up
        if (t.match(/page down|scroll page down/)) {
            scrollBy(vh);
            _showScrollToast('⬇ Page');
            return;
        }
        if (t.match(/page up|scroll page up/)) {
            scrollBy(-vh);
            _showScrollToast('⬆ Page');
            return;
        }

        // Next / previous section
        if (t.match(/next section|scroll to next|go to next section/)) {
            const sections = getSections();
            if (!sections.length) return;
            const idx = Math.min(currentSectionIndex(sections) + 1, sections.length - 1);
            sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            _showScrollToast(`➡ ${sections[idx].textContent.trim().slice(0, 30)}`);
            return;
        }
        if (t.match(/previous section|last section|go back section|prior section/)) {
            const sections = getSections();
            if (!sections.length) return;
            const idx = Math.max(currentSectionIndex(sections) - 1, 0);
            sections[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
            _showScrollToast(`⬅ ${sections[idx].textContent.trim().slice(0, 30)}`);
            return;
        }

        // Scroll up / down variants
        const bigScroll = t.match(/a lot|fast|quickly|big|far|much/);
        const amount = bigScroll ? vh * 0.8 : vh * 0.4;

        if (t.match(/scroll down|move down|go down|down/)) {
            scrollBy(amount);
            _showScrollToast('⬇');
            return;
        }
        if (t.match(/scroll up|move up|go up|up/)) {
            scrollBy(-amount);
            _showScrollToast('⬆');
            return;
        }
    });
});

function _showScrollToast(msg) {
    let toast = document.getElementById('__ai-scroll-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = '__ai-scroll-toast';
        const style = document.createElement('style');
        style.textContent = `
      #__ai-scroll-toast {
        position: fixed;
        bottom: 100px;
        right: 28px;
        z-index: 2147483646;
        background: rgba(10, 10, 15, 0.88);
        color: #e2e8f0;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 10px;
        border: 1px solid rgba(6, 182, 212, 0.3);
        backdrop-filter: blur(12px);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
      }
      #__ai-scroll-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 1400);
}

/**
 * AI Automation SDK — Module: ai-search
 * Add class="ai-search" to any <input type="search"> or <input> inside a search form.
 *
 * Voice commands:
 *   "search for [query]"         → fills input & submits
 *   "search [query]"             → same
 *   "find [query]"               → same
 *   "look up [query]"            → same
 *   "clear search"               → clears the input
 */


register('ai-search', (input) => {
    const form = input.closest('form');

    // Visual cue on the input
    input.setAttribute('placeholder', input.placeholder || 'Try: "search for JavaScript tutorials"');
    _injectSearchStyle();

    document.addEventListener('ai:voice', (e) => {
        const t = e.detail.transcript;

        // Clear
        if (t.match(/clear search|empty search|reset search/)) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            return;
        }

        // Search / find / look up
        const match = t.match(/^(?:search for|search|find|look up|lookup)\s+(.+)$/);
        if (!match) return;

        const query = e.detail.raw.replace(/^(?:search for|search|find|look up|lookup)\s+/i, '').trim();
        if (!query) return;

        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Animate
        input.classList.add('__ai-search-active');
        setTimeout(() => input.classList.remove('__ai-search-active'), 1000);

        // Submit
        if (form) {
            setTimeout(() => {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }, 400);
        } else {
            // No form — dispatch enter keydown so JS search bars respond
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
    });
});

function _injectSearchStyle() {
    if (document.getElementById('__ai-search-style')) return;
    const style = document.createElement('style');
    style.id = '__ai-search-style';
    style.textContent = `
    .ai-search {
      transition: box-shadow 0.25s, outline 0.25s;
    }
    .ai-search.__ai-search-active {
      outline: 2px solid #06b6d4 !important;
      box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.18) !important;
    }
  `;
    document.head.appendChild(style);
}

/**
 * AI Automation SDK — Module: ai-navigate
 * Add class="ai-navigate" to <body> or any element to enable voice navigation.
 *
 * Voice commands:
 *   "go back" / "go to previous page"             → history.back()
 *   "go forward" / "next page"                    → history.forward()
 *   "refresh" / "reload" / "refresh page"         → location.reload()
 *   "go home" / "go to home"                      → location.href = '/'
 *   "go to [url]" / "open [url]" / "navigate to"  → location.href = url
 *   "open new tab [url]"                          → window.open(url)
 *   "scroll to [#id]"                             → jump to element with id
 */


register('ai-navigate', (_el) => {
    document.addEventListener('ai:voice', (e) => {
        const t = e.detail.transcript;
        const raw = e.detail.raw;

        // Go back
        if (t.match(/go back|previous page|go to previous|navigate back/)) {
            _toast('⬅ Going back…');
            setTimeout(() => {
                if (history.length > 1) history.back();
                else _toast('⚠ No previous page');
            }, 500);
            return;
        }

        // Go forward
        if (t.match(/go forward|next page|navigate forward/)) {
            _toast('➡ Going forward…');
            setTimeout(() => history.forward(), 500);
            return;
        }

        // Reload
        if (t.match(/^(refresh|reload|refresh page|reload page)$/)) {
            _toast('🔄 Reloading…');
            setTimeout(() => location.reload(), 600);
            return;
        }

        // Go home
        if (t.match(/^(go home|go to home|home page|homepage)$/)) {
            _toast('🏠 Going home…');
            setTimeout(() => (location.href = '/'), 500);
            return;
        }

        // Scroll to anchor / element by id
        const anchorMatch = t.match(/^scroll to #?(\S+)$/);
        if (anchorMatch) {
            const id = anchorMatch[1];
            const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                _toast(`🔗 → #${id}`);
            } else {
                _toast(`⚠ No element #${id}`);
            }
            return;
        }

        // Open new tab
        const newTabMatch = raw.match(/^open new tab (.+)$/i);
        if (newTabMatch) {
            const url = _normalizeUrl(newTabMatch[1]);
            _toast(`↗ Opening ${url}`);
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Go to / open / navigate to [url]
        const navMatch = raw.match(/^(?:go to|open|navigate to|visit)\s+(.+)$/i);
        if (navMatch) {
            const url = _normalizeUrl(navMatch[1]);
            _toast(`🌐 Navigating to ${url}…`);
            setTimeout(() => (location.href = url), 600);
            return;
        }
    });
});

function _normalizeUrl(raw) {
    raw = raw.trim();
    // Already has protocol
    if (/^https?:\/\//i.test(raw)) return raw;
    // Sounds like a domain (contains a dot or ends in .com etc.)
    if (/\w+\.\w+/.test(raw)) return `https://${raw}`;
    // Otherwise treat as a Google search URL
    return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}

function _toast(msg) {
    let el = document.getElementById('__ai-nav-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = '__ai-nav-toast';
        const style = document.createElement('style');
        style.textContent = `
      #__ai-nav-toast {
        position: fixed;
        top: 24px;
        right: 28px;
        z-index: 2147483646;
        background: rgba(10,10,15,0.9);
        color: #e2e8f0;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        padding: 10px 18px;
        border-radius: 12px;
        border: 1px solid rgba(124, 58, 237, 0.3);
        backdrop-filter: blur(12px);
        opacity: 0;
        transform: translateY(-8px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
      }
      #__ai-nav-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/**
 * AI Automation SDK — Entry Point
 * Imports all modules and initialises the SDK on DOM ready.
 */


function bootstrap() {
    init();
    voiceEngine.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

export { init, voiceEngine };
//# sourceMappingURL=ai-automation-sdk.esm.js.map
