console.log("Job AutoFill content script injected into", window.location.href);

// Manual save all fields
function captureFields() {
  const fields = {};
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    const key = el.name || el.id || el.placeholder || "";
    if (!key) return;

    fields[key] = {
      content: el.type === "checkbox" ? el.checked : el.value,
      id: el.id || "",
      label:
        (el.labels && el.labels[0] && el.labels[0].innerText) ||
        el.getAttribute("aria-label") ||
        el.placeholder ||
        "",
      name: el.name || "",
      placeholder: el.placeholder || "",
      time: Date.now(),
      type: el.type || el.tagName.toLowerCase()
    };
  });

  chrome.storage.local.set({ jobForm: fields }, () => {
    alert("Form fields saved!");
    console.log("Saved fields:", fields);
  });
}

// Fill fields from storage
function setNativeValue(el, value) {
  const lastValue = el.value;

  el.value = value;

  const event = new Event("input", { bubbles: true });
  // For React 16+ hack: update _valueTracker
  const tracker = el._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  el.dispatchEvent(event);

  // Also trigger change event
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillFields() {
  chrome.storage.local.get("jobForm", (data) => {
    const fields = data.jobForm || {};
    const elements = document.querySelectorAll("input, textarea, select");

    elements.forEach((el) => {
      const key = el.name || el.id || el.placeholder;
      if (key && fields[key] !== undefined) {
        const field = fields[key];
        const value = field.content;

        if (el.type === "checkbox") {
          el.checked = !!value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          el.focus();
          setNativeValue(el, value);
          el.blur();
        }
      }
    });

    alert("Form fields filled!");
    console.log("Filled fields (with events):", fields);
  });
}

// Listen for popup messages
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "capture") {
    captureFields();
    sendResponse({ status: "captured" });
  }
  if (req.action === "fill") {
    fillFields();
    sendResponse({ status: "filled" });
  }
  return true;
});
