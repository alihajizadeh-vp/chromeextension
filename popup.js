document.addEventListener('DOMContentLoaded', function() {
  const colorDisplay = document.getElementById('color-display');
  const pickColorButton = document.getElementById('pick-color-button');

  // Load the last picked color from storage
  chrome.storage.sync.get(['lastPickedColor'], function(result) {
    if (result.lastPickedColor) {
      colorDisplay.style.backgroundColor = result.lastPickedColor;
      colorDisplay.textContent = result.lastPickedColor;
    }
  });

  pickColorButton.addEventListener('click', function() {
    // Placeholder for color picking logic
    // This will be implemented later to interact with the content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error injecting content script: " + chrome.runtime.lastError.message);
          // Fallback or error handling for when script injection fails
          // For example, if on a page where content scripts cannot be injected (e.g., chrome:// pages)
          alert("Cannot pick color from this page. Please try a different page.");
          return;
        }
        // After script is injected, send a message to start color picking
        chrome.tabs.sendMessage(tabs[0].id, { action: "startColorPicker" });
      });
    });
  });

  // Listen for messages from the content script with the picked color
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "colorPicked") {
      const color = request.color;
      if (color) {
        colorDisplay.style.backgroundColor = color;
        colorDisplay.textContent = color;
        // Save the picked color to storage
        chrome.storage.sync.set({ lastPickedColor: color });
      }
    }
  });
});
