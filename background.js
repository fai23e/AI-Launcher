let launcherWindowId = null;
let openedPageUrls = [];
let openedPageIds = [];

chrome.commands.onCommand.addListener((command) => {
  if (command === "open_launcher") {
    if (launcherWindowId !== null) {
      chrome.windows.get(launcherWindowId, { populate: false }, (window) => {
        if (chrome.runtime.lastError || !window) {
          launcherWindowId = null; // ウィンドウが存在しない場合リセット
          openLauncher();
        } else if (window.focused) {
          chrome.windows.remove(launcherWindowId, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to remove launcher window:", chrome.runtime.lastError);
            }
            launcherWindowId = null;
          });
        } else {
          chrome.windows.update(launcherWindowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
              console.error("Failed to focus launcher window:", chrome.runtime.lastError);
            }
          });
        }
      });
    } else {
      openLauncher();
    }
  }
});

function openLauncher() {
  chrome.windows.create({
    url: "launcher.htm",
    type: "popup",
    width: 400,
    height: 500,
    top: 0,
    left: 0,
    focused: true,
  }, (window) => {
    launcherWindowId = window.id;
    chrome.windows.onRemoved.addListener(function listener(windowId) {
      if (windowId === launcherWindowId) {
        launcherWindowId = null;
        chrome.windows.onRemoved.removeListener(listener);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkWindow") {
    const { url } = message;
    const idIndex = openedPageUrls.indexOf(url);

    if (idIndex !== -1) {
      const windowId = openedPageIds[idIndex];
      chrome.windows.get(windowId, { populate: false }, (window) => {
        if (chrome.runtime.lastError || !window) {
          // ウィンドウが存在しない場合、リストから削除
          openedPageUrls.splice(idIndex, 1);
          openedPageIds.splice(idIndex, 1);
          sendResponse({ exists: false });
        } else {
          // ウィンドウが存在する場合
          sendResponse({ exists: true, windowId: window.id });
        }
      });
    } else {
      sendResponse({ exists: false });
    }
    return true; // 非同期レスポンスを許可

  } else if (message.action === "addWindow") {
    const { url, windowId } = message;
    openedPageUrls.push(url);
    openedPageIds.push(windowId);
    sendResponse({ success: true });

  } else if (message.action === "removeWindow") {
    const { windowId } = message;
    const index = openedPageIds.indexOf(windowId);
    if (index !== -1) {
      openedPageUrls.splice(index, 1);
      openedPageIds.splice(index, 1);
    }
    sendResponse({ success: true });

  } else if (message.action === "closeLauncher") {
    if (launcherWindowId !== null) {
      chrome.windows.remove(launcherWindowId, () => {
        console.log("Launcher window closed."); // デバッグ用ログ
        launcherWindowId = null;
      });
    }
    sendResponse({ success: true });
  }
});
