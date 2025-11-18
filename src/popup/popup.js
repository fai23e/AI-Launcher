// src/popup/popup.js
import { getStorage } from '../utils/storage.js';

const presetList = document.getElementById('popup-preset-list');
const searchInput = document.getElementById('popup-search');
const openOptionsLink = document.getElementById('open-options-page');

let allPresets = [];
let activeTab = null;

async function initialize() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tabs[0];

    allPresets = await getStorage('customInstructionPresets') || [];
    renderPresets();
}

function getSiteNameFromUrl(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('chat.openai.com')) return 'chatgpt';
        if (urlObj.hostname.includes('claude.ai')) return 'claude';
        if (urlObj.hostname.includes('x.com') && urlObj.pathname.startsWith('/i/grok')) return 'grok';
    } catch (e) { return null; }
    return null;
}

function renderPresets(filter = '') {
    presetList.innerHTML = '';
    const currentSite = getSiteNameFromUrl(activeTab?.url);
    const filteredPresets = allPresets.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())))
    );

    if (filteredPresets.length === 0) {
        presetList.innerHTML = '<li class="popup-preset-item disabled">該当なし</li>';
        return;
    }

    filteredPresets.forEach(preset => {
        const li = document.createElement('li');
        li.className = 'popup-preset-item';
        li.textContent = preset.name;
        li.dataset.presetId = preset.id;

        const isSiteSpecific = preset.siteCustomization && preset.siteCustomization[currentSite];
        const isGeneric = preset.prompt && !isSiteSpecific;

        if (!currentSite || !(isSiteSpecific || isGeneric)) {
            li.classList.add('disabled');
            li.title = '現在のサイトでは適用できません';
        }
        presetList.appendChild(li);
    });
}

searchInput.addEventListener('input', () => renderPresets(searchInput.value));

openOptionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

presetList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('popup-preset-item') && !target.classList.contains('disabled')) {
        const presetId = target.dataset.presetId;
        const siteName = getSiteNameFromUrl(activeTab?.url);

        if (presetId && siteName && activeTab.id) {
            chrome.runtime.sendMessage({
                action: 'applyPresetFromPopup',
                payload: {
                    presetId,
                    siteName,
                    tabId: activeTab.id
                }
            });
            window.close();
        }
    }
});

initialize();
