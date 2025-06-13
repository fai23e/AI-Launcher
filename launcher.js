// ショートカットキーとURLの対応を定義したオブジェクト
const urlMap = {
    'b': 'https://www.bing.com/images/create',
    'c': 'https://chatgpt.com/',
    'f': 'https://felo.ai/',
    'g': 'https://gemini.google.com/',
    'j': 'https://jules.ai/',
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
 * 指定されたURLを新しいウィンドウで開く関数
 * @param {string} url 開くURL
 * @param {function} callback ページを開いた後に実行するコールバック関数
 */
function openPage(url, callback) {
    console.log(`デバッグ用：新しいページを開きます: ${url}`);
    const windowOptions = {
        url: url,
        type: "popup", // ポップアップウィンドウとして開く
        width: 1280,   // ウィンドウの幅
        height: 900,  // ウィンドウの高さ
        top: 0,       // ウィンドウの表示位置（上端）
        left: 0,      // ウィンドウの表示位置（左端）
    };

    // 新しいウィンドウを作成
    chrome.windows.create(windowOptions, (window) => {
        if (chrome.runtime.lastError) {
            console.error("デバッグ用：新しいウィンドウの作成失敗:", chrome.runtime.lastError.message);
            if (callback) callback(); // エラー時でもコールバックを実行してランチャーを閉じる
            return;
        }
        if (window) {
            console.log(`デバッグ用：新しいウィンドウが作成されました ID: ${window.id}`);
            // background.jsに新しいウィンドウ情報を追加するメッセージを送信
            chrome.runtime.sendMessage({ action: "addWindow", url, windowId: window.id }, () => {
                if (chrome.runtime.lastError) {
                    console.error("デバッグ用：backgroundへのメッセージ送信エラー (addWindow):", chrome.runtime.lastError.message);
                }
                // sendMessageの結果に関わらず、ウィンドウは既に作成されているためコールバックを実行
                if (callback) callback();
            });
            // ウィンドウが閉じられた際のリスナーを追加
            chrome.windows.onRemoved.addListener(function listener(windowId) {
                // 該当のウィンドウが閉じられた場合のみ処理
                if (windowId === window.id) {
                    console.log(`デバッグ用：ウィンドウが閉じられました ID: ${windowId}`);
                    // background.jsにウィンドウ情報を削除するメッセージを送信
                    chrome.runtime.sendMessage({ action: "removeWindow", windowId }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("デバッグ用：backgroundへのメッセージ送信エラー (removeWindow):", chrome.runtime.lastError.message);
                            return;
                        }
                        if (response) {
                            console.log("デバッグ用：backgroundでウィンドウ削除メッセージが処理されました。", response);
                        }
                    });
                    chrome.windows.onRemoved.removeListener(listener); // リスナーを削除
                }
            });
        } else {
             // windowがnullでlastErrorがない、という稀なケース
            console.warn("デバッグ用：エラーなしでウィンドウオブジェクトがnullでした。");
            if (callback) callback();
        }
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
            // フォールバックとして直接ウィンドウを閉じる試みは、コンテキストによって動作しない可能性があるため注意
            // window.close(); // 拡張機能のポップアップでは推奨されない
            return;
        }
        // responseが定義されているか、またsuccessプロパティを持つか確認することが推奨される
        if (response && response.success) {
            console.log("デバッグ用：ランチャーウィンドウクローズ要求の送信成功。");
        } else {
            // 失敗した場合や応答がない場合は、その旨をログに出力
            console.warn("デバッグ用：ランチャーウィンドウクローズ要求が失敗したか、確認できませんでした。", response);
        }
    });
}
