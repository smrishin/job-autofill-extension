// Capture all inputs when user clicks "Save"
function captureFields() {
  const fields = {};
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    const key = el.name || el.id || el.placeholder;
    if (key) fields[key] = el.value;
  });

  chrome.storage.local.set({ jobForm: fields }, () => {
    alert("Form fields saved!");
  });
}

// Fill saved fields
function fillFields() {
  chrome.storage.local.get("jobForm", (data) => {
    const fields = data.jobForm || {};
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      const key = el.name || el.id || el.placeholder;
      if (key && fields[key] !== undefined) {
        el.value = fields[key];
      }
    });
    alert("Form fields filled!");
  });
}

console.log("Job AutoFill content script loaded");

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("Received action:", req.action);

  if (req.action === "capture") {
    captureFields();
    sendResponse({ status: "captured" });
  }
  if (req.action === "fill") {
    fillFields();
    sendResponse({ status: "filled" });
  }

  // Important: return true if using async operations
  return true;
});
