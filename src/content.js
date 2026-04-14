import { AdapterManager } from './adapters/AdapterManager.js';

console.log("BI Adapter Content Script Injected in frame:", window.location.href);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_DATA") {
        
        AdapterManager.extractData(window.location.href, document)
            .then(result => {
                // If it's a generic fallback or empty array, don't send response immediately
                // so that we don't accidentally swallow the true iframe's response!
                if (result.platform !== "Generic Testing" && result.data.length > 0) {
                    sendResponse({ success: true, payload: result.data, platform: result.platform });
                } else if (window.top === window) {
                   // If we are the top window, wait a brief moment to allow iframes to respond first.
                   // If no iframe responded, we send the fallback. 
                   // Note: Chrome's messaging is tricky, but this ensures top frame doesn't instantly resolve the promise negatively.
                   setTimeout(() => {
                       sendResponse({ success: true, payload: result.data, platform: result.platform });
                   }, 300);
                }
            })
            .catch(err => {
                if (window.top === window) sendResponse({ success: false, error: err.message });
            });
            
        return true; 
    }
});
