let popupWindowId = null;

chrome.action.onClicked.addListener(() => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        console.log("Active tab:", activeTab.url, activeTab.id);
        if (!activeTab || !activeTab.url || !activeTab.url.startsWith('https://v2.swasthyaingit.in/')) {
            // Ignore click if not on swasthya ingit page
            return;
        }
        const tabId = activeTab.id;
        const urlWithTabId = `${chrome.runtime.getURL('index.html')}?tabId=${tabId}`;
        if (popupWindowId !== null) {
            chrome.windows.update(popupWindowId, { focused: true }, function (win) {
                if (!win) {
                    openPopupWindow(urlWithTabId);
                }
            });
        } else {
            openPopupWindow(urlWithTabId);
        }
    });
});

function openPopupWindow(url) {
    chrome.windows.create({
        url: url,
        type: 'popup',
        width: 600,
        height: 800,
        focused: true
    }, function (win) {
        popupWindowId = win.id;
    });
}

chrome.windows.onRemoved.addListener(function (windowId) {
    if (windowId === popupWindowId) {
        popupWindowId = null;
    }
});
