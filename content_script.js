
(function() {
    console.log("content_script.js loaded.");

    const GEMINI_BUTTON_ID = 'gemini-summary-button';
    const TARGET_SELECTOR = '#actions #top-level-buttons-computed'; // Selector for the container of like/dislike/share buttons

    function createGeminiButton() {
        const button = document.createElement('button');
        button.id = GEMINI_BUTTON_ID;
        button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--call-to-action yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading'; // Mimic YouTube button styling
        button.style.marginLeft = '8px'; // Add some left margin
        button.innerHTML = `
            <span class="yt-spec-button-shape-next__text-content">Geminiで要約</span>
        `;
        button.addEventListener('click', handleGeminiButtonClick);
        return button;
    }

    async function handleGeminiButtonClick() {
        const videoUrl = window.location.href;
        chrome.storage.sync.get('youtubeGeminiPrompt', async (data) => {
            const promptTemplate = data.youtubeGeminiPrompt || '要約して ${videoUrl}';
            const promptText = promptTemplate.replace('${videoUrl}', videoUrl);

            try {
                await navigator.clipboard.writeText(promptText);
                console.log('Prompt copied to clipboard:', promptText);
                // Open Gemini in a new tab
                window.open('https://gemini.google.com/', '_blank');
            } catch (err) {
                console.error('Failed to copy text or open Gemini:', err);
                alert('要約プロンプトのコピーに失敗しました。手動でコピーしてください。');
            }
        });
    }

    function addGeminiButton() {
        chrome.storage.sync.get('enableYoutubeGeminiButton', (data) => {
            const isEnabled = data.enableYoutubeGeminiButton !== false; // Default to true
            if (isEnabled) {
                const targetElement = document.querySelector(TARGET_SELECTOR);
                if (targetElement && !document.getElementById(GEMINI_BUTTON_ID)) {
                    const geminiButton = createGeminiButton();
                    // Insert before the share button if it exists, otherwise append
                    const shareButton = targetElement.querySelector('ytd-button-renderer #button.ytd-button-renderer[aria-label*="共有"]');
                    if (shareButton) {
                        shareButton.parentNode.insertBefore(geminiButton, shareButton);
                    } else {
                        targetElement.appendChild(geminiButton);
                    }
                    console.log('Gemini summary button added.');
                }
            } else {
                removeGeminiButton(); // Ensure button is removed if disabled
            }
        });
    }

    function removeGeminiButton() {
        const existingButton = document.getElementById(GEMINI_BUTTON_ID);
        if (existingButton) {
            existingButton.remove();
            console.log('Gemini summary button removed.');
        }
    }

    // Use MutationObserver to detect changes in the DOM
    const observer = new MutationObserver((mutationsList, observer) => {
        // Check if the URL has changed (e.g., navigating to a new video)
        if (window.location.href.includes('watch?v=')) {
            addGeminiButton();
        } else {
            removeGeminiButton();
        }
    });

    // Start observing the document body for changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check when the script loads
    if (window.location.href.includes('watch?v=')) {
        addGeminiButton();
    }
})();
