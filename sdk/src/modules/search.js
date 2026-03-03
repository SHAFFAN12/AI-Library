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

import { register } from '../core.js';

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
