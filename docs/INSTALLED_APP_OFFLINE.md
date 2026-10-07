# Installed app feature preparation

FM, TV, astronomy, community calendars, the bot and all tools remain available. Only the timing of executable-code downloads changes.

The homepage loads the persistent player context immediately. HLS loads when non-native HLS playback is requested; Safari/iOS retain native HLS. Sky facts and supplemental panchang calculations load after idle or visibility, retaining their original calculation and controls. Bot/community calculations load when those features are used.

After `appinstalled`, on a standalone/iOS app launch, and when connectivity returns, the service worker downloads this build's JavaScript/CSS/font asset manifest automatically. It restores the public page shell first, reuses cached assets and retries missing assets on later installed launches/online events. Private account pages and unknown APIs remain excluded. Live audio/video streams require connectivity.

Verification on the built artifact: neither media-player nor astronomy was requested in the initial homepage interval; sky facts and next-fact control worked; installed-mode preparation cached both chunks; FM loaded after going offline; no browser page errors. The interrupted-download test verifies a failed astronomy request retries while the successful HLS asset is reused. Report: `reports/lazy-feature-browser.json`.
