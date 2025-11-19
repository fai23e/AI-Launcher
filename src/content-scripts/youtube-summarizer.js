(() => {
    const BUTTON_ID = 'youtube-summarizer-button';
    const WINDOW_ID = 'youtube-summarizer-window';

    // ボタンやウィンドウがすでに追加されているか確認
    if (document.getElementById(BUTTON_ID)) {
        return;
    }

    // --- DOM要素の作成 ---

    // フローティングウィンドウを作成
    function createSummarizeWindow() {
        if (document.getElementById(WINDOW_ID)) return;

        const windowDiv = document.createElement('div');
        windowDiv.id = WINDOW_ID;
        windowDiv.innerHTML = `
            <div id="summarizer-window-header">
                <h3>動画の要約</h3>
                <div>
                    <button id="summarizer-copy-btn" title="コピー">📄</button>
                    <button id="summarizer-close-btn" title="閉じる">×</button>
                </div>
            </div>
            <div id="summarizer-content"></div>
        `;
        document.body.appendChild(windowDiv);

        // --- イベントリスナーの設定 ---
        const closeBtn = document.getElementById('summarizer-close-btn');
        const copyBtn = document.getElementById('summarizer-copy-btn');
        const header = document.getElementById('summarizer-window-header');
        const content = document.getElementById('summarizer-content');

        closeBtn.addEventListener('click', () => windowDiv.style.display = 'none');

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content.innerText)
                .then(() => alert('要約をコピーしました！'))
                .catch(err => console.error('コピーに失敗:', err));
        });

        // ドラッグで移動する機能
        let isDragging = false;
        let offsetX, offsetY;
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - windowDiv.getBoundingClientRect().left;
            offsetY = e.clientY - windowDiv.getBoundingClientRect().top;
            windowDiv.style.userSelect = 'none'; // ドラッグ中のテキスト選択を防ぐ
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            windowDiv.style.left = `${e.clientX - offsetX}px`;
            windowDiv.style.top = `${e.clientY - offsetY}px`;
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            windowDiv.style.userSelect = 'auto';
        });
    }

    // 要約ボタンを作成
    function createSummarizeButton() {
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.textContent = '✨ 要約';
        button.classList.add('yt-spec-button-shape-next', 'yt-spec-button-shape-next--tonal', 'yt-spec-button-shape-next--mono', 'yt-spec-button-shape-next--size-m');
        button.style.marginLeft = '8px';

        button.addEventListener('click', handleSummarizeClick);
        return button;
    }

    // --- イベントハンドラ ---

    // 要約ボタンクリック時の処理
    function handleSummarizeClick() {
        const windowDiv = document.getElementById(WINDOW_ID);
        if (windowDiv.style.display === 'block') {
            windowDiv.style.display = 'none';
            return;
        }

        windowDiv.style.display = 'block';
        const contentDiv = document.getElementById('summarizer-content');
        contentDiv.textContent = '';
        contentDiv.classList.add('loading');

        // バックグラウンドに要約をリクエスト
        const videoUrl = window.location.href;
        chrome.runtime.sendMessage({ type: 'summarizeVideo', url: videoUrl }, (response) => {
            contentDiv.classList.remove('loading');
            if (response.success) {
                contentDiv.textContent = response.summary;
            } else {
                contentDiv.textContent = `エラー: ${response.error}`;
            }
        });
    }

    // --- 初期化処理 ---

    // DOMの変更を監視し、ボタンを適切な位置に挿入
    const observer = new MutationObserver((mutations, obs) => {
        const actionsContainer = document.querySelector('#actions.ytd-watch-metadata');

        if (actionsContainer && !document.getElementById(BUTTON_ID)) {
            const summarizeButton = createSummarizeButton();
            const menuRenderer = actionsContainer.querySelector('ytd-menu-renderer');
            if (menuRenderer) {
                menuRenderer.parentNode.insertBefore(summarizeButton, menuRenderer.nextSibling);
                createSummarizeWindow(); // ウィンドウもここで初期化
                obs.disconnect();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
