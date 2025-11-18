// src/utils/site-selectors.js

/**
 * 各AIサイトのDOMセレクタを一元管理するモジュール
 *
 * [注意]
 * これらのセレクタは各サイトのHTML構造に依存しており、サイト側の
 * アップデートで予告なく変更される可能性があります。
 * 堅牢性を高めるため、idやdata-testid属性を優先的に使用しています。
 */

export const selectors = {
  chatgpt: {
    pickerInjectionAnchor: 'textarea[id="prompt-textarea"]',
    userMenuButton: 'button[id*="radix-"] > .flex.h-9.w-9',
    settingsButton: 'a', // テキストはアダプター側で指定
    personalizationTab: 'a', // テキストはアダプター側で指定
    customInstructionInput1: 'textarea[placeholder*="know about you"]',
    customInstructionInput2: 'textarea[placeholder*="how would you like ChatGPT to respond?"]',
    saveButton: 'button', // テキストはアダプター側で指定
  },
  claude: {
    pickerInjectionAnchor: 'div[contenteditable="true"][aria-label*="Prompt"]',
    openCustomInstructionsButton: 'button[aria-label="Custom instructions"]',
    customInstructionInput1: 'textarea[placeholder*="how to respond"]',
    saveButton: 'button', // テキストはアダプター側で指定
  },
  grok: {
    pickerInjectionAnchor: 'div[data-testid="tweetTextarea_0"]',
    openModelSelectionButton: 'div[aria-label="Grok settings"]',
    customInstructionInput1: 'textarea[placeholder="Enter custom instructions here..."]',
    saveButton: 'button[data-testid="settings_save_button"]',
  },
};

/**
 * 指定されたサイトのセレクタオブジェクトを取得する
 * @param {string} site - 'chatgpt', 'claude', 'grok' のいずれか
 * @returns {object|null} サイトに対応するセレクタオブジェクト
 */
export const getSelectorsForSite = (site) => {
  return selectors[site] || null;
};
