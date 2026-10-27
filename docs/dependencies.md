# Client Tools 350 — Dependencies

No dependency is added during Phase 0. Prefer browser APIs and packages already present in the repository.

| Package | Repo version | License | Planned use | Loading |
|---|---:|---|---|---|
| `libheif-js` | 1.23.5 | LGPL-3.0 | HEIC/HEIF decode | Web Worker; lazy on HEIC action |
| `pdf-lib` | 1.17.1 | MIT | HEIC→PDF assembly | Browser-only; lazy |
| `yaml` | 2.8.1 | ISC | GitHub Actions workflow parsing | Browser-only; lazy |

Rules:
- Do not add a package when a small standards-based implementation is safer.
- Pin versions; no unversioned CDN imports.
- Record any new package here before merge with version, license and purpose.
- Library code may load, but user files/text must never be transmitted.
