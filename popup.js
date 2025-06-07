document.addEventListener("DOMContentLoaded", function() {
  // DOM Elements
  const colorDisplayPreview = document.getElementById("color-display-preview");
  const pickColorButton = document.getElementById("pick-color-button");
  const colorInfoSection = document.getElementById("color-info-section");

  const hexValueInput = document.getElementById("hex-value");
  const rgbValueInput = document.getElementById("rgb-value");
  const hslValueInput = document.getElementById("hsl-value");

  const copyHexButton = document.getElementById("copy-hex");
  const copyRgbButton = document.getElementById("copy-rgb");
  const copyHslButton = document.getElementById("copy-hsl");

  // Initially hide sections that depend on a color being picked
  colorInfoSection.style.display = "none";
  // const historySection = document.getElementById("history-section"); // For later
  // historySection.style.display = "none"; // For later

  console.log("Popup DOMContentLoaded. Elements obtained.");

  // --- Helper Functions ---
  function resetButton(message = "Pick Color", disabled = false, delay = 2500) {
    setTimeout(() => {
      pickColorButton.textContent = message;
      pickColorButton.disabled = disabled;
      console.log("Button reset to:", message);
    }, delay);
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    // 3 digits
    if (hex.length == 4) {
      r = "0x" + hex[1] + hex[1];
      g = "0x" + hex[2] + hex[2];
      b = "0x" + hex[3] + hex[3];
    // 6 digits
    } else if (hex.length == 7) {
      r = "0x" + hex[1] + hex[2];
      g = "0x" + hex[3] + hex[4];
      b = "0x" + hex[5] + hex[6];
    } else {
        return null; // Invalid hex format
    }
    return { r: +r, g: +g, b: +b };
  }

  function rgbToHsl(r, g, b) {
    if (r == null || g == null || b == null) return null;
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max == min) {
      h = s = 0; // achromatic
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function updateColorDisplay(hexColor) {
    if (!hexColor) return;

    colorDisplayPreview.style.backgroundColor = hexColor;
    hexValueInput.value = hexColor.toUpperCase();

    const rgb = hexToRgb(hexColor);
    if (rgb) {
      rgbValueInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      if (hsl) {
        hslValueInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      } else {
        hslValueInput.value = "N/A";
      }
    } else {
      rgbValueInput.value = "N/A";
      hslValueInput.value = "N/A";
    }
    colorInfoSection.style.display = "block"; // Show the info section
  }

  // --- Event Listeners ---
  pickColorButton.addEventListener("click", function() {
    // ... (existing pick color logic from previous step, ensure it does not reset button itself here)
    console.log("Pick Color button clicked.");
    pickColorButton.textContent = "Picking...";
    pickColorButton.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) { /* ... error handling ... */
        console.error("Tab query error:", chrome.runtime.lastError.message);
        pickColorButton.textContent = "Error: Tab Query";
        resetButton(); return;
      }
      if (!tabs || tabs.length === 0 || !tabs[0].id) { /* ... error handling ... */
        console.error("No active tab found or ID missing.");
        pickColorButton.textContent = "Error: No Tab";
        resetButton(); return;
      }
      const activeTab = tabs[0];
      if (activeTab.url && (activeTab.url.startsWith("chrome://") || activeTab.url.startsWith("https://chrome.google.com/webstore"))) { /* ... error handling ... */
        console.warn("Restricted page:", activeTab.url);
        pickColorButton.textContent = "Page Restricted";
        resetButton(); return;
      }
      chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ["content.js"] }, () => {
        if (chrome.runtime.lastError) { /* ... error handling ... */
          console.error("Inject script error:", chrome.runtime.lastError.message);
          pickColorButton.textContent = "Error: Injection";
          resetButton("Pick Color", false, 3000); return;
        }
        chrome.tabs.sendMessage(activeTab.id, { action: "startColorPicker" }, response => {
          if (chrome.runtime.lastError) { /* ... error handling ... */
            console.error("Send message error:", chrome.runtime.lastError.message);
            pickColorButton.textContent = "Error: Comms";
            resetButton("Pick Color", false, 3000); return;
          }
        });
      });
    });
  });

  function setupCopyButton(button, inputElement, formatName) {
    button.addEventListener("click", () => {
      const valueToCopy = inputElement.value;
      if (valueToCopy && valueToCopy !== "N/A") {
        navigator.clipboard.writeText(valueToCopy)
          .then(() => {
            console.log(formatName + " copied:", valueToCopy);
            const originalText = button.textContent;
            button.textContent = "Copied!";
            setTimeout(() => button.textContent = originalText, 1500);
          })
          .catch(err => {
            console.error("Failed to copy " + formatName + ":", err);
            const originalText = button.textContent;
            button.textContent = "Failed";
            setTimeout(() => button.textContent = originalText, 1500);
          });
      }
    });
  }

  setupCopyButton(copyHexButton, hexValueInput, "HEX");
  setupCopyButton(copyRgbButton, rgbValueInput, "RGB");
  setupCopyButton(copyHslButton, hslValueInput, "HSL");

  // Load last picked color from storage and display its info
  chrome.storage.sync.get(["lastPickedColor"], function(result) {
    if (result.lastPickedColor) {
      console.log("Loaded last picked color for full display:", result.lastPickedColor);
      updateColorDisplay(result.lastPickedColor); // This will also show the section
    } else {
      console.log("No last picked color found in storage.");
      colorInfoSection.style.display = "none"; // Ensure it's hidden if no color
    }
  });

  // --- Message Listener from content.js ---
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Popup received message:", request);
    let buttonFeedbackText = "Pick Color"; // Text for the main pickColorButton
    let shouldResetButton = true;

    switch (request.action) {
      case "colorPicked":
        const color = request.color;
        console.log("Color picked:", color);
        if (color) {
          updateColorDisplay(color); // This updates HEX, RGB, HSL inputs and preview
          chrome.storage.sync.set({ lastPickedColor: color });
          // Main button feedback after successful pick & display (copy buttons have their own feedback)
          pickColorButton.textContent = "Selected!";
          // We don't call resetButton here immediately, as copy buttons are now primary for action
          // Reset it after a longer delay or let it be until next pick.
          // For now, let's reset it to "Pick Color" so user can pick another.
          resetButton("Pick Color", false, 2000);
          shouldResetButton = false; // Handled by updateColorDisplay and its aftermath
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
        shouldResetButton = false; // Don't reset for unknown actions
    }

    if (shouldResetButton) {
      resetButton(); // Reset to "Pick Color" after a delay for error/cancel cases
    }
    return true; // Keep message channel open for async response if needed.
  });
  console.log("Popup script fully loaded.");
});
