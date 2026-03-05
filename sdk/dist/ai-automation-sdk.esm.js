// src/voice-engine.js
var SUPPORTED = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
var VoiceEngine = class {
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
      console.warn("[AI SDK] Speech Recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (this.listening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;
    this.recognition.onstart = () => {
      this.listening = true;
      this._setIndicatorState("listening");
      console.log("[AI SDK] Voice engine started \u2014 listening\u2026");
    };
    this.recognition.onend = () => {
      this.listening = false;
      if (!this._stopped) {
        this._restartTimer = setTimeout(() => this.start(), 300);
      } else {
        this._setIndicatorState("idle");
      }
    };
    this.recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        console.error("[AI SDK] Microphone access denied. Please grant microphone permission.");
        this._setIndicatorState("error");
        this._stopped = true;
        return;
      }
      if (event.error === "no-speech") return;
      console.warn("[AI SDK] Voice error:", event.error);
    };
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (!result.isFinal) return;
      const transcript = result[0].transcript.trim().toLowerCase();
      const confidence = result[0].confidence;
      this._setIndicatorState("processing");
      setTimeout(() => this._setIndicatorState("listening"), 800);
      console.log(`[AI SDK] Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(0)}%)`);
      document.dispatchEvent(new CustomEvent("ai:voice", {
        detail: { transcript, confidence, raw: result[0].transcript.trim() },
        bubbles: true
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
    this._setIndicatorState("idle");
    console.log("[AI SDK] Voice engine stopped.");
  }
  toggle() {
    this.listening ? this.stop() : this.start();
  }
  // ─── Floating UI indicator ────────────────────────────────────────────────
  _setupUI() {
    if (typeof document === "undefined") return;
    const container = document.createElement("div");
    container.id = "ai-sdk-mic-indicator";
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
    const style = document.createElement("style");
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
    document.addEventListener("DOMContentLoaded", () => {
      document.head.appendChild(style);
      document.body.appendChild(container);
      document.getElementById("ai-sdk-mic-btn").addEventListener("click", () => this.toggle());
      document.addEventListener("ai:voice", (e) => {
        const el = document.getElementById("ai-sdk-transcript");
        if (!el) return;
        el.textContent = `"${e.detail.raw}"`;
        el.classList.add("visible");
        clearTimeout(this._transcriptTimer);
        this._transcriptTimer = setTimeout(() => el.classList.remove("visible"), 2800);
      });
    });
  }
  _setIndicatorState(state) {
    const el = document.getElementById("ai-sdk-mic-indicator");
    if (!el) return;
    el.className = state;
    const label = document.getElementById("ai-sdk-mic-label");
    if (!label) return;
    const labels = { idle: "AI Voice", listening: "Listening\u2026", processing: "Processing\u2026", error: "No Access" };
    label.textContent = labels[state] || "AI Voice";
  }
};
var voiceEngine = new VoiceEngine();
var voice_engine_default = voiceEngine;

// src/core.js
var _registry = /* @__PURE__ */ new Map();
function register(className, activateFn) {
  _registry.set(className, activateFn);
}
function init() {
  _scanAndActivate(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        _scanAndActivate(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`[AI SDK] Initialized. Active modules: ${[..._registry.keys()].join(", ")}`);
}
function _scanAndActivate(root) {
  for (const [className, activate] of _registry) {
    if (root.classList && root.classList.contains(className)) {
      _activate(root, className, activate);
    }
    root.querySelectorAll && root.querySelectorAll(`.${className}`).forEach((el) => {
      _activate(el, className, activate);
    });
  }
}
function _activate(el, className, activate) {
  const flag = `__ai_${className}_activated`;
  if (el[flag]) return;
  el[flag] = true;
  activate(el);
}

// src/modules/voice-fill.js
var HIGHLIGHT_COLOR = "rgba(124, 58, 237, 0.18)";
register("ai-voice-fill", (form) => {
  let activeField = null;
  let awaitingValue = false;
  let sessionFields = [];
  let sessionIdx = -1;
  let inSession = false;
  const badge = _createBadge();
  form.style.position = "relative";
  form.appendChild(badge);
  function scrapeFields() {
    const rawEls = [
      ...form.querySelectorAll(
        "input:not([type=submit]):not([type=button]):not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea, select"
      )
    ];
    return rawEls.map((el) => {
      const labelEl = el.id && form.querySelector(`label[for="${el.id}"]`) || el.closest("label") || null;
      const label = (labelEl && labelEl.textContent.trim() || el.getAttribute("aria-label") || el.getAttribute("data-label") || el.placeholder || el.name || el.id || "(unlabelled)").trim();
      const aliases = [
        el.name,
        el.placeholder,
        el.id,
        el.getAttribute("aria-label"),
        el.getAttribute("data-label"),
        labelEl ? labelEl.textContent.trim() : null
      ].filter(Boolean).map((s) => s.toLowerCase().trim());
      return {
        el,
        label,
        aliases,
        type: el.type || el.tagName.toLowerCase()
      };
    });
  }
  let fieldMap = scrapeFields();
  console.log(
    `[AI SDK] voice-fill: detected ${fieldMap.length} field(s) \u2192`,
    fieldMap.map((f) => `"${f.label}" (${f.type})`).join(", ")
  );
  _showFieldPanel(form, fieldMap);
  badge.textContent = `\u{1F399} ${fieldMap.length} field${fieldMap.length !== 1 ? "s" : ""} detected`;
  const formObserver = new MutationObserver(() => {
    fieldMap = scrapeFields();
    _showFieldPanel(form, fieldMap);
    badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`;
  });
  formObserver.observe(form, { childList: true, subtree: true });
  function findField(query) {
    query = query.toLowerCase().trim();
    let m = fieldMap.find((f) => f.aliases.some((a) => a === query));
    if (m) return m;
    m = fieldMap.find((f) => f.aliases.some((a) => a.startsWith(query) || query.startsWith(a)));
    if (m) return m;
    m = fieldMap.find((f) => f.aliases.some((a) => a.includes(query) || query.includes(a)));
    return m || null;
  }
  function fillField(fieldMeta, value) {
    const el = fieldMeta.el;
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    _highlightField(form, el);
  }
  function startSession() {
    fieldMap = scrapeFields();
    sessionFields = fieldMap.filter((f) => !f.el.value.trim());
    if (sessionFields.length === 0) sessionFields = [...fieldMap];
    sessionIdx = 0;
    inSession = true;
    promptSessionField();
  }
  function promptSessionField() {
    if (sessionIdx >= sessionFields.length) {
      endSession();
      return;
    }
    const f = sessionFields[sessionIdx];
    f.el.focus();
    _highlightField(form, f.el, true);
    badge.textContent = `\u{1F3AF} [${sessionIdx + 1}/${sessionFields.length}] "${f.label}" \u2014 say value or "skip"`;
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
    badge.textContent = `\u2705 Autofill done \u2014 say "submit" to submit`;
    setTimeout(() => badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`, 4e3);
  }
  document.addEventListener("ai:voice", (e) => {
    const t = e.detail.transcript;
    const raw = e.detail.raw;
    if (t.match(/stop filling|cancel fill|exit fill|stop session|cancel session|stop/)) {
      if (inSession && activeField) _clearHighlight(activeField.el);
      inSession = false;
      activeField = null;
      awaitingValue = false;
      badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`;
      return;
    }
    if (t.match(/what fields|show fields|list fields|what are the fields|detect fields|which fields/)) {
      const names = fieldMap.map((f, i) => `${i + 1}. "${f.label}"`).join(", ");
      badge.textContent = `\u{1F4CB} ${names}`;
      console.log("[AI SDK] Detected fields:", names);
      setTimeout(() => badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`, 5e3);
      return;
    }
    if (t.match(/^(autofill|auto fill|fill form|fill all|fill all fields|fill the form|start filling|start autofill)$/)) {
      startSession();
      return;
    }
    if (t.match(/clear form|clear all|reset form/)) {
      fieldMap.forEach((f) => {
        f.el.value = "";
        f.el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      badge.textContent = "\u{1F9F9} Form cleared";
      setTimeout(() => badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`, 2e3);
      return;
    }
    if (t.match(/^submit( form)?$/)) {
      badge.textContent = "\u{1F4E4} Submitting\u2026";
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return;
    }
    if (inSession && t.match(/^(skip|next field|skip this|pass|next)$/)) {
      badge.textContent = `\u23ED Skipped "${activeField ? activeField.label : ""}"`;
      setTimeout(() => advanceSession(), 300);
      return;
    }
    if (awaitingValue && activeField) {
      fillField(activeField, raw);
      badge.textContent = `\u2705 "${activeField.label}" \u2192 "${raw}"`;
      if (inSession) {
        const filled = activeField;
        awaitingValue = false;
        activeField = null;
        setTimeout(() => {
          _clearHighlight(filled.el);
          sessionIdx++;
          promptSessionField();
        }, 900);
      } else {
        awaitingValue = false;
        activeField = null;
        setTimeout(() => badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`, 2500);
      }
      return;
    }
    const fillMatch = t.match(/^(?:fill|set|enter|type)\s+(.+)$/);
    if (fillMatch) {
      const rest = fillMatch[1].trim();
      let matched = null;
      let value = null;
      const sorted = [...fieldMap].sort(
        (a, b) => Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length))
      );
      for (const fm of sorted) {
        for (const alias of fm.aliases.sort((a, b) => b.length - a.length)) {
          if (rest.startsWith(alias + " ") || rest === alias) {
            matched = fm;
            value = rest.startsWith(alias + " ") ? rest.slice(alias.length).trim() : null;
            break;
          }
          if (rest.includes(" " + alias + " ")) {
            const idx = rest.indexOf(" " + alias + " ");
            matched = fm;
            value = (rest.slice(0, idx) + rest.slice(idx + alias.length + 1)).trim();
            break;
          }
        }
        if (matched) break;
      }
      if (!matched) {
        for (const fm of sorted) {
          for (const alias of fm.aliases) {
            const words = alias.split(/\s+/);
            for (const word of words) {
              if (word.length >= 3 && (rest.startsWith(word + " ") || rest === word)) {
                matched = fm;
                value = rest.startsWith(word + " ") ? rest.slice(word.length).trim() : null;
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
        badge.textContent = `\u2705 "${matched.label}" \u2192 "${value}"`;
        setTimeout(() => badge.textContent = `\u{1F399} ${fieldMap.length} fields detected`, 2500);
      } else if (matched) {
        activeField = matched;
        awaitingValue = true;
        matched.el.focus();
        _highlightField(form, matched.el, true);
        badge.textContent = `\u{1F3AF} "${matched.label}" \u2014 say the value`;
      }
    }
  });
});
function _highlightField(form, el, persistent = false) {
  if (!el) return;
  const prev = form ? form.querySelector(".__ai-highlighted") : null;
  if (prev && prev !== el) _clearHighlight(prev);
  el.style.outline = "2px solid #7c3aed";
  el.style.background = HIGHLIGHT_COLOR;
  el.classList.add("__ai-highlighted");
  if (!persistent) {
    setTimeout(() => _clearHighlight(el), 1800);
  }
}
function _clearHighlight(el) {
  if (!el) return;
  el.style.outline = "";
  el.style.background = "";
  el.classList.remove("__ai-highlighted");
}
function _showFieldPanel(form, fieldMap) {
  const old = form.querySelector(".__ai-field-panel");
  if (old) old.remove();
  if (!fieldMap.length) return;
  const panel = document.createElement("div");
  panel.className = "__ai-field-panel";
  panel.innerHTML = `
    <div class="__ai-fp-title">\u{1F50D} ${fieldMap.length} field${fieldMap.length !== 1 ? "s" : ""} detected</div>
    <div class="__ai-fp-chips">
      ${fieldMap.map((f, i) => `
        <span class="__ai-fp-chip" data-idx="${i}" title='Say "fill ${f.label} [value]"'>
          <span class="__ai-fp-num">${i + 1}</span>
          ${f.label}
          <span class="__ai-fp-type">${_typeIcon(f.type)}</span>
        </span>`).join("")}
    </div>
    <div class="__ai-fp-hint">Say <b>"autofill"</b> to fill all step-by-step, or <b>"fill [field] [value]"</b></div>
  `;
  panel.querySelectorAll(".__ai-fp-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const f = fieldMap[parseInt(chip.dataset.idx, 10)];
      if (f) f.el.focus();
    });
  });
  form.insertBefore(panel, form.firstChild);
}
function _typeIcon(type) {
  return {
    email: "\u2709",
    tel: "\u{1F4DE}",
    password: "\u{1F512}",
    number: "\u{1F522}",
    url: "\u{1F517}",
    date: "\u{1F4C5}",
    textarea: "\u{1F4DD}",
    select: "\u25BE"
  }[type] || "T";
}
function _createBadge() {
  if (!document.getElementById("__ai-vf-styles")) {
    const style = document.createElement("style");
    style.id = "__ai-vf-styles";
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
  const b = document.createElement("div");
  b.className = "__ai-voice-fill-badge";
  return b;
}

// src/modules/smart-scroll.js
register("ai-smart-scroll", (container) => {
  const isBody = container === document.body || container.tagName === "BODY";
  const scroller = isBody ? window : container;
  function scrollBy(px) {
    if (isBody) {
      window.scrollBy({ top: px, behavior: "smooth" });
    } else {
      container.scrollBy({ top: px, behavior: "smooth" });
    }
  }
  function scrollTo(pos) {
    if (isBody) {
      window.scrollTo({ top: pos, behavior: "smooth" });
    } else {
      container.scrollTo({ top: pos, behavior: "smooth" });
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
  function getSections() {
    return [...document.querySelectorAll("h1, h2, h3, section[id], article[id], [data-section]")].filter((el) => el.getBoundingClientRect().height > 0);
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
  document.addEventListener("ai:voice", (e) => {
    const t = e.detail.transcript;
    const vh = viewportHeight();
    if (t.match(/scroll to top|go to top|back to top|jump to top/)) {
      scrollTo(0);
      _showScrollToast("\u2B06 Top");
      return;
    }
    if (t.match(/scroll to bottom|go to bottom|jump to bottom|end of page/)) {
      scrollTo(getScrollHeight());
      _showScrollToast("\u2B07 Bottom");
      return;
    }
    if (t.match(/page down|scroll page down/)) {
      scrollBy(vh);
      _showScrollToast("\u2B07 Page");
      return;
    }
    if (t.match(/page up|scroll page up/)) {
      scrollBy(-vh);
      _showScrollToast("\u2B06 Page");
      return;
    }
    if (t.match(/next section|scroll to next|go to next section/)) {
      const sections = getSections();
      if (!sections.length) return;
      const idx = Math.min(currentSectionIndex(sections) + 1, sections.length - 1);
      sections[idx].scrollIntoView({ behavior: "smooth", block: "start" });
      _showScrollToast(`\u27A1 ${sections[idx].textContent.trim().slice(0, 30)}`);
      return;
    }
    if (t.match(/previous section|last section|go back section|prior section/)) {
      const sections = getSections();
      if (!sections.length) return;
      const idx = Math.max(currentSectionIndex(sections) - 1, 0);
      sections[idx].scrollIntoView({ behavior: "smooth", block: "start" });
      _showScrollToast(`\u2B05 ${sections[idx].textContent.trim().slice(0, 30)}`);
      return;
    }
    const bigScroll = t.match(/a lot|fast|quickly|big|far|much/);
    const amount = bigScroll ? vh * 0.8 : vh * 0.4;
    if (t.match(/scroll down|move down|go down|down/)) {
      scrollBy(amount);
      _showScrollToast("\u2B07");
      return;
    }
    if (t.match(/scroll up|move up|go up|up/)) {
      scrollBy(-amount);
      _showScrollToast("\u2B06");
      return;
    }
  });
});
function _showScrollToast(msg) {
  let toast = document.getElementById("__ai-scroll-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "__ai-scroll-toast";
    const style = document.createElement("style");
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
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 1400);
}

// src/modules/search.js
register("ai-search", (input) => {
  const form = input.closest("form");
  input.setAttribute("placeholder", input.placeholder || 'Try: "search for JavaScript tutorials"');
  _injectSearchStyle();
  document.addEventListener("ai:voice", (e) => {
    const t = e.detail.transcript;
    if (t.match(/clear search|empty search|reset search/)) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      return;
    }
    const match = t.match(/^(?:search for|search|find|look up|lookup)\s+(.+)$/);
    if (!match) return;
    const query = e.detail.raw.replace(/^(?:search for|search|find|look up|lookup)\s+/i, "").trim();
    if (!query) return;
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.classList.add("__ai-search-active");
    setTimeout(() => input.classList.remove("__ai-search-active"), 1e3);
    if (form) {
      setTimeout(() => {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }, 400);
    } else {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    }
  });
});
function _injectSearchStyle() {
  if (document.getElementById("__ai-search-style")) return;
  const style = document.createElement("style");
  style.id = "__ai-search-style";
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

// src/modules/navigate.js
register("ai-navigate", (_el) => {
  document.addEventListener("ai:voice", (e) => {
    const t = e.detail.transcript;
    const raw = e.detail.raw;
    if (t.match(/go back|previous page|go to previous|navigate back/)) {
      _toast("\u2B05 Going back\u2026");
      setTimeout(() => {
        if (history.length > 1) history.back();
        else _toast("\u26A0 No previous page");
      }, 500);
      return;
    }
    if (t.match(/go forward|next page|navigate forward/)) {
      _toast("\u27A1 Going forward\u2026");
      setTimeout(() => history.forward(), 500);
      return;
    }
    if (t.match(/^(refresh|reload|refresh page|reload page)$/)) {
      _toast("\u{1F504} Reloading\u2026");
      setTimeout(() => location.reload(), 600);
      return;
    }
    if (t.match(/^(go home|go to home|home page|homepage)$/)) {
      _toast("\u{1F3E0} Going home\u2026");
      setTimeout(() => location.href = "/", 500);
      return;
    }
    const anchorMatch = t.match(/^scroll to #?(\S+)$/);
    if (anchorMatch) {
      const id = anchorMatch[1];
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        _toast(`\u{1F517} \u2192 #${id}`);
      } else {
        _toast(`\u26A0 No element #${id}`);
      }
      return;
    }
    const newTabMatch = raw.match(/^open new tab (.+)$/i);
    if (newTabMatch) {
      const url = _normalizeUrl(newTabMatch[1]);
      _toast(`\u2197 Opening ${url}`);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const navMatch = raw.match(/^(?:go to|open|navigate to|visit)\s+(.+)$/i);
    if (navMatch) {
      const url = _normalizeUrl(navMatch[1]);
      _toast(`\u{1F310} Navigating to ${url}\u2026`);
      setTimeout(() => location.href = url, 600);
      return;
    }
  });
});
function _normalizeUrl(raw) {
  raw = raw.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/\w+\.\w+/.test(raw)) return `https://${raw}`;
  return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
}
function _toast(msg) {
  let el = document.getElementById("__ai-nav-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__ai-nav-toast";
    const style = document.createElement("style");
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
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

// src/index.js
function bootstrap() {
  init();
  voice_engine_default.start();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
export {
  init,
  voice_engine_default as voiceEngine
};
