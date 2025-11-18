// src/options/preset-manager.js
import { getStorage, setStorage } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const customInstructionsTab = document.getElementById('custom-instructions-tab');
    if (!customInstructionsTab) return;

    // --- DOM要素の取得 ---
    const addPresetBtn = document.getElementById('add-preset-btn');
    const modal = document.getElementById('preset-editor-modal');
    const modalTitle = document.getElementById('modal-title');
    const cancelBtn = document.getElementById('cancel-preset-btn');
    const presetForm = document.getElementById('preset-editor-form');
    const presetListContainer = document.getElementById('preset-list-container');
    const searchInput = document.getElementById('preset-search-input');
    const sortSelect = document.getElementById('preset-sort-select');
    const exportBtn = document.getElementById('export-presets-btn');
    const importBtn = document.getElementById('import-presets-btn');
    const importFileInput = document.getElementById('import-presets-file');
    const toast = document.getElementById('toast-notification');

    // フォーム要素
    const presetIdInput = document.getElementById('preset-id');
    const presetNameInput = document.getElementById('preset-name');
    const tagInputContainer = document.getElementById('tag-input-container');
    const tagInput = document.getElementById('tag-input');
    const presetPromptInput = document.getElementById('preset-prompt');
    const promptChatgptInput = document.getElementById('prompt-chatgpt');
    const promptClaudeInput = document.getElementById('prompt-claude');
    const promptGrokInput = document.getElementById('prompt-grok');
    const presetFavoriteCheckbox = document.getElementById('preset-favorite');

    let currentTags = [];
    let allPresets = [];

    // --- 通知機能 ---
    const showToast = (message) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    // --- モーダル制御 ---
    const openModal = (preset = null) => {
        presetForm.reset();
        currentTags = [];
        updateTagInputUI();

        if (preset) {
            modalTitle.textContent = 'プリセットを編集';
            presetIdInput.value = preset.id;
            presetNameInput.value = preset.name;
            presetPromptInput.value = preset.prompt;
            presetFavoriteCheckbox.checked = preset.favorite;
            currentTags = preset.tags ? [...preset.tags] : [];
            updateTagInputUI();
            promptChatgptInput.value = preset.siteCustomization?.chatgpt || '';
            promptClaudeInput.value = preset.siteCustomization?.claude || '';
            promptGrokInput.value = preset.siteCustomization?.grok || '';
        } else {
            modalTitle.textContent = '新しいプリセットを作成';
            presetIdInput.value = '';
        }
        modal.style.display = 'flex';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    // --- タグ入力UI ---
    const updateTagInputUI = () => {
        tagInputContainer.querySelectorAll('.tag').forEach(tagEl => tagEl.remove());
        currentTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag';
            tagElement.textContent = tag;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.textContent = 'x';
            removeBtn.onclick = () => {
                currentTags = currentTags.filter(t => t !== tag);
                updateTagInputUI();
            };
            tagElement.appendChild(removeBtn);
            tagInputContainer.insertBefore(tagElement, tagInput);
        });
    };

    // --- データ操作 & 描画 ---
    const renderPresets = () => {
        let presetsToRender = [...allPresets];
        const filter = searchInput.value.toLowerCase();
        const [sortKey, sortOrder] = sortSelect.value.split('_');

        if (filter) {
            presetsToRender = presetsToRender.filter(p =>
                p.name.toLowerCase().includes(filter) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(filter)))
            );
        }

        presetsToRender.sort((a, b) => {
            let valA, valB;
            if (sortKey === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortKey === 'favorite') {
                valA = a.favorite ? 1 : 0;
                valB = b.favorite ? 1 : 0;
            } else { // createdAt, updatedAt
                valA = new Date(a[sortKey] || 0);
                valB = new Date(b[sortKey] || 0);
            }

            if (sortOrder === 'desc') {
                return valA > valB ? -1 : 1;
            } else {
                return valA < valB ? -1 : 1;
            }
        });

        presetListContainer.innerHTML = '';
        if (presetsToRender.length === 0) {
            presetListContainer.innerHTML = '<p>該当するプリセットがありません。</p>';
            return;
        }

        presetsToRender.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.dataset.id = preset.id;
            card.innerHTML = `
                <div class="preset-card-header">
                    <span class="preset-card-name">${escapeHTML(preset.name)}</span>
                    <span class="preset-card-favorite ${preset.favorite ? 'is-favorite' : ''}" data-action="toggle-favorite">⭐</span>
                </div>
                <div class="preset-card-tags">
                    ${(preset.tags || []).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                </div>
                <div class="preset-card-footer">
                    <button class="card-btn" data-action="edit" title="編集">✏️</button>
                    <button class="card-btn" data-action="duplicate" title="複製">📄</button>
                    <button class="card-btn" data-action="delete" title="削除">🗑️</button>
                </div>
            `;
            presetListContainer.appendChild(card);
        });
    };

    const escapeHTML = (str) => {
        const p = document.createElement("p");
        p.textContent = str;
        return p.innerHTML;
    };

    const loadAndRender = async () => {
        allPresets = await getStorage('customInstructionPresets') || [];
        renderPresets();
    };

    // --- イベントリスナー ---
    addPresetBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => (e.target === modal) && closeModal());
    searchInput.addEventListener('input', renderPresets);
    sortSelect.addEventListener('change', renderPresets);

    presetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = presetIdInput.value || `preset_${new Date().getTime()}`;
        const now = new Date().toISOString();
        const existingPreset = allPresets.find(p => p.id === id);

        const newPreset = {
            id,
            name: presetNameInput.value,
            tags: currentTags,
            prompt: presetPromptInput.value,
            siteCustomization: {
                chatgpt: promptChatgptInput.value || null,
                claude: promptClaudeInput.value || null,
                grok: promptGrokInput.value || null,
            },
            favorite: presetFavoriteCheckbox.checked,
            createdAt: existingPreset ? existingPreset.createdAt : now,
            updatedAt: now,
        };

        if (existingPreset) {
            allPresets = allPresets.map(p => p.id === id ? newPreset : p);
        } else {
            allPresets.push(newPreset);
        }

        await setStorage({ customInstructionPresets: allPresets });
        closeModal();
        await loadAndRender();
        showToast('プリセットを保存しました');
    });

    presetListContainer.addEventListener('click', async (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const card = actionTarget.closest('.preset-card');
        const id = card.dataset.id;
        const preset = allPresets.find(p => p.id === id);
        if (!preset) return;

        switch (action) {
            case 'edit':
                openModal(preset);
                break;
            case 'delete':
                if (confirm(`「${preset.name}」を本当に削除しますか？`)) {
                    allPresets = allPresets.filter(p => p.id !== id);
                    await setStorage({ customInstructionPresets: allPresets });
                    await loadAndRender();
                    showToast('プリセットを削除しました');
                }
                break;
            case 'duplicate':
                const duplicatedPreset = {
                    ...JSON.parse(JSON.stringify(preset)),
                    id: `preset_${new Date().getTime()}`,
                    name: `${preset.name}のコピー`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                allPresets.push(duplicatedPreset);
                await setStorage({ customInstructionPresets: allPresets });
                await loadAndRender();
                showToast('プリセットを複製しました');
                break;
            case 'toggle-favorite':
                preset.favorite = !preset.favorite;
                preset.updatedAt = new Date().toISOString();
                await setStorage({ customInstructionPresets: allPresets });
                await loadAndRender();
                break;
        }
    });

    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.value.trim();
            if (newTag && !currentTags.includes(newTag)) {
                currentTags.push(newTag);
                updateTagInputUI();
            }
            tagInput.value = '';
        }
    });

    // --- インポート/エクスポート ---
    exportBtn.addEventListener('click', () => {
        if (allPresets.length === 0) {
            showToast('エクスポートするプリセットがありません。');
            return;
        }
        const dataStr = JSON.stringify({ customInstructionPresets: allPresets }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_customizer_presets_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('プリセットをエクスポートしました');
    });

    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.customInstructionPresets || !Array.isArray(data.customInstructionPresets)) {
                    throw new Error('無効なファイル形式です。');
                }

                const importedPresets = data.customInstructionPresets.map(p => ({
                    ...p,
                    id: `preset_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`,
                }));

                allPresets.push(...importedPresets);
                await setStorage({ customInstructionPresets: allPresets });
                await loadAndRender();
                showToast(`${importedPresets.length}件のプリセットをインポートしました`);

            } catch (err) {
                showToast(`インポートに失敗しました: ${err.message}`);
            } finally {
                importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    // 初期化
    loadAndRender();
});
