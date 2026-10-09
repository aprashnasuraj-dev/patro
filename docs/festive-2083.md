# Dashain and Tihar editorial update, 2083

Checked 10 October 2026 Nepal time. This additive guide appears on Dashain,
Ghatasthapana, Phulpati, Maha Ashtami, Maha Navami, Tihar, Laxmi Puja and
Bhai Tika identity pages and 2083 occurrence pages. Earlier years are unchanged.
Both dynamic Worker and static prerender use shared/festive-2083.mjs.

## Timing evidence

Nepal Panchanga Nirnayak Development Committee's notice, dated 20 Ashwin 2083:
https://giwmscdnone.gov.np/media/pdf_upload/Dashain%202083_dzoktsj.pdf

Ghatasthapana: Ashwin 25 / 11 October 2026, 11:47 NPT.
Vijaya Dashami: Kartik 4 / 21 October 2026, 10:26 NPT.
Devi visarjan: 08:49 NPT. Recipient faces west; tika may be received throughout
Dashami, according to the committee. IANA timezone conversions identify the
same instant abroad; they do not designate a local religious muhurta.

Published calendar and existing immutable archive agree on Laxmi Puja on
8 November and Bhai Tika on 11 November. Tihar spans 7–11 November.
2083 Tihar sait was not found in the committee's current notices. No previous
year's timing or computed generic Diwali muhurta is substituted.

Navadurga descriptions are traditional general guidance, not temple-specific
ritual prescriptions. The official notice places Ashtami on both October 18
and 19, with Mahanavami October 20; the guide deliberately uses tithi order
rather than assigning nine consecutive civil dates to the nine forms.

## Temple evidence

https://ntb.gov.np/en/dakshinkali-
https://ntb.gov.np/palanchowk-bhagawati--kavre
https://radionepalonline.com/en/2024/10/10/391456.html

The 2024 Radio Nepal/RSS report supports customary Navaratri visits; it is
explicitly not represented as a 2083 temple activity schedule. Published
daily opening times, aarti schedules, ticket prices and booking claims are
not invented. Maps links are search links, not verified navigation endpoints.

Photos are older documentary photographs, dated and credited in captions.
Their Wikimedia Commons source and CC BY-SA licences are linked individually.
No photos imply a live 2083 festival scene. The three 960px Commons thumbnails
are hosted locally (approximately 662 KiB total) to avoid third-party requests.

## Validation

node --test tests/festive-2083.test.mjs tests/festival-runtime-contract.test.mjs
npm run build

Tests cover exact UTC instants, all overseas city times (including DST),
older-year exclusion, pending Tihar state and countdown expiry. Existing
archive details, source records, routes and sitemap entries remain additive.
