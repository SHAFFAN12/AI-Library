/**
 * AI Automation SDK — Core
 * Scans the DOM for ai-* classes and activates the corresponding modules.
 */

const _registry = new Map(); // className → module activate fn

export function register(className, activateFn) {
    _registry.set(className, activateFn);
}

export function init() {
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
