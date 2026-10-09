// Captured before the React bundle runs, including on slow mobile connections.
// Chromium emits beforeinstallprompt at most opportunistically: save the genuine
// browser event rather than attempting to synthesize or force installation.
(function () {
  if (window.__aafnaiInstallCaptureReady) return;
  window.__aafnaiInstallCaptureReady = true;
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__aafnaiInstallPrompt = event;
    window.dispatchEvent(new Event("patro:install-prompt-ready"));
  });
})();
