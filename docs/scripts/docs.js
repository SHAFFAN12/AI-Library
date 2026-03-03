/**
 * AI Automation SDK — Documentation Script
 * Copy buttons, typing effect, animated counters, sidebar active highlight, demo helpers
 */

/* ─── Copy Buttons ─────────────────────────────────────────── */
document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-copy-target');
        const codeEl = document.getElementById(targetId);
        if (!codeEl) return;

        const text = codeEl.innerText;
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✅ Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Copy';
                btn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            // Fallback for file:// protocol
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            btn.textContent = '✅ Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
        });
    });
});

/* ─── Typing Effect (Hero) ─────────────────────────────────── */
const typedEl = document.getElementById('typed-demo');
const phrases = [
    'class="ai-voice-fill"',
    'class="ai-smart-scroll"',
    'class="ai-search"',
    'class="ai-navigate"',
];
let phraseIdx = 0;
let charIdx = 0;
let deleting = false;
let pauseTimer = null;

function typeLoop() {
    if (!typedEl) return;
    const phrase = phrases[phraseIdx];

    if (!deleting) {
        typedEl.textContent = phrase.slice(0, ++charIdx);
        if (charIdx === phrase.length) {
            deleting = true;
            pauseTimer = setTimeout(typeLoop, 2200);
            return;
        }
    } else {
        typedEl.textContent = phrase.slice(0, --charIdx);
        if (charIdx === 0) {
            deleting = false;
            phraseIdx = (phraseIdx + 1) % phrases.length;
        }
    }
    setTimeout(typeLoop, deleting ? 40 : 75);
}
typeLoop();

/* ─── Animated Counters (Hero stats) ──────────────────────── */
function animateCounter(el, target, suffix = '') {
    if (!el) return;
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current + suffix;
        if (current >= target) clearInterval(timer);
    }, 30);
}

// Trigger when hero is visible
const heroObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            animateCounter(document.getElementById('counter-kb'), 12, ' KB');
            animateCounter(document.getElementById('counter-modules'), 4);
            animateCounter(document.getElementById('counter-cmds'), 20, '+');
            heroObs.disconnect();
        }
    });
}, { threshold: 0.2 });
const hero = document.getElementById('hero');
if (hero) heroObs.observe(hero);

/* ─── Section Reveal on Scroll ────────────────────────────── */
const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.docs-section').forEach((s) => sectionObs.observe(s));

/* ─── Sidebar Active Link Highlight ───────────────────────── */
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const sectionIds = [...sidebarLinks]
    .map((l) => l.getAttribute('href'))
    .filter((h) => h && h.startsWith('#'))
    .map((h) => h.slice(1));

function updateActiveLink() {
    let activeId = sectionIds[0];
    sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.getBoundingClientRect().top <= 100) activeId = id;
    });
    sidebarLinks.forEach((l) => {
        const href = l.getAttribute('href');
        l.classList.toggle('active', href === `#${activeId}`);
    });
}
window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();

/* ─── Mobile Sidebar Toggle ───────────────────────────────── */
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        menuToggle.textContent = sidebar.classList.contains('open') ? '✕ Close' : '☰ Menu';
    });
    // Close sidebar on link click (mobile)
    sidebar.querySelectorAll('.sidebar-link').forEach((l) => {
        l.addEventListener('click', () => {
            sidebar.classList.remove('open');
            menuToggle.textContent = '☰ Menu';
        });
    });
}

/* ─── Demo: Form Submit Handler ─────────────────────────────── */
window.demoSubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const parts = [];
    data.forEach((v, k) => { if (v) parts.push(`${k}: ${v}`); });
    const msg = parts.length
        ? `✅ Form submitted!\n${parts.join(' | ')}`
        : '⚠️ Form is empty — try filling it with voice commands first!';
    showDemoAlert(msg);
    return false;
};

/* ─── Demo: Search Submit Handler ────────────────────────────── */
window.searchDemoSubmit = function (e) {
    e.preventDefault();
    const input = document.getElementById('search-demo-input');
    const result = document.getElementById('search-result');
    if (!input || !result) return false;

    if (!input.value.trim()) {
        result.style.display = '';
        result.textContent = '⚠️ Search empty — try saying "search for JavaScript tutorials".';
        result.style.color = 'var(--text-3)';
        return false;
    }

    result.style.display = '';
    result.style.color = 'var(--accent-3)';
    result.innerHTML = `✅ Searching for <strong style="color:var(--text-1)">"${input.value}"</strong> — In a real site, this would submit the form!`;
    return false;
};

/* ─── Demo: Navigation Button Simulation ──────────────────── */
window.simulateNav = function (cmd) {
    // Fire a fake ai:voice event so the navigate module actually handles it
    document.dispatchEvent(new CustomEvent('ai:voice', {
        detail: { transcript: cmd.toLowerCase(), confidence: 1, raw: cmd },
        bubbles: true,
    }));
};

/* ─── Utility: Demo Alert Toast ───────────────────────────── */
function showDemoAlert(msg) {
    let el = document.getElementById('__docs-alert');
    if (!el) {
        el = document.createElement('div');
        el.id = '__docs-alert';
        el.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      z-index:9999; background:rgba(10,10,15,0.95); color:#e2e8f0;
      font-family:'Inter',system-ui,sans-serif; font-size:13px; font-weight:500;
      padding:14px 24px; border-radius:14px; border:1px solid rgba(16,185,129,0.3);
      backdrop-filter:blur(16px); opacity:0; transition:opacity 0.25s,transform 0.25s;
      white-space:pre-wrap; max-width:90vw; text-align:center; line-height:1.6;
    `;
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(20px)';
    }, 4000);
}
