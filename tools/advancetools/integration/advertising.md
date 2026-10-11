# Optional advertising activation

Default build: disabled. No Google advertising script or request is made.

1. Obtain approval and use the real publisher and responsive slot IDs in `src/ad-config.mjs`.
2. Connect the existing site CMP, including required regional choices and revocation. Once the CMP has granted the applicable consent, it may dispatch:

```js
window.dispatchEvent(new CustomEvent('aafnai:ads-consent', {detail:{granted:true}}));
```

Do not dispatch this merely because a page opened. The module registers the listener asynchronously; the CMP adapter must wait until the listener is ready or relay its existing consent after module initialization. The default event name can be configured. On consent revocation, stop ad requests/remove placements using the site's CMP lifecycle and refresh when appropriate; this small adapter does not implement revocation.

3. Configure the scoped CSP to support the actual CMP and Google scripts, frames, images and connections required by your approved setup. Use Google's current documentation and observe staging CSP reports. A general broad wildcard advertising CSP is intentionally not supplied. Keep all existing non-ad protections.
4. Set/update the existing root ads.txt with the exact Google account record.
5. Rebuild, test real consent states, ad-blocked behavior and mobile layout, and inspect request logs before enabling production.

This account-specific step is unfinished until real account/CMP details are available. It does not require a Cloudflare Worker for tool inputs. The adapter only makes browser requests to Google after consent.
