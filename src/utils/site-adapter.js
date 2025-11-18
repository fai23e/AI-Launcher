// src/utils/site-adapter.js
import { getSelectorsForSite } from './site-selectors.js';

/**
 * DOM要素が見つかるまで待機するヘルパー関数
 * @param {string} selector - CSSセレクタ
 * @param {object} [options] - 追加オプション
 * @param {string} [options.textContent] - 一致させたいテキストコンテンツ
 * @param {number} [options.timeout=5000] - タイムアウトまでのミリ秒
 * @returns {Promise<HTMLElement>} 見つかった要素
 */
const waitForElement = (selector, { textContent, timeout = 5000 } = {}) => {
    return new Promise((resolve, reject) => {
        const interval = 100;
        const endTime = Date.now() + timeout;

        const check = () => {
            const elements = document.querySelectorAll(selector);
            let targetEl = null;

            if (textContent) {
                targetEl = Array.from(elements).find(el => el.textContent.trim() === textContent);
            } else if (elements.length > 0) {
                targetEl = elements[0];
            }

            if (targetEl) {
                resolve(targetEl);
            } else if (Date.now() > endTime) {
                reject(new Error(`Element not found for selector: ${selector} with text: ${textContent}`));
            } else {
                setTimeout(check, interval);
            }
        };
        check();
    });
};


/**
 * 指定時間待機するヘルパー関数
 * @param {number} ms - 待機するミリ秒
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


export class SiteAdapter {
    constructor(siteName) {
        this.siteName = siteName;
        this.selectors = getSelectorsForSite(siteName);
        if (!this.selectors) throw new Error(`'${siteName}' に対応するセレクタが見つかりません。`);
        this.iconContainer = null;
    }

    getInjectionAnchor() {
        return document.querySelector(this.selectors.pickerInjectionAnchor);
    }

    injectIcon(icon) {
        const anchor = this.getInjectionAnchor();
        if (anchor) {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';

            const parent = anchor.parentNode;
            if (parent) {
                parent.insertBefore(wrapper, anchor);
                wrapper.appendChild(anchor);
            }

            icon.style.position = 'absolute';
            icon.style.right = '10px';
            icon.style.bottom = '10px';
            wrapper.appendChild(icon);

            this.iconContainer = wrapper;
        } else {
            console.warn(`[AI Customizer] ピッカーアイコンの挿入ポイントが見つかりませんでした。`);
        }
    }

    getIconContainer() {
        return this.iconContainer;
    }

    async setCustomInstructions(prompt) {
        try {
            switch (this.siteName) {
                case 'chatgpt':
                    await this.setInstructionsChatGPT(prompt);
                    break;
                case 'claude':
                    await this.setInstructionsClaude(prompt);
                    break;
                case 'grok':
                    await this.setInstructionsGrok(prompt);
                    break;
                default:
                    console.warn(`[AI Customizer] ${this.siteName} のカスタム指示設定ロジックは未実装です。`);
            }
        } catch (error) {
            console.error(`[AI Customizer] ${this.siteName} での指示設定中にエラー:`, error);
        }
    }

    async setInstructionsChatGPT(prompt) {
        const [prompt1, prompt2] = [prompt, ''];

        (await waitForElement(this.selectors.userMenuButton)).click();
        await sleep(200);

        (await waitForElement(this.selectors.settingsButton, { textContent: 'Settings' })).click();
        await sleep(200);

        (await waitForElement(this.selectors.personalizationTab, { textContent: 'Personalization' })).click();
        await sleep(200);

        const input1 = await waitForElement(this.selectors.customInstructionInput1);
        input1.value = prompt1;
        input1.dispatchEvent(new Event('input', { bubbles: true }));

        const input2 = await waitForElement(this.selectors.customInstructionInput2);
        input2.value = prompt2;
        input2.dispatchEvent(new Event('input', { bubbles: true }));

        (await waitForElement(this.selectors.saveButton, { textContent: 'Save' })).click();
    }

    async setInstructionsClaude(prompt) {
        (await waitForElement(this.selectors.openCustomInstructionsButton)).click();
        await sleep(200);

        const input = await waitForElement(this.selectors.customInstructionInput1);
        input.value = prompt;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        (await waitForElement(this.selectors.saveButton, { textContent: 'Save Instructions' })).click();
    }

    async setInstructionsGrok(prompt) {
        // Grokのフローをシミュレート
        (await waitForElement(this.selectors.openModelSelectionButton)).click();
        await sleep(200);

        const input = await waitForElement(this.selectors.customInstructionInput1);
        input.value = prompt;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        (await waitForElement(this.selectors.saveButton)).click();
    }
}
