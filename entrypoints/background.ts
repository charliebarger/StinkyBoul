export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    if (!chrome.sidePanel) return;

    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      // Ignore unsupported environments while keeping Chrome sidepanel behavior.
    });
  });
});
