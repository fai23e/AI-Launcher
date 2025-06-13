let openedPageUrls = [];
let openedPageIds = [];
console.log("Launcher script loaded.");
document.addEventListener("keydown", (event) => {
    console.log(`Key pressed: ${event.key}`); // デバッグ用ログ
    let url = "";
    if (event.key === "Escape") {
        console.log("Escape key pressed. Closing launcher window."); // デバッグ用ログ
        closeLauncher();
        return;
    } else if (event.key === "c") {
        url = "https://chatgpt.com/";
    } else if (event.key === "g") {
        url = "https://gemini.google.com/";
    } else if (event.key === "x") {
        url = "https://grok.com/";
    } else if (event.key === "p") {
        url = "https://www.perplexity.ai/";
    } else if (event.key === "m") {
        url = "https://copilot.microsoft.com/";
    } else if (event.key === "b") {
        url = "https://www.bing.com/images/create";
    } else if (event.key === "f") {
        url = "https://felo.ai/";
    } else {
        const keyDisplay = document.getElementById("keyDisplay");
        if (keyDisplay) {
            keyDisplay.textContent = `定義されていません: ${event.key}`;
        }
        return; // 定義されていないキーの場合は何もしない
    }

    if (url) {
        console.log(`URL resolved: ${url}`); // デバッグ用ログ
        chrome.runtime.sendMessage({ action: "checkWindow", url }, (response) => {
            console.log(`Response from background: ${JSON.stringify(response)}`); // デバッグ用ログ
            if (response && response.exists) {
                chrome.windows.update(response.windowId, { focused: true }, () => {
                    closeLauncher(); // サイトを開いた後にランチャーを閉じる
                });
            } else {
                openPage(url, closeLauncher); // サイトを開いた後にランチャーを閉じる
            }
        });
    } else {
        closeLauncher(); // URLがない場合は即座にランチャーを閉じる
    }
});

function openPage(url, callback) {
    console.log(`Opening new page: ${url}`); // デバッグ用ログ
    const windowOptions = {
        url: url,
        type: "popup",
        width: 1280, // 必要に応じて変更可能
        height: 900, // 必要に応じて変更可能
        top: 0,
        left: 0,
    };

    chrome.windows.create(windowOptions, (window) => {
        if (chrome.runtime.lastError) {
            console.error("Failed to create new window:", chrome.runtime.lastError);
            return;
        }
        if (window) {
            console.log(`New window created with ID: ${window.id}`); // デバッグ用ログ
            chrome.runtime.sendMessage({ action: "addWindow", url, windowId: window.id }, () => {
                if (callback) callback(); // サイトを開いた後にコールバックを実行
            });
            chrome.windows.onRemoved.addListener(function listener(windowId) {
                console.log(`Window closed with ID: ${windowId}`); // デバッグ用ログ
                chrome.runtime.sendMessage({ action: "removeWindow", windowId });
                chrome.windows.onRemoved.removeListener(listener);
            });
        }
    });
}

function closeLauncher() {
    chrome.runtime.sendMessage({ action: "closeLauncher" }, (response) => {
        if (response && response.success) {
            console.log("Launcher window close request sent."); // デバッグ用ログ
        }
    });
}

