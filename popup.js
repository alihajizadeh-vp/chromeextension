document.addEventListener("DOMContentLoaded", function() {
  // DOM Elements
  const colorDisplay = document.getElementById("color-display"); // Was colorDisplayPreview
  const pickColorButton = document.getElementById("pick-color-button");

  console.log("Popup DOMContentLoaded (Simple Version).");

  // --- Helper Functions ---
  function resetButton(message = "Pick Color", disabled = false, delay = 2500) {
    setTimeout(() => {
      pickColorButton.textContent = message;
      pickColorButton.disabled = disabled;
      console.log("Button reset to:", message);
    }, delay);
  }

  // --- Event Listeners ---
  pickColorButton.addEventListener("click", function() {
    console.log("Pick Color button clicked (Simple Version).");
    pickColorButton.textContent = "Picking...";
    pickColorButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error("Tab query error:", chrome.runtime.lastError.message);
        pickColorButton.textContent = "Error: Tab Query";
        resetButton(); return;
      }
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        console.error("No active tab found or ID missing.");
        pickColorButton.textContent = "Error: No Tab";
        resetButton(); return;
      }
      const activeTab = tabs[0];
      console.log("Active tab:", activeTab.id, "URL:", activeTab.url);

      if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("https://chrome.google.com/webstore"))) {
        console.warn("Restricted page:", activeTab.url);
        pickColorButton.textContent = "Page Restricted";
        resetButton(); return;
      }

      console.log("Injecting content script into tab:", activeTab.id);
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Inject script error:", chrome.runtime.lastError.message);
          pickColorButton.textContent = "Error: Injection";
          resetButton("Pick Color", false, 3000); return;
        }
        console.log("Script injected. Sending message to start color picker.");
        chrome.tabs.sendMessage(activeTab.id, { action: "startColorPicker" }, response => {
          // Callback for sendMessage is optional here if content script doesn't send an immediate response to this specific message
          if (chrome.runtime.lastError) {
            console.error("Send message error:", chrome.runtime.lastError.message);
            pickColorButton.textContent = "Error: Comms";
            resetButton("Pick Color", false, 3000); return;
          }
          // console.log("Message sent to content script, response (if any):", response);
        });
      });
    });
  });

  // --- Message Listener from content.js ---
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Popup received message (Simple Version):", request);
    let shouldResetMainButton = true;

    switch (request.action) {
      case "colorPicked":
        const color = request.color;
        console.log("Color picked:", color);
        if (color) {
          colorDisplay.style.backgroundColor = color;
          colorDisplay.textContent = color.toUpperCase(); // Display HEX in the main display

          navigator.clipboard.writeText(color)
            .then(() => {
              console.log("Color copied to clipboard:", color);
              pickColorButton.textContent = "Copied!";
            })
            .catch(err => {
              console.error("Failed to copy color to clipboard:", err);
              pickColorButton.textContent = "Copy Failed";
            });
        } else {
          console.warn("No color value in colorPicked message.");
          pickColorButton.textContent = "Error: No Color";
        }
        break;
      case "colorPickCancelled":
        console.log("Color pick cancelled by user.");
        pickColorButton.textContent = "Selection Cancelled";
        break;
      case "eyeDropperUnavailable":
        console.warn("EyeDropper API unavailable:", request.message);
        pickColorButton.textContent = "Picker Unavailable";
        break;
      case "colorPickFailed":
        console.error("Color pick failed:", request.error);
        pickColorButton.textContent = "Pick Failed";
        break;
      default:
        console.warn("Unknown message action received:", request.action);
        shouldResetMainButton = false;
    }

    if (shouldResetMainButton) {
      resetButton(); // Reset to "Pick Color" after a delay
    }
    return true; // Keep message channel open for async responses.
  });
  console.log("Popup script (Simple Version) fully loaded.");
});
