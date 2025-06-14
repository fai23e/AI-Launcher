// ショートカットキーとURLの対応を定義したオブジェクト
const urlMap = {
    'b': 'https://www.bing.com/images/create',
    'c': 'https://chatgpt.com/',
    'f': 'https://felo.ai/',
    'g': 'https://gemini.google.com/',
    'j': 'https://jules.google.com/',
    'k': 'https://claude.ai/',
    'm': 'https://copilot.microsoft.com/',
    'p': 'https://www.perplexity.ai/',
    's': 'https://genspark.ai/',
    'x': 'https://grok.com/'
};

// let openedPageUrls = []; // 現在未使用のためコメントアウト (将来の使用のために残置も検討)
// let openedPageIds = [];  // 現在未使用のためコメントアウト (将来の使用のために残置も検討)
console.log("ランチャースクリプトが読み込まれました。");

// キー入力イベントのリスナー
document.addEventListener("keydown", (event) => {
    console.log(`デバッグ用：キーが押されました: ${event.key}`);
    let url = ""; // 対象のURLを格納する変数

    // Escapeキーが押された場合はランチャーを閉じる
    if (event.key === "Escape") {
        console.log("デバッグ用：Escapeキーが押されました。ランチャーウィンドウを閉じます。");
        closeLauncher();
        return;
    }

    //押されたキーがurlMapに定義されているか確認
    if (urlMap.hasOwnProperty(event.key)) {
        url = urlMap[event.key]; // 対応するURLを取得
    } else {
        // urlMapに定義されていないキーの場合、メッセージを表示
        const keyDisplay = document.getElementById("keyDisplay");
        if (keyDisplay) {
            keyDisplay.textContent = `定義されていません: ${event.key}`;
        }
        return; // 定義されていないキーの場合は何もしない
    }

    // URLが取得できた場合
    if (url) {
        console.log(`デバッグ用：解決されたURL: ${url}`);
        // background.jsにウィンドウが既に開いているか確認するメッセージを送信
        chrome.runtime.sendMessage({ action: "checkWindow", url }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("デバッグ用：backgroundへのメッセージ送信エラー (checkWindow):", chrome.runtime.lastError.message);
                closeLauncher(); // エラー時はランチャーを閉じる (フォールバック)
                return;
            }
            console.log(`デバッグ用：backgroundからの応答 (checkWindow): ${JSON.stringify(response)}`);
            // ウィンドウが既に存在する場合
            if (response && response.exists) {
                // 既存のウィンドウをフォーカスする
                chrome.windows.update(response.windowId, { focused: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("デバッグ用：ウィンドウのフォーカスエラー:", chrome.runtime.lastError.message);
                    }
                    closeLauncher(); // フォーカス後、ランチャーを閉じる
                });
            } else {
                // ウィンドウが存在しない場合、新しいページを開く
                openPage(url, closeLauncher); // ページを開いた後、ランチャーを閉じる
            }
        });
    } else {
        // このケースはurlMapのロジックが正しければ到達しないはず
        console.warn("デバッグ用：URLが空でした。ランチャーを閉じます。");
        closeLauncher();
    }
});

/**
 * 指定されたURLを新しいウィンドウで開く関数 (画面中央に配置)
 * @param {string} url 開くURL
 * @param {function} callback ページを開いた後に実行するコールバック関数
 */
function openPage(url, callback) {
    console.log(`新しいページを開きます: ${url}`);
    const newWidth = 1280;
    const newHeight = 900;

    // ディスプレイ情報を取得して中央配置を計算
    chrome.system.display.getInfo((displayInfo) => {
        let calculatedLeft = 0;
        let calculatedTop = 0;
        let useFallback = false;

        if (chrome.runtime.lastError || !displayInfo || displayInfo.length === 0) {
            console.error("デバッグ用：ディスプレイ情報の取得に失敗しました:", chrome.runtime.lastError?.message || "ディスプレイ情報が空です。");
            useFallback = true;
        } else {
            // プライマリディスプレイを見つけるか、最初に見つかったディスプレイを使用
            const primaryDisplay = displayInfo.find(display => display.isPrimary) || displayInfo[0];
            const workArea = primaryDisplay.workArea;

            // 中央配置のための計算
            calculatedLeft = Math.round((workArea.width - newWidth) / 2) + workArea.left;
            calculatedTop = Math.round((workArea.height - newHeight) / 2) + workArea.top;

            // 計算結果が画面外にならないように調整
            if (calculatedLeft < workArea.left) calculatedLeft = workArea.left;
            if (calculatedTop < workArea.top) calculatedTop = workArea.top;
            if (calculatedLeft + newWidth > workArea.width) calculatedLeft = workArea.width - newWidth;
            if (calculatedTop + newHeight > workArea.height) calculatedTop = workArea.height - newHeight;
        }

        const windowOptions = {
            url: url,
            type: "popup",
            width: newWidth,
            height: newHeight,
            top: useFallback ? 0 : calculatedTop,
            left: useFallback ? 0 : calculatedLeft,
        };

        chrome.windows.create(windowOptions, (window) => {
            if (chrome.runtime.lastError) {
                console.error("新しいウィンドウの作成に失敗しました:", chrome.runtime.lastError.message);
                if (callback) callback();
                return;
            }
            if (window) {
                console.log(`新しいウィンドウがID: ${window.id} で作成されました。位置: ${windowOptions.left},${windowOptions.top}`);
                // サービスウィンドウIDをバックグラウンドに送信して管理
                chrome.runtime.sendMessage({ action: "addWindow", url, windowId: window.id }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("ウィンドウ情報のバックグラウンドへの送信に失敗:", chrome.runtime.lastError.message);
                    }
                    if (callback) callback();
                });

                // ウィンドウが閉じられたときのイベントリスナー
                chrome.windows.onRemoved.addListener(function listener(windowId) {
                    if (windowId === window.id) {
                        console.log(`ウィンドウ (ID: ${windowId}) が閉じられました。`);
                        chrome.runtime.sendMessage({ action: "removeWindow", windowId }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("ウィンドウ削除情報のバックグラウンドへの送信に失敗:", chrome.runtime.lastError.message);
                            }
                            if (response) {
                                console.log("デバッグ用：backgroundでウィンドウ削除メッセージが処理されました。", response);
                            }
                        });
                        chrome.windows.onRemoved.removeListener(listener);
                    }
                });
            } else {
                console.warn("ウィンドウオブジェクトが作成されませんでした。");
                if (callback) callback();
            }
        });
    });
}

/**
 * ランチャーウィンドウを閉じる関数
 */
function closeLauncher() {
    // background.jsにランチャーを閉じるメッセージを送信
    chrome.runtime.sendMessage({ action: "closeLauncher" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("デバッグ用：closeLauncherメッセージの送信エラー:", chrome.runtime.lastError.message);
            return;
        }
        if (response && response.success) {
            console.log("デバッグ用：ランチャーウィンドウクローズ要求の送信成功。");
        } else {
            console.warn("デバッグ用：ランチャーウィンドウクローズ要求が失敗したか、確認できませんでした。", response);
        }
    });
}
