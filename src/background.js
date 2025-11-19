import { defaultSites } from './common/default-sites.js';

// 拡張機能インストール時にデフォルトのサイトリストをストレージに保存
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.storage.sync.set({ 
            sites: defaultSites
        }, () => {
            console.log('デフォルトのサイトリストが保存されました。');
        });
    }
});

// 拡張機能アイコンがクリックされたときにオプションページを開く
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

// ランチャーウィンドウのIDを保持する変数。存在しない場合はnull。
let launcherWindowId = null;




// manifest.jsonで定義されたキーボードショートカットのリスナー
chrome.commands.onCommand.addListener((command) => {
  if (command === "open_launcher") {
    // ランチャーウィンドウが既に開いているか確認
    if (launcherWindowId !== null) {
      // 開いている場合は、ウィンドウを閉じる（トグル動作）
      chrome.windows.remove(launcherWindowId, () => {
        // エラーハンドリングは省略するが、必要に応じて追加
        launcherWindowId = null;
      });
    } else {
      // 開いていない場合は、新しいランチャーを作成する
      createLauncherWindow();
    }
  }
});

/**
 * 新しいランチャーウィンドウを画面中央に作成する関数。
 * ディスプレイ情報を取得し、中央配置を試みます。失敗時はフォールバック処理を行います。
 */
function createLauncherWindow() {
    const newWidth = 700;
    const newHeight = 1000;

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

            // 念のため、計算結果が画面外（特にマイナス座標）にならないように調整
            if (calculatedLeft < workArea.left) calculatedLeft = workArea.left;
            if (calculatedTop < workArea.top) calculatedTop = workArea.top;
            // 右端や下端が画面外に出る場合も考慮（省略するが、より堅牢にするなら追加）
        }

        // ウィンドウ作成オプション
        const windowOptions = {
            url: "src/launcher/launcher.htm",
            type: "popup",
            width: newWidth,
            height: newHeight,
            left: useFallback ? 0 : calculatedLeft, // フォールバック時は左上
            top: useFallback ? 0 : calculatedTop,   // フォールバック時は左上
            focused: true,
        };

        chrome.windows.create(windowOptions, (window) => {
            if (chrome.runtime.lastError || !window) {
                console.error("デバッグ用：ランチャーウィンドウの作成に失敗しました:", chrome.runtime.lastError?.message || "ウィンドウオブジェクトがnullです。");
                launcherWindowId = null; // 作成失敗時はIDをnullに設定
                return;
            }
            launcherWindowId = window.id; // 作成されたウィンドウのIDを保存
            console.log("デバッグ用：ランチャーウィンドウが作成されました。ID:", launcherWindowId, " 位置:", windowOptions.left, ",", windowOptions.top);

            // ランチャーウィンドウが何らかの理由で閉じられた際のリスナー
            chrome.windows.onRemoved.addListener(function listener(removedWindowId) {
                // 閉じられたウィンドウがランチャーウィンドウであるか確認
                if (removedWindowId === launcherWindowId) {
                    console.log("デバッグ用：ランチャーウィンドウ (ID:", launcherWindowId, ") が削除されました。");
                    launcherWindowId = null; // IDをリセット
                    chrome.windows.onRemoved.removeListener(listener); // リスナーをクリーンアップ
                }
            });
        });
    });
}

// 拡張機能の他の部分（例：launcher.js）からのメッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("デバッグ用：backgroundでメッセージを受信しました:", message);

  switch (message.action) {
    // ランチャーウィンドウを閉じるアクション
    case "closeLauncher": {
      if (launcherWindowId !== null) {
        chrome.windows.remove(launcherWindowId, () => {
          if (chrome.runtime.lastError) {
            console.error("デバッグ用：メッセージ経由でのランチャーウィンドウの削除に失敗しました:", chrome.runtime.lastError.message);
          } else {
            console.log("デバッグ用：メッセージ経由でランチャーウィンドウが閉じられました。IDは:", launcherWindowId, "でした。");
          }
          launcherWindowId = null;
          sendResponse({ success: true });
        });
      } else {
        console.warn("デバッグ用：ランチャーを閉じるリクエストがありましたが、launcherWindowIdが設定されていません。");
        sendResponse({ success: false, message: "閉じるべきランチャーウィンドウがありません。" });
      }
      return true;
    }

    // YouTube動画の要約リクエスト
    case 'summarizeVideo': {
      (async () => {
        try {
          const data = await chrome.storage.sync.get('geminiApiKey');
          const apiKey = data.geminiApiKey;

          if (!apiKey) {
            sendResponse({ success: false, error: 'APIキーが設定されていません。オプションページで設定してください。' });
            return;
          }

          const videoUrl = message.url;
          const prompt = `${videoUrl} の内容を、タイムスタンプを付けて箇条書きで要約してください。`;

          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }]
            })
          });

          if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            throw new Error(`APIエラー: ${errorBody.error?.message || '不明なエラー'}`);
          }

          const responseData = await apiResponse.json();
          const summary = responseData.candidates[0].content.parts[0].text;

          sendResponse({ success: true, summary: summary });

        } catch (error) {
          console.error('要約の生成中にエラーが発生しました:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true; // 非同期レスポンスのためにtrueを返す
    }

    default:
      // 未知のアクション
      console.warn("デバッグ用：未知のアクションを受信しました:", message.action);
      return false; // 同期的に終了
  }
});
