import { AdapterManager } from './adapters/AdapterManager.js';

console.log("BI Adapter Content Script Injected.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_DATA") {
        console.log("Extraction requested from Side Panel...");
        
        AdapterManager.extractData(window.location.href, document)
            .then(result => {
                sendResponse({ success: true, payload: result.data, platform: result.platform });
            })
            .catch(err => {
                sendResponse({ success: false, error: err.message });
            });
            
        return true; // Return true indicates we will send response asynchronously
    }
});
