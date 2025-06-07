// background.js

// Example: Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(details => {
  console.log('Extension installed or updated:', details);
  // You could set up initial storage values here if needed
  // chrome.storage.sync.set({ defaultColor: '#FFFF00' });
});

// Example: A simple message listener (can be expanded later)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "log") {
    console.log(request.message);
    sendResponse({ status: "Logged" });
  }
  // Keep the message channel open for asynchronous sendResponse
  return true;
});

console.log("Background script loaded.");
