chrome.commands.onCommand.addListener((command) => {
  console.log("Command triggered:", command);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;

    if (command === "save_fields") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "capture" });
    }

    if (command === "fill_fields") {
      chrome.tabs.sendMessage(tabs[0].id, { action: "fill" });
    }
  });
});
