// 拡張機能インストール時にデフォルトのサイトリストをストレージに保存
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
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
        chrome.storage.sync.set({ 
            sites: defaultSites,
            enableYoutubeGeminiButton: true,
            youtubeGeminiPrompt: '要約して ${videoUrl}'
        }, () => {
            console.log('デフォルトのサイトリストとYouTube Geminiボタン設定が保存されました。');
        });
    }
});

// ランチャーウィンドウのIDを保持する変数。存在しない場合はnull。
let launcherWindowId = null;

// ランチャーから開かれたページを管理するためのMap
// URLをキーとしてウィンドウIDを保持
const urlToIdMap = new Map();
// ウィンドウIDをキーとしてURLを保持（逆引き用）
const idToUrlMap = new Map();


// manifest.jsonで定義されたキーボードショートカットのリスナー
chrome.commands.onCommand.addListener((command) => {
  // "open_launcher"コマンド（例：Ctrl+Shift+Lなど）を受け取った場合
  if (command === "open_launcher") {
    if (launcherWindowId !== null) {
      // ランチャーウィンドウIDが既に存在する場合、ウィンドウの状態を確認
      chrome.windows.get(launcherWindowId, { populate: false }, (existingWindow) => {
        if (chrome.runtime.lastError || !existingWindow) {
          // ウィンドウが見つからない場合（手動で閉じられた、クラッシュしたなど）
          console.warn("デバッグ用：ランチャーウィンドウIDは設定されていましたが、ウィンドウが見つかりませんでした。リセットします。", chrome.runtime.lastError?.message || "ウィンドウオブジェクトなし");
          launcherWindowId = null; // IDをリセット
          openLauncher(); // 新しいランチャーを開く
        } else if (existingWindow.focused) {
          // ランチャーが既に開いていてフォーカスされている場合、閉じる（トグル動作）
          chrome.windows.remove(launcherWindowId, () => {
            if (chrome.runtime.lastError) {
              console.error("デバッグ用：フォーカスされたランチャーウィンドウの削除に失敗しました:", chrome.runtime.lastError.message);
            } else {
              console.log("デバッグ用：フォーカスされたランチャーウィンドウが削除されました（トグル動作）。");
            }
            launcherWindowId = null; // 削除後、IDをリセット
          });
        } else {
          // ランチャーは存在するがフォーカスされていない場合、フォーカスする
          chrome.windows.update(launcherWindowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
              console.error("デバッグ用：既存ランチャーウィンドウのフォーカスに失敗しました:", chrome.runtime.lastError.message);
              // フォーカスに失敗した場合、ウィンドウが不正な状態である可能性があるため、再度開くことを試みる
              launcherWindowId = null; // IDをリセット
              openLauncher();
            } else {
              console.log("デバッグ用：既存のランチャーウィンドウがフォーカスされました。");
            }
          });
        }
      });
    } else {
      // ランチャーウィンドウIDが記録されていない場合、新しいランチャーを開く
      openLauncher();
    }
  }
});

/**
 * ランチャーウィンドウを開くか、既存のものをフォーカスする関数。
 * launcherWindowIdの状態に応じて、createLauncherWindowを呼び出すか、既存ウィンドウを操作します。
 */
function openLauncher() {
  if (launcherWindowId !== null) {
    console.warn("デバッグ用：openLauncherが呼び出されましたが、launcherWindowIdはnullではありません。既存ウィンドウを確認します。");
    // 新規作成する代わりに、既存のウィンドウをフォーカスすることを試みる
    chrome.windows.get(launcherWindowId, { populate: false }, (existingWindow) => {
        if (chrome.runtime.lastError || !existingWindow) {
            console.warn("デバッグ用：openLauncher中に既存ランチャーウィンドウが見つかりませんでした。新規作成します。", chrome.runtime.lastError?.message || "ウィンドウオブジェクトなし");
            launcherWindowId = null; // リセットして作成に進む
            createLauncherWindow();
        } else {
            chrome.windows.update(launcherWindowId, { focused: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error("デバッグ用：openLauncherでのウィンドウのフォーカスに失敗しました:", chrome.runtime.lastError.message);
                    launcherWindowId = null; // リセットして新規作成を試みる
                    createLauncherWindow();
                } else {
                    console.log("デバッグ用：openLauncher呼び出し中に既存ウィンドウのフォーカスに成功しました。");
                }
            });
        }
    });
  } else {
    createLauncherWindow();
  }
}

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
            url: "launcher.htm",
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
    // ウィンドウが既に開いているか確認するアクション
    case "checkWindow": {
      const { url } = message;
      const windowId = urlToIdMap.get(url);

      if (windowId) {
        chrome.windows.get(windowId, { populate: false }, (foundWindow) => {
          if (chrome.runtime.lastError || !foundWindow) {
            console.warn(`デバッグ用：URL ${url} (ID: ${windowId}) のウィンドウが見つかりません。Mapから削除します。`, chrome.runtime.lastError?.message || "ウィンドウオブジェクトなし");
            urlToIdMap.delete(url);
            idToUrlMap.delete(windowId);
            sendResponse({ exists: false });
          } else {
            console.log(`デバッグ用：URL ${url} (ID: ${windowId}) のウィンドウは存在します。`);
            sendResponse({ exists: true, windowId: foundWindow.id });
          }
        });
      } else {
        console.log(`デバッグ用：URL ${url} のウィンドウは保存されていません。`);
        sendResponse({ exists: false });
      }
      return true; // sendResponseが非同期に呼び出されることを示す
    }

    // 新しいウィンドウ情報を追加するアクション
    case "addWindow": {
      const { url, windowId } = message;
      // 既存のURLに対する古いマッピングがあれば削除
      if (urlToIdMap.has(url)) {
        const oldWindowId = urlToIdMap.get(url);
        idToUrlMap.delete(oldWindowId);
        console.warn(`デバッグ用：URL ${url} は既に存在しました。古いウィンドウID ${oldWindowId} のマッピングを削除します。`);
      }
      urlToIdMap.set(url, windowId);
      idToUrlMap.set(windowId, url);
      console.log(`デバッグ用：ウィンドウが追加/更新されました: URL: ${url}, ID: ${windowId}`);
      sendResponse({ success: true });
      return false;
    }

    // ウィンドウ情報を削除するアクション
    case "removeWindow": {
      const { windowId } = message;
      const url = idToUrlMap.get(windowId);
      if (url) {
        urlToIdMap.delete(url);
        idToUrlMap.delete(windowId);
        console.log(`デバッグ用：ウィンドウが削除されました: URL: ${url}, ID: ${windowId}`);
      } else {
        console.warn(`デバッグ用：追跡されていないウィンドウIDの削除が試みられました: ${windowId}`);
      }
      sendResponse({ success: true });
      return false;
    }

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

    default:
      // 未知のアクション
      console.warn("デバッグ用：未知のアクションを受信しました:", message.action);
      return false; // 同期的に終了
  }
});
