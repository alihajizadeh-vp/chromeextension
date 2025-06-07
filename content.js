// Listen for a message from the popup to start the color picker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "startColorPicker") {
    activateEyeDropper();
    // Indicate that an async response will be sent
    return true;
  }
});

function activateEyeDropper() {
  if (!window.EyeDropper) {
    console.warn("EyeDropper API constructor not found.");
    chrome.runtime.sendMessage({
      action: "eyeDropperUnavailable",
      message: "EyeDropper API not available in this context (constructor missing)."
    });
    return;
  }

  const eyeDropper = new EyeDropper();
  eyeDropper.open()
    .then(result => {
      console.log("Color picked by EyeDropper:", result.sRGBHex);
      chrome.runtime.sendMessage({ action: "colorPicked", color: result.sRGBHex });
    })
    .catch(error => {
      console.error("EyeDropper API error. Name:", error.name, "Message:", error.message);
      if (error.name === "AbortError") {
        // This error occurs if the user cancels the selection (e.g., by pressing Escape).
        console.log("User cancelled the color selection.");
        chrome.runtime.sendMessage({ action: "colorPickCancelled", message: "Color selection cancelled by user." });
      } else if (error.message && error.message.toLowerCase().includes("eyedropper is not available")) {
        // This error occurs if the EyeDropper API is not available for other reasons.
        console.warn("EyeDropper API reported as not available.");
        chrome.runtime.sendMessage({ action: "eyeDropperUnavailable", message: error.message });
      } else {
        // For other types of errors
        console.error("Unhandled EyeDropper error:", error);
        chrome.runtime.sendMessage({ action: "colorPickFailed", error: error.message });
      }
    });
}
