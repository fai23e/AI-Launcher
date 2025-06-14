// ランチャーウィンドウのIDを保持する変数。存在しない場合はnull。
let launcherWindowId = null;
// ランチャーから開かれたページのURLのリスト
let openedPageUrls = [];
// openedPageUrlsに対応するウィンドウIDのリスト
let openedPageIds = [];

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
    const newHeight = 750;

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
  console.log("デバッグ用：backgroundでメッセージを受信しました:", message); // 受信したメッセージをログに出力

  // ウィンドウが既に開いているか確認するアクション
  if (message.action === "checkWindow") {
    const { url } = message;
    const idIndex = openedPageUrls.indexOf(url); // URLがリストに存在するか確認

    if (idIndex !== -1) {
      // URLがリストに存在する場合、対応するウィンドウIDを取得
      const windowId = openedPageIds[idIndex];
      chrome.windows.get(windowId, { populate: false }, (foundWindow) => {
        if (chrome.runtime.lastError || !foundWindow) {
          // ウィンドウが存在しない場合（例:手動で閉じられた）、リストから削除
          console.warn(`デバッグ用：URL ${url} (ID: ${windowId}) のウィンドウが見つかりません。リストから削除します。`, chrome.runtime.lastError?.message || "ウィンドウオブジェクトなし");
          openedPageUrls.splice(idIndex, 1);
          openedPageIds.splice(idIndex, 1);
          sendResponse({ exists: false });
        } else {
          // ウィンドウが存在する場合
          console.log(`デバッグ用：URL ${url} (ID: ${windowId}) のウィンドウは存在します。`);
          sendResponse({ exists: true, windowId: foundWindow.id });
        }
      });
    } else {
      // URLがリストに存在しない場合
      console.log(`デバッグ用：URL ${url} のウィンドウは保存されていません。`);
      sendResponse({ exists: false });
    }
    return true; // sendResponseが非同期に呼び出されることを示す

  // 新しいウィンドウ情報を追加するアクション
  } else if (message.action === "addWindow") {
    const { url, windowId } = message;
    // 同じURLが既にリストにあるか確認
    if (openedPageUrls.includes(url)) {
        console.warn(`デバッグ用：URL ${url} は既にopenedPageUrlsに存在します。ウィンドウIDは ${openedPageIds[openedPageUrls.indexOf(url)]} かもしれません。${windowId} に更新します。`);
        const existingIndex = openedPageUrls.indexOf(url);
        openedPageIds[existingIndex] = windowId; // URLが既に存在する場合、ウィンドウIDを更新
    } else {
        openedPageUrls.push(url);
        openedPageIds.push(windowId);
    }
    console.log(`デバッグ用：ウィンドウが追加/更新されました: URL: ${url}, ID: ${windowId}`);
    sendResponse({ success: true });
    return false; // 同期レスポンス

  // ウィンドウ情報を削除するアクション
  } else if (message.action === "removeWindow") {
    const { windowId } = message;
    const index = openedPageIds.indexOf(windowId); // ウィンドウIDがリストに存在するか確認
    if (index !== -1) {
      const removedUrl = openedPageUrls.splice(index, 1)[0]; // URLリストからも削除
      openedPageIds.splice(index, 1); // IDリストから削除
      console.log(`デバッグ用：ウィンドウが削除されました: URL: ${removedUrl}, ID: ${windowId}`);
    } else {
      console.warn(`デバッグ用：追跡されていないウィンドウIDの削除が試みられました: ${windowId}`);
    }
    sendResponse({ success: true });
    return false; // 同期レスポンス

  // ランチャーウィンドウを閉じるアクション
  } else if (message.action === "closeLauncher") {
    if (launcherWindowId !== null) {
      chrome.windows.remove(launcherWindowId, () => {
        if (chrome.runtime.lastError) {
          console.error("デバッグ用：メッセージ経由でのランチャーウィンドウの削除に失敗しました:", chrome.runtime.lastError.message);
          // 削除に失敗した場合でも、ウィンドウIDは孤立している可能性があるため、
          // nullに設定するのは楽観的な回復試行。
        } else {
          console.log("デバッグ用：メッセージ経由でランチャーウィンドウが閉じられました。IDは:", launcherWindowId, "でした。");
        }
        launcherWindowId = null; // エラーの有無に関わらずIDをリセット（閉じる意図があったため）
        sendResponse({ success: true }); // 削除試行後にレスポンスを送信
      });
    } else {
      console.warn("デバッグ用：ランチャーを閉じるリクエストがありましたが、launcherWindowIdが設定されていません。");
      sendResponse({ success: false, message: "閉じるべきランチャーウィンドウがありません。" });
    }
    return true; // sendResponseが非同期に呼び出されることを示す
  }

  // 未処理のメッセージに対するデフォルトの戻り値。
  // 非同期応答の可能性がある場合はtrue、すべてのパスが同期の場合はfalse。
  // 上記の条件分岐を考慮すると、明示的に設定するのが安全。
  // アクションが一致せず、sendResponseが呼び出されない場合、送信側のコールバックは発火しない。
  // 必要に応じて、デフォルトで sendResponse({error: '不明なアクション'}) を追加することを検討。
  return false; // 未処理の同期メッセージに対するデフォルト
});
