document.addEventListener('DOMContentLoaded', () => {
    const siteListContainer = document.getElementById('site-list');
    const addSiteForm = document.getElementById('add-site-form');
    const resetSitesBtn = document.getElementById('reset-sites-btn');
    const toast = document.getElementById('toast-notification');

    // New elements for YouTube Gemini button settings
    const enableYoutubeGeminiButton = document.getElementById('enable-youtube-gemini-button');
    const youtubeGeminiPrompt = document.getElementById('youtube-gemini-prompt');

    // 通知を表示する
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000); // 3秒後に非表示
    }

    // サイトリストを読み込んで表示するメイン関数
    function loadSites() {
        chrome.storage.sync.get('sites', (data) => {
            const sites = data.sites || [];
            renderSites(sites);
        });
    }

    // YouTube Gemini ボタン設定を読み込む
    function loadYoutubeGeminiSettings() {
        chrome.storage.sync.get(['enableYoutubeGeminiButton', 'youtubeGeminiPrompt'], (data) => {
            enableYoutubeGeminiButton.checked = data.enableYoutubeGeminiButton !== false; // Default to true
            youtubeGeminiPrompt.value = data.youtubeGeminiPrompt || '要約して ${videoUrl}'; // Default prompt
        });
    }

    // YouTube Gemini ボタン設定を保存する
    function saveYoutubeGeminiSettings() {
        chrome.storage.sync.set({
            enableYoutubeGeminiButton: enableYoutubeGeminiButton.checked,
            youtubeGeminiPrompt: youtubeGeminiPrompt.value
        }, () => {
            showToast('YouTube Gemini ボタン設定を保存しました');
        });
    }

    // イベントリスナー
    enableYoutubeGeminiButton.addEventListener('change', saveYoutubeGeminiSettings);
    youtubeGeminiPrompt.addEventListener('input', saveYoutubeGeminiSettings);

    // サイトのリストを描画する
    function renderSites(sites) {
        siteListContainer.innerHTML = ''; // リストをクリア
        if (sites.length === 0) {
            siteListContainer.innerHTML = '<p>サイトが登録されていません。</p>';
            return;
        }

        sites.forEach((site, index) => {
            const siteElement = document.createElement('div');
            siteElement.className = 'site-item';
            siteElement.dataset.index = index;
            siteElement.innerHTML = createSiteView(site, index, sites.length);
            siteListContainer.appendChild(siteElement);
        });
    }

    // 通常表示のHTMLを生成
    function createSiteView(site, index, total) {
        const upDisabled = index === 0 ? 'disabled' : '';
        const downDisabled = index === total - 1 ? 'disabled' : '';
        return `
            <div class="reorder-buttons">
                <button class="up-btn" ${upDisabled}>▲</button>
                <button class="down-btn" ${downDisabled}>▼</button>
            </div>
            <div class="info">
                <strong>${site.key.toUpperCase()}:</strong> ${site.name}
                <p>${site.description || ''}</p>
                <small>${site.url}</small>
            </div>
            <div class="actions">
                <button class="edit-btn">編集</button>
                <button class="delete-btn">削除</button>
            </div>
        `;
    }

    // 編集フォームのHTMLを生成
    function createEditView(site) {
        return `
            <div class="reorder-buttons">
                <button disabled>▲</button>
                <button disabled>▼</button>
            </div>
            <div class="edit-form">
                <input type="text" class="edit-key" value="${site.key}" maxlength="1" required>
                <input type="text" class="edit-name" value="${site.name}" required>
                <input type="url" class="edit-url" value="${site.url}" required>
                <input type="text" class="edit-description" value="${site.description || ''}">
            </div>
            <div class="actions">
                <button class="save-btn">保存</button>
                <button class="cancel-btn">キャンセル</button>
            </div>
        `;
    }

    // サイトの順序を入れ替える
    function moveSite(index, direction) {
        chrome.storage.sync.get('sites', (data) => {
            const sites = data.sites || [];
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= sites.length) return;

            [sites[index], sites[newIndex]] = [sites[newIndex], sites[index]]; // 要素の入れ替え

            chrome.storage.sync.set({ sites }, () => {
                loadSites();
                showToast('順序を更新しました');
            });
        });
    }

    // イベントリスナー（イベントデリゲーション）
    siteListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const siteItem = target.closest('.site-item');
        if (!siteItem) return;

        const index = parseInt(siteItem.dataset.index, 10);

        if (target.classList.contains('up-btn'))   moveSite(index, -1);
        if (target.classList.contains('down-btn')) moveSite(index, 1);

        if (target.classList.contains('delete-btn')) {
            if (confirm('本当にこのサイトを削除しますか？')) {
                chrome.storage.sync.get('sites', (data) => {
                    const sites = data.sites || [];
                    sites.splice(index, 1);
                    chrome.storage.sync.set({ sites }, () => {
                        loadSites();
                        showToast('サイトを削除しました');
                    });
                });
            }
        }

        if (target.classList.contains('edit-btn')) {
            chrome.storage.sync.get('sites', (data) => {
                const site = (data.sites || [])[index];
                if (site) siteItem.innerHTML = createEditView(site);
            });
        }

        if (target.classList.contains('save-btn')) {
            const updatedSite = {
                key: siteItem.querySelector('.edit-key').value.toLowerCase(),
                name: siteItem.querySelector('.edit-name').value,
                url: siteItem.querySelector('.edit-url').value,
                description: siteItem.querySelector('.edit-description').value,
            };
            chrome.storage.sync.get('sites', (data) => {
                const sites = data.sites || [];
                if (sites.some((s, i) => s.key === updatedSite.key && i !== index)) {
                    alert('このショートカットキーは既に使用されています。');
                    return;
                }
                sites[index] = updatedSite;
                chrome.storage.sync.set({ sites }, () => {
                    loadSites();
                    showToast('サイトを更新しました');
                });
            });
        }

        if (target.classList.contains('cancel-btn')) {
            loadSites();
        }
    });

    // サイトの追加
    addSiteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newSite = {
            key: document.getElementById('new-key').value.toLowerCase(),
            name: document.getElementById('new-name').value,
            url: document.getElementById('new-url').value,
            description: document.getElementById('new-description').value,
        };
        chrome.storage.sync.get('sites', (data) => {
            const sites = data.sites || [];
            if (sites.some(site => site.key === newSite.key)) {
                alert('このショートカットキーは既に使用されています。');
                return;
            }
            sites.push(newSite);
            chrome.storage.sync.set({ sites }, () => {
                addSiteForm.reset();
                loadSites();
                showToast('新しいサイトを追加しました');
            });
        });
    });

    // 設定を初期化
    resetSitesBtn.addEventListener('click', () => {
        if (confirm('すべてのサイト設定を初期状態に戻します。よろしいですか？')) {
            const defaultSites = [
                { key: 'b', name: 'Image Creator', url: 'https://www.bing.com/images/create', description: 'アイデアからユニークな画像を生成したいとき。DALL·Eベース' },
                { key: 'c', name: 'ChatGPT', url: 'https://chatgpt.com/', description: '文章作成、ブレインストーミング、複雑なトピックの要約など、万能的な対話と思考支援' },
                { key: 'f', name: 'Felo', url: 'https://felo.ai/', description: '情報検索、会議や動画のリアルタイム翻訳・文字起こし' },
                { key: 'g', name: 'Gemini', url: 'https://gemini.google.com/', description: 'マルチモーダルな入力（テキスト、画像等）で高度な推論や情報整理をしたいとき。Googleサービスとの連携' },
                { key: 'j', name: 'Jules', url: 'https://jules.google.com/', description: 'ソフトウェア開発のコーディング支援、デバッグ、ドキュメント作成などでサポートが欲しいとき。(Google開発)' },
                { key: 'k', name: 'Claude', url: 'https://claude.ai/', description: '長文の読解・要約、倫理的な配慮が必要な文章作成、自然な対話' },
                { key: 'm', name: 'MS copilot', url: 'https://copilot.microsoft.com/', description: 'Microsoft 365アプリとの連携、Bing検索ベースの最新情報取得、日常業務のサポート' },
                { key: 'p', name: 'Perplexity', url: 'https://www.perplexity.ai/', description: '正確な情報源を伴う回答や、特定のトピックに関する深い調査' },
                { key: 's', name: 'Genspark', url: 'https://genspark.ai/', description: '新しいアイデアの探求や、多様なタスクに対応できるAI' },
                { key: 'x', name: 'Grok', url: 'https://grok.com/', description: '最新の出来事やリアルタイムの情報を元にした回答、人間らしい回答やX(旧Twitter)の情報を活用できる' }
            ];
            chrome.storage.sync.set({ sites: defaultSites }, () => {
                loadSites();
                showToast('設定を初期化しました');
            });
        }
    });

    // 初期読み込み
    loadSites();
    loadYoutubeGeminiSettings();
});

