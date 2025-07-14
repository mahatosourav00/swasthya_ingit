console.log("Popup script loaded");

document.addEventListener('DOMContentLoaded', function () {
    const output = document.getElementById('output');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const tab = tabs[0];
        if (!tab || !tab.url) {
            output.textContent = 'Could not get active tab.';
            return;
        }
        if (tab.url.startsWith('https://v2.swasthyaingit.in/')) {
            // Inject content.js
            console.log("Popup script loaded 2");
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            console.log("Popup script loaded 3");
            // Listen for message from content.js
            chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
                console.log("Popup script loaded 4");
                console.log('Token retrieved:', message);
                if (message && message.type === 'USER_TOKEN') {
                    if (message.token) {
                        output.innerHTML = `the token is: '${message.token}'`;
                    } else {
                        output.innerHTML = 'login first';
                    }
                }
            });
        } else {
            output.innerHTML = 'Go to swasthya ingit website and login...';
        }
    });
});

