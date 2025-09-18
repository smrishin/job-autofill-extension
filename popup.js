function sendMessageToTab(action) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError.message);
        alert("This page does not support autofill. Try a different page.");
      } else {
        console.log("Response from content script:", response);
      }
    });
  });
}

document.getElementById("saveBtn").addEventListener("click", () => {
  sendMessageToTab("capture");
});

document.getElementById("fillBtn").addEventListener("click", () => {
  sendMessageToTab("fill");
});
