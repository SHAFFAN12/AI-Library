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

import { register } from '../core.js';

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
