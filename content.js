function showToast(message) {
  let toast = document.createElement("div");
  toast.innerText = message;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#323232",
    color: "#fff",
    padding: "20px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    zIndex: 999999,
    opacity: "0",
    transition: "opacity 0.3s ease"
  });

  document.body.appendChild(toast);

  // fade in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  // fade out after 2 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Get a domain-specific key
function getStorageKey() {
  const baseUrl = window.location.hostname;
  return `rishi-job-fill-cache-${baseUrl}`;
}

function captureFields() {
  const storageKey = getStorageKey();

  // First get existing saved data for this domain
  chrome.storage.local.get(storageKey, (data) => {
    const existingFields = data[storageKey] || {};
    const newFields = { ...existingFields };

    document.querySelectorAll("input, textarea, select").forEach((el) => {
      const key = el.name || el.id || el.placeholder || "";
      if (!key) return;

      const currentValue = el.type === "checkbox" ? el.checked : el.value;

      if (
        currentValue !== "" &&
        currentValue !== null &&
        currentValue !== undefined
      ) {
        // only update if there’s an actual value
        newFields[key] = {
          content: currentValue,
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
      } else if (existingFields[key]) {
        // keep the old value if nothing new entered
        newFields[key] = existingFields[key];
      }
    });

    // Save merged result
    if (Object.keys(newFields).length === 0) {
      showToast(`⚠️ No fields found to save on ${storageKey}`);
      return;
    }

    chrome.storage.local.set({ [storageKey]: newFields }, () => {
      showToast(`✅ Updated fields for ${storageKey}`);
      console.log("Saved fields (merged):", storageKey, newFields);
    });
  });
}

// Simulate real typing (works on React-based inputs)
function setNativeValue(el, value) {
  el.focus();

  const lastValue = el.value;
  el.value = value;

  const event = new Event("input", { bubbles: true });
  const tracker = el._valueTracker;
  if (tracker) tracker.setValue(lastValue);
  el.dispatchEvent(event);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.blur();
}

// Fill fields from storage
function fillFields() {
  const storageKey = getStorageKey();
  chrome.storage.local.get(storageKey, (data) => {
    const fields = data[storageKey] || {};

    if (Object.keys(fields).length === 0) {
      showToast(`⚠️ Nothing stored for ${storageKey}`);
      console.warn("No stored fields for", storageKey);
      return;
    }

    document.querySelectorAll("input, textarea, select").forEach((el) => {
      const key = el.name || el.id || el.placeholder;
      if (key && fields[key] !== undefined) {
        const field = fields[key];

        if (el.type === "checkbox") {
          el.focus();
          el.checked = !!field.content;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.blur();
        } else if (el.type === "radio") {
          // Only select if the value matches
          if (field.content === el.value) {
            el.focus();
            el.checked = true;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            el.blur();
          }
        } else {
          setNativeValue(el, field.content);
        }
      }
    });
    showToast(`✅ Filled fields for ${storageKey}`);
    console.log("Filled fields:", storageKey, fields);
  });
}

// Listen for popup or shortcut messages
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
