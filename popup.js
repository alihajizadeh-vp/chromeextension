document.addEventListener("DOMContentLoaded", function() {
  const colorDisplay = document.getElementById("color-display");
  const pickColorButton = document.getElementById("pick-color-button");

  console.log("Popup DOMContentLoaded.");

  function resetButton(message = "Pick Color", disabled = false, delay = 2500) {
    setTimeout(() => {
      pickColorButton.textContent = message;
      pickColorButton.disabled = disabled;
      console.log("Button reset to:", message);
    }, delay);
  }

  chrome.storage.sync.get(["lastPickedColor"], function(result) {
    if (result.lastPickedColor) {
      console.log("Loaded last picked color:", result.lastPickedColor);
      colorDisplay.style.backgroundColor = result.lastPickedColor;
      colorDisplay.textContent = result.lastPickedColor;
    } else {
      console.log("No last picked color found.");
    }
  });

  pickColorButton.addEventListener("click", function() {
    console.log("Pick Color button clicked.");
    pickColorButton.textContent = "Picking...";
    pickColorButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error("Tab query error:", chrome.runtime.lastError.message);
        pickColorButton.textContent = "Error: Tab Query";
        resetButton();
        return;
      }
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        console.error("No active tab found or ID missing.");
        pickColorButton.textContent = "Error: No Tab";
        resetButton();
        return;
      }
      const activeTab = tabs[0];
      console.log("Active tab:", activeTab.id, "URL:", activeTab.url);

      if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("https://chrome.google.com/webstore"))) {
        console.warn("Restricted page:", activeTab.url);
        // alert("Cannot pick color from this page. Please try a different page.");
        pickColorButton.textContent = "Page Restricted";
        resetButton();
        return;
      }

      console.log("Injecting content script into tab:", activeTab.id);
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content.js"]
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Inject script error:", chrome.runtime.lastError.message);
          pickColorButton.textContent = "Error: Injection";
          // alert("Error injecting script: " + chrome.runtime.lastError.message);
          resetButton("Pick Color", false, 3000);
          return;
        }
        console.log("Script injected. Sending message to start color picker.");
        chrome.tabs.sendMessage(activeTab.id, { action: "startColorPicker" }, response => {
          if (chrome.runtime.lastError) {
            console.error("Send message error:", chrome.runtime.lastError.message);
            pickColorButton.textContent = "Error: Comms";
            resetButton("Pick Color", false, 3000);
            // It might be that the content script is already done (e.g. user cancelled quickly)
            // or the page does not allow it.
            return;
          }
          console.log("Message sent, response (if any):", response);
        });
      });
    });
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Popup received message:", request);
    let buttonText = "Pick Color";
    let errorOccurred = false;

    switch (request.action) {
      case "colorPicked":
        const color = request.color;
        console.log("Color picked:", color);
        if (color) {
          colorDisplay.style.backgroundColor = color;
          colorDisplay.textContent = color;
          chrome.storage.sync.set({ lastPickedColor: color });
          navigator.clipboard.writeText(color)
            .then(() => {
              console.log("Color copied:", color);
              pickColorButton.textContent = "Copied!";
              resetButton();
            })
            .catch(err => {
              console.error("Clipboard copy failed:", err);
              pickColorButton.textContent = "Copy Failed";
              resetButton();
            });
          return true; // Return true for async clipboard operation
        } else {
          console.warn("No color value in colorPicked message.");
          buttonText = "Error: No Color";
          errorOccurred = true;
        }
        break;
      case "colorPickCancelled":
        console.log("Color pick cancelled by user.");
        buttonText = "Selection Cancelled";
        errorOccurred = true;
        break;
      case "eyeDropperUnavailable":
        console.warn("EyeDropper API unavailable:", request.message);
        buttonText = "Picker Unavailable"; // Or more specific like "Not on this page"
        // alert("EyeDropper API is not available on this page. Details: " + request.message);
        errorOccurred = true;
        break;
      case "colorPickFailed":
        console.error("Color pick failed:", request.error);
        buttonText = "Pick Failed";
        errorOccurred = true;
        break;
      default:
        console.warn("Unknown message action received:", request.action);
        return; // Don't reset button for unknown actions
    }

    pickColorButton.textContent = buttonText;
    resetButton(); // Reset to "Pick Color" after a delay

    // Return true if you intend to send a response asynchronously. Not needed here for most cases.
    // return true;
  });
  console.log("Popup script fully loaded.");
});
