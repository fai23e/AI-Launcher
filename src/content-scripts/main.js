// src/content-scripts/main.js
import { getStorage } from '../utils/storage.js';
import { SiteAdapter } from '../utils/site-adapter.js';
import { CustomInstructionsPicker } from './picker-common.js';

let pickerInstance = null;

function getSiteName(url) {
    const hostname = url.hostname;
    const pathname = url.pathname;

    if (hostname.includes('chat.openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('x.com') && pathname.startsWith('/i/grok')) return 'grok';
    return null;
}

function initializePicker() {
    const siteName = getSiteName(new URL(window.location.href));
    if (siteName) {
        const adapter = new SiteAdapter(siteName);
        pickerInstance = new CustomInstructionsPicker(adapter, siteName);
        pickerInstance.init();
        console.log(`[AI Customizer] ピッカーをページに挿入しました。`);
    }
}

function observeDOM() {
    const siteName = getSiteName(new URL(window.location.href));
    if (!siteName) {
        console.log('[AI Customizer] 対応サイトではありません。');
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        const adapter = new SiteAdapter(siteName);
        const anchor = adapter.getInjectionAnchor();

        if (anchor && !document.querySelector('.custom-instructions-picker-btn')) {
            initializePicker();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// バックグラウンドからのメッセージを受信
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'applyPreset' && request.payload) {
        const { presetId, siteName } = request.payload;
        console.log(`[AI Customizer] ポップアップからプリセット適用要求を受信: ${presetId}`);

        const allPresets = await getStorage('customInstructionPresets') || [];
        const presetToApply = allPresets.find(p => p.id === presetId);

        if (presetToApply && pickerInstance) {
            pickerInstance.onPresetSelect(presetToApply);
            sendResponse({ success: true });
        } else {
            console.error('適用するプリセットが見つからないか、ピッカーが初期化されていません。');
            sendResponse({ success: false });
        }
    }
    return true; // 非同期応答
});


// 初期化処理
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
} else {
    observeDOM();
}
