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

import { register } from '../core.js';

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
    const badge = _createBadge();
    form.style.position = 'relative';
    form.appendChild(badge);

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
    const formObserver = new MutationObserver(() => {
        fieldMap = scrapeFields();
        _showFieldPanel(form, fieldMap);
        badge.textContent = `🎙 ${fieldMap.length} fields detected`;
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
        el.focus();
        el.value = value;
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

        // Cancel / stop
        if (t.match(/stop filling|cancel fill|exit fill|stop session|cancel session|stop/)) {
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

        // "fill [field] [value]" or "fill [field]" — targeted fill
        const fillMatch = t.match(/^(?:fill|set|enter|type)\s+(.+)$/);
        if (fillMatch) {
            const rest = fillMatch[1].trim();
            let matched = null;
            let value = null;

            // Longest-alias-first search
            const sorted = [...fieldMap].sort((a, b) =>
                Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length))
            );
            for (const fm of sorted) {
                for (const alias of fm.aliases.sort((a, b) => b.length - a.length)) {
                    if (rest.startsWith(alias)) {
                        matched = fm;
                        value = rest.slice(alias.length).trim();
                        break;
                    }
                    if (rest.includes(alias)) {
                        const idx = rest.indexOf(alias);
                        matched = fm;
                        value = (rest.slice(0, idx) + rest.slice(idx + alias.length)).trim();
                        break;
                    }
                }
                if (matched) break;
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
