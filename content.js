// Listen for a message from the popup to start the color picker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "startColorPicker") {
    activateEyeDropper();
  }
});

function activateEyeDropper() {
  if (window.EyeDropper) {
    const eyeDropper = new EyeDropper();
    eyeDropper.open()
      .then(result => {
        // Send the selected color back to the popup
        chrome.runtime.sendMessage({ action: "colorPicked", color: result.sRGBHex });
      })
      .catch(error => {
        console.error("EyeDropper API error:", error);
        // Optionally, send an error message back to the popup or handle it
        chrome.runtime.sendMessage({ action: "colorPickFailed", error: error.message });
      });
  } else {
    console.error("EyeDropper API is not supported in this browser.");
    // Fallback or message if EyeDropper is not available
    alert("Color picking is not supported on this page or browser version.");
    chrome.runtime.sendMessage({ action: "colorPickFailed", error: "EyeDropper API not supported" });
  }
}
