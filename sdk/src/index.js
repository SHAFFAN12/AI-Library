/**
 * AI Automation SDK — Entry Point
 * Imports all modules and initialises the SDK on DOM ready.
 */

import voiceEngine from './voice-engine.js';
import { init } from './core.js';

// Register all modules (side-effect imports)
import './modules/voice-fill.js';
import './modules/smart-scroll.js';
import './modules/search.js';
import './modules/navigate.js';

function bootstrap() {
    init();
    voiceEngine.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

// Expose public API for manual control
export { voiceEngine, init };
