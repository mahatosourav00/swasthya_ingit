// This script runs in the context of the page
(function() {
  console.log('Content script loaded');
  try {
    const token = localStorage.getItem('userToken');
    console.log('Token retrieved:', token);
    chrome.runtime.sendMessage({ type: 'USER_TOKEN', token: token });
    // chrome.runtime.sendMessage({ type: 'USER_TOKEN', token: null });
  } catch (e) {
    window.postMessage({ type: 'USER_TOKEN', token: null }, '*');
  }
})();
