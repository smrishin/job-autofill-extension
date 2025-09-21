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

function saveSingleField(el) {
  const storageKey = getStorageKey();

  chrome.storage.local.get(storageKey, (data) => {
    const existingFields = data[storageKey] || {};
    const newFields = { ...existingFields };

    const key = el.name || el.id || el.placeholder || "";
    if (!key) return;

    let currentValue;
    if (el.type === "checkbox") {
      currentValue = el.checked;
    } else if (el.type === "radio") {
      if (el.checked) {
        currentValue = el.value; // store only selected radio
      } else {
        return; // skip unselected radios
      }
    } else {
      currentValue = el.value;
    }

    if (
      currentValue !== "" &&
      currentValue !== null &&
      currentValue !== undefined
    ) {
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

      chrome.storage.local.set({ [storageKey]: newFields }, () => {
        showToast(`💾 Saved ${key} for ${storageKey}`);
        console.log("Auto-saved field:", key, newFields[key]);
      });
    }
  });
}

function enableAutoCapture() {
  document.querySelectorAll("input, textarea, select").forEach((el) => {
    if (el.dataset.autocapture === "true") return;
    if (el.type === "password") return;

    el.addEventListener("blur", () => {
      saveSingleField(el);
    });

    el.dataset.autocapture = "true";
  });
}

// Run initially and also watch for dynamically added fields
function initAutoCapture() {
  enableAutoCapture();

  const observer = new MutationObserver(() => {
    enableAutoCapture();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

console.log("Job AutoFill content script loaded");

function shouldIgnoreAutoCapture() {
  const ignoredDomains = ["linkedin.com"];
  return ignoredDomains.some((domain) =>
    window.location.hostname.includes(domain)
  );
}

if (!shouldIgnoreAutoCapture()) {
  console.log("Job AutoFill auto-capture enabled on", window.location.hostname);
  initAutoCapture();
} else {
  console.log(
    "Job AutoFill auto-capture disabled on",
    window.location.hostname
  );
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
