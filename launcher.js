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
            console.log(`デバッグ用：解決されたURL: ${url}`);
            
            chrome.runtime.sendMessage({ action: "checkWindow", url }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("デバッグ用：backgroundへのメッセージ送信エラー (checkWindow):", chrome.runtime.lastError.message);
                    closeLauncher();
                    return;
                }
                
                if (response && response.exists) {
                    chrome.windows.update(response.windowId, { focused: true }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("デバッグ用：ウィンドウのフォーカスエラー:", chrome.runtime.lastError.message);
                        }
                        closeLauncher();
                    });
                } else {
                    openPage(url, closeLauncher);
                }
            });
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
function openPage(url, callback) {
    console.log(`新しいページを開きます: ${url}`);
    const newWidth = 1280;
    const newHeight = 900;

    chrome.system.display.getInfo((displayInfo) => {
        let calculatedLeft = 0, calculatedTop = 0, useFallback = false;

        if (chrome.runtime.lastError || !displayInfo || displayInfo.length === 0) {
            console.error("デバッグ用：ディスプレイ情報の取得に失敗しました:", chrome.runtime.lastError?.message);
            useFallback = true;
        } else {
            const primaryDisplay = displayInfo.find(d => d.isPrimary) || displayInfo[0];
            const workArea = primaryDisplay.workArea;
            calculatedLeft = Math.round((workArea.width - newWidth) / 2) + workArea.left;
            calculatedTop = Math.round((workArea.height - newHeight) / 2) + workArea.top;
        }

        const windowOptions = { url, type: "popup", width: newWidth, height: newHeight, top: useFallback ? 0 : calculatedTop, left: useFallback ? 0 : calculatedLeft };

        chrome.windows.create(windowOptions, (window) => {
            if (window) {
                chrome.runtime.sendMessage({ action: "addWindow", url, windowId: window.id });
            }
            if (callback) callback();
        });
    });
}

/**
 * ランチャーウィンドウを閉じる関数
 */
function closeLauncher() {
    chrome.runtime.sendMessage({ action: "closeLauncher" });
}
