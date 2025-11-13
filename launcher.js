document.addEventListener('DOMContentLoaded', () => {
    const siteListContainer = document.getElementById('site-list');
    const keyDisplay = document.getElementById('keyDisplay');
    const openOptionsLink = document.getElementById('open-options');
    let urlMap = {};

    // ストレージからサイト情報を読み込み、ランチャーを構築する
    function buildLauncher() {
        chrome.storage.sync.get('sites', (data) => {
            const sites = data.sites || [];
            siteListContainer.innerHTML = ''; // リストをクリア
            urlMap = {}; // URLマップをクリア

            if (sites.length === 0) {
                siteListContainer.innerHTML = '<li><a href="#" id="options-link">設定ページでサイトを追加してください。</a></li>';
                document.getElementById('options-link').addEventListener('click', (e) => {
                    e.preventDefault();
                    chrome.runtime.openOptionsPage();
                });
                return;
            }

            sites.forEach(site => {
                // URLマップを構築
                urlMap[site.key] = site.url;

                // HTMLのリスト項目を生成
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="shortcut-key">${site.key.toUpperCase()}:</span>
                    <div class="service-info">
                        <a href="${site.url}" target="_blank">${site.name}</a>
                        <span class="description">${site.description || ''}</span>
                    </div>
                `;
                siteListContainer.appendChild(li);
            });
        });
    }

    // オプションページを開くリンクのイベントリスナー
    openOptionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        closeLauncher(); // 設定を開いたらランチャーは閉じる
    });

    // キー入力イベントのリスナー
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        console.log(`デバッグ用：キーが押されました: ${key}`);

        if (key === "escape") {
            console.log("デバッグ用：Escapeキーが押されました。ランチャーウィンドウを閉じます。");
            closeLauncher();
            return;
        }

        // 設定ページを開くショートカット
        if (key === "?") {
            chrome.runtime.openOptionsPage();
            closeLauncher();
            return;
        }

        if (urlMap.hasOwnProperty(key)) {
            const url = urlMap[key];
            const shiftPressed = event.shiftKey;
            console.log(`デバッグ用：解決されたURL: ${url}, Shiftキー: ${shiftPressed}`);
            openPage(url, closeLauncher, shiftPressed);
        } else {
            if (keyDisplay) {
                keyDisplay.textContent = `定義されていません: ${event.key}`;
            }
        }
    });

    // 初期構築
    buildLauncher();
});

/**
 * 指定されたURLを新しいウィンドウで開く関数
 */
function openPage(url, callback, shiftPressed = false) {
    console.log(`新しいページを開きます: ${url}`);

    chrome.storage.sync.get(['windowSize', 'openAction'], (data) => {
        let openAction = data.openAction || 'popup'; // デフォルトは 'popup'

        // Shiftキーが押されている場合は、設定を反転させる
        if (shiftPressed) {
            openAction = openAction === 'popup' ? 'newTab' : 'popup';
        }

        if (openAction === 'newTab') {
            chrome.tabs.create({ url: url }, () => {
                if (callback) callback();
            });
        } else {
            // 'popup' の場合
            const sizeSetting = data.windowSize || 'fullscreen'; // デフォルトはfullscreen

            chrome.system.display.getInfo((displayInfo) => {
                let newWidth, newHeight, calculatedLeft, calculatedTop;

                if (chrome.runtime.lastError || !displayInfo || displayInfo.length === 0) {
                    console.error("デバッグ用：ディスプレイ情報の取得に失敗しました:", chrome.runtime.lastError?.message);
                    newWidth = 1280;
                    newHeight = 900;
                    calculatedLeft = 0;
                    calculatedTop = 0;
                } else {
                    const primaryDisplay = displayInfo.find(d => d.isPrimary) || displayInfo[0];
                    const workArea = primaryDisplay.workArea;

                    if (sizeSetting === 'fullscreen') {
                        newWidth = workArea.width;
                        newHeight = workArea.height;
                        calculatedLeft = workArea.left;
                        calculatedTop = workArea.top;
                    } else {
                        const [width, height] = sizeSetting.split('x').map(Number);
                        newWidth = width;
                        newHeight = height;
                        calculatedLeft = Math.round((workArea.width - newWidth) / 2) + workArea.left;
                        calculatedTop = Math.round((workArea.height - newHeight) / 2) + workArea.top;
                    }
                }

                const windowOptions = { url, type: "popup", width: newWidth, height: newHeight, top: calculatedTop, left: calculatedLeft };

                chrome.windows.create(windowOptions, (window) => {
                    if (callback) callback();
                });
            });
        }
    });
}

/**
 * ランチャーウィンドウを閉じる関数
 */
function closeLauncher() {
    chrome.runtime.sendMessage({ action: "closeLauncher" });
}
