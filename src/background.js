// This background script manages side panel initialization and cross communications
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SOURCE_DATA') {
    // A placeholder for capturing or retrieving cached source data
    console.log("Background received source data attempt");
    sendResponse({ success: true, payload: "mock data" });
  }
  return true;
});
