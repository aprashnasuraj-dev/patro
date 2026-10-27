# Client Tools 350 — Dependencies

No dependency is added during Phase 0. Prefer browser APIs and packages already present in the repository.

| Package | Repo version | License | Planned use | Loading |
|---|---:|---|---|---|
| `libheif-js` | 1.23.5 | LGPL-3.0 | HEIC/HEIF decode | Web Worker; lazy on HEIC action |
| `pdf-lib` | 1.17.1 | MIT | HEIC→PDF assembly | Browser-only; lazy |
| `yaml` | 2.8.1 | ISC | GitHub Actions workflow parsing | Browser-only; lazy |
| `exifr` | 7.1.3 | MIT | HEIC/HEIF EXIF, GPS and metadata inspection | Browser-only; lazy on metadata action |
| `gifenc` | 1.0.3 | MIT | Live Photo motion frames → GIF | Web Worker; lazy on GIF action |
| `gpt-tokenizer` | 4.1.0 | MIT | Local OpenAI-family token counting | Web Worker; lazy, version-pinned CDN module |

Rules:
- Do not add a package when a small standards-based implementation is safer.
- Pin versions; no unversioned CDN imports.
- Record any new package here before merge with version, license and purpose.
- Library code may load, but user files/text must never be transmitted.

## Network/privacy rule
Static library/config module requests are permitted, but no request may contain a user file, pasted text, secret, PEM body, prompt, calculator value, or derived private output. Shareable state uses URL fragments only, because fragments are not sent in HTTP requests.
