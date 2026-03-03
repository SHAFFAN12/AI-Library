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

import { register } from '../core.js';

register('ai-smart-scroll', (container) => {
    const isBody = container === document.body || container.tagName === 'BODY';
    const scroller = isBody ? window : container;

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
