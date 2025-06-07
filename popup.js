document.addEventListener("DOMContentLoaded", function() {
  const colorDisplay = document.getElementById("color-display");
  const pickColorButton = document.getElementById("pick-color-button");

  // Load the last picked color from storage and display it
  chrome.storage.sync.get(["lastPickedColor"], function(result) {
    if (result.lastPickedColor) {
      colorDisplay.style.backgroundColor = result.lastPickedColor;
      colorDisplay.textContent = result.lastPickedColor;
    }
  });

  pickColorButton.addEventListener("click", function() {
    pickColorButton.textContent = "Picking..."; // Feedback during picking
    pickColorButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) {
        console.error("No active tab found.");
        pickColorButton.textContent = "Error: No Tab";
        setTimeout(() => {
            pickColorButton.textContent = "Pick Color";
            pickColorButton.disabled = false;
        }, 2000);
        return;
      }
      const activeTab = tabs[0];
      // Check if the tab is a chrome:// URL or other restricted page
      if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("https://chrome.google.com/webstore"))) {
          alert("Cannot pick color from this page (e.g., Chrome Web Store, chrome:// pages). Please try a different page.");
          pickColorButton.textContent = "Pick Color";
          pickColorButton.disabled = false;
          return;
      }

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error injecting content script: " + chrome.runtime.lastError.message);
          alert("Error: " + chrome.runtime.lastError.message + "\nPlease try a different page or reload this one.");
          pickColorButton.textContent = "Pick Color";
          pickColorButton.disabled = false;
          return;
        }
        // After script is injected, send a message to start color picking
        chrome.tabs.sendMessage(activeTab.id, { action: "startColorPicker" }, response => {
          if (chrome.runtime.lastError) {
            // Handle cases where the content script might not be ready or page is non-responsive
            console.error("Error sending message to content script: " + chrome.runtime.lastError.message);
            pickColorButton.textContent = "Error";
             setTimeout(() => {
                pickColorButton.textContent = "Pick Color";
                pickColorButton.disabled = false;
            }, 2000);
          }
        });
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
        chrome.storage.sync.set({ lastPickedColor: color }); // Save the picked color

        navigator.clipboard.writeText(color)
          .then(() => {
            pickColorButton.textContent = "Copied!";
            console.log("Color copied to clipboard: " + color);
          })
          .catch(err => {
            console.error("Failed to copy color to clipboard: ", err);
            pickColorButton.textContent = "Copy Failed";
            // Try fallback for older browsers if necessary, though EyeDropper API implies modern browser
            // document.execCommand("copy") could be a fallback here but needs text in DOM and selected.
          });
      } else {
        pickColorButton.textContent = "Pick Color"; // Reset if no color was picked
      }
    } else if (request.action === "colorPickFailed") {
        console.error("Color picking failed:", request.error);
        pickColorButton.textContent = "Failed";
    }

    // Reset button state after a delay
    setTimeout(() => {
        pickColorButton.textContent = "Pick Color";
        pickColorButton.disabled = false;
    }, 2000); // Reset after 2 seconds

    return true; // Keep message channel open for async response if needed
  });
});
