// src/content-scripts/picker-common.js
import { getStorage } from '../utils/storage.js';
import { extractVariables, substituteVariables } from '../utils/variable-parser.js';

export class CustomInstructionsPicker {
    constructor(siteAdapter, siteName) {
        this.siteAdapter = siteAdapter;
        this.siteName = siteName; // 'chatgpt', 'claude', etc.
        this.presets = [];
        this.pickerContainer = null;
        this.filteredPresets = [];
    }

    async init() {
        await this.loadPresets();
        const pickerIcon = this.createPickerIcon();
        this.siteAdapter.injectIcon(pickerIcon);
    }

    createPickerIcon() {
        const button = document.createElement('button');
        button.innerHTML = '✨';
        button.className = 'custom-instructions-picker-btn';
        button.title = 'カスタム指示ピッカー';
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
        });
        return button;
    }

    toggleDropdown() {
        if (this.pickerContainer && this.pickerContainer.parentNode) {
            this.closeDropdown();
        } else {
            const iconContainer = this.siteAdapter.getIconContainer();
            if (iconContainer) {
                this.pickerContainer = this.createDropdown();
                iconContainer.appendChild(this.pickerContainer);
                this.pickerContainer.style.display = 'flex';
                document.addEventListener('click', this.closeDropdownOnOutsideClick, true);
            }
        }
    }

    closeDropdown = () => {
        if (this.pickerContainer && this.pickerContainer.parentNode) {
            this.pickerContainer.remove();
            this.pickerContainer = null;
            document.removeEventListener('click', this.closeDropdownOnOutsideClick, true);
        }
    }

    closeDropdownOnOutsideClick = (event) => {
        if (this.pickerContainer && !this.pickerContainer.contains(event.target) && !this.siteAdapter.getIconContainer().contains(event.target)) {
            this.closeDropdown();
        }
    }


    createDropdown() {
        const container = document.createElement('div');
        container.className = 'picker-dropdown-container';
        container.innerHTML = `
            <div class="picker-search-bar">
                <input type="text" placeholder="🔍 検索...">
            </div>
            <ul class="picker-preset-list"></ul>
            <div class="picker-footer">
                <a href="#" class="picker-open-settings">設定を開く</a>
            </div>
        `;

        const searchInput = container.querySelector('input');
        searchInput.addEventListener('input', () => this.filterAndRenderPresets(searchInput.value));

        const settingsLink = container.querySelector('.picker-open-settings');
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: 'openOptionsPage' });
        });

        this.filterAndRenderPresets();
        return container;
    }

    filterAndRenderPresets(filter = '') {
        const listElement = this.pickerContainer.querySelector('.picker-preset-list');
        const lowerCaseFilter = filter.toLowerCase();

        this.filteredPresets = this.presets.filter(p =>
            p.name.toLowerCase().includes(lowerCaseFilter) ||
            (p.tags && p.tags.some(t => t.toLowerCase().includes(lowerCaseFilter)))
        );

        listElement.innerHTML = '';
        if(this.filteredPresets.length === 0){
            listElement.innerHTML = '<li style="padding:10px; text-align:center; color:#888;">見つかりません</li>';
            return;
        }

        this.filteredPresets.forEach(preset => {
            const item = document.createElement('li');
            item.className = 'picker-preset-item';
            item.innerHTML = `
                <div class="picker-preset-item-name">${preset.favorite ? '⭐' : ''} ${preset.name}</div>
                <div class="picker-preset-item-tags">${(preset.tags || []).join(', ')}</div>
            `;
            item.addEventListener('click', () => this.onPresetSelect(preset));
            listElement.appendChild(item);
        });
    }

    async onPresetSelect(preset) {
        this.closeDropdown();

        let prompt = (preset.siteCustomization && preset.siteCustomization[this.siteName]) || preset.prompt;
        const variables = extractVariables(prompt);

        if (variables.length > 0) {
            try {
                const values = await this.promptForVariables(variables);
                prompt = substituteVariables(prompt, values);
            } catch (error) {
                // ユーザーがキャンセルした場合
                console.log('変数入力をキャンセルしました。');
                return;
            }
        }

        this.siteAdapter.setCustomInstructions(prompt);
    }

    promptForVariables(variables) {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'variable-input-modal';

            let inputsHTML = '';
            variables.forEach(v => {
                inputsHTML += `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px;">${v}:</label>
                        <input type="text" id="var-input-${v}" style="width: 100%; padding: 8px; box-sizing: border-box;">
                    </div>`;
            });

            modal.innerHTML = `
                <div class="variable-input-dialog">
                    <h3>変数を入力してください</h3>
                    ${inputsHTML}
                    <div style="text-align: right; margin-top: 20px;">
                        <button id="var-cancel-btn" style="margin-right: 10px;">キャンセル</button>
                        <button id="var-apply-btn">適用</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const applyBtn = modal.querySelector('#var-apply-btn');
            const cancelBtn = modal.querySelector('#var-cancel-btn');

            applyBtn.onclick = () => {
                const values = {};
                variables.forEach(v => {
                    values[v] = modal.querySelector(`#var-input-${v}`).value;
                });
                document.body.removeChild(modal);
                resolve(values);
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                reject(new Error('User cancelled'));
            };
        });
    }

    async loadPresets() {
        this.presets = await getStorage('customInstructionPresets') || [];
        this.presets.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    }
}
