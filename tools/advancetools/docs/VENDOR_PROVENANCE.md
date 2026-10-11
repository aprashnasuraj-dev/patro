# Vendored converter provenance

No proprietary font binaries or commercial chord/chart tables are bundled. Calculation engines, chord generation, paper geometry and PDF writing are original for this package. Converter mappings/rules use the following bundled open-source notices:

| Adapter | Upstream notice | Local adaptation |
|---|---|---|
| Kruti Dev | Ravi Taak, MIT, 2023 | Dart mapping extraction; JavaScript substitutions, cluster i/reph ordering and bounded reph handling |
| Bijoy | Md. Jehad, MIT, 2026 | TypeScript stripped to browser JavaScript; upstream conversion/unmapped-symbol checks |
| FM Abhaya | akuruAI, MIT, 2024 | JSON mapping, longest-first rule/table substitution |
| Bamini | Pakeetharan Balasubramaniam, MIT, 2025 | Reverse mapping derived from Unicode-to-Bamini source; conflicting symbols retained/reported |
| Myanmar | Google Myanmar Tools, Apache 2.0 | JavaScript Zawgyi/Unicode phase rules; original notices retained; bounded phase runner |

See the full notices in `licenses/`, original mapping sources and fixtures in `reference/` and `src/vendor/`. Modified browser modules remain separately identifiable. Do not remove notices when redistributing. These converter tables do not prove perfect fidelity for every font version or mixed-encoding document; compare converted documents with originals.

The following SHA-256 inventory identifies the exact bundled source and fixture snapshots:

- `reference/bamini.js`: `5f3b7364152255fe5b48de492541f0b7c785f94198751c1d14875a23432238a5`
- `reference/bijoy-test.ts`: `57895346f7c11b5834e06d828d702ccf873e7f1cbcba966c2cd27c51c5b084bc`
- `reference/fm-cases.json`: `bf22738774aa89da39723739309edfbbbb37481e2efb254a89370a2a3a11aeb0`
- `reference/kruti.dart`: `d2caf0beb0e878e6c3080f94145335d392df6119d1cf216af2828880d9a7635d`
- `reference/zawgyi.ts`: `046d988b326736888c8e5474d2c0aef0e33b22c97c3b0a7d3772cc2a1ef91e4e`
- `src/vendor/bamini-map.mjs`: `24911afeefd6ffd8352d953d6ea38a59b4821c08ab16c67590f823bf8281a7b7`
- `src/vendor/bijoy.mjs`: `1f679deacd9a49fc1e3c15eda7f7d940710c0e311715e80b79aa82327bf17223`
- `src/vendor/bijoy.ts`: `3c9374e15175d182196e519ca7216809913bd8370ae8ffafc6359ab61a1788b5`
- `src/vendor/fm-abhaya.json`: `0dc95936a37d1832f56ca2fb2dd8b08edeb52f23df3586c9a6dd09ac401d5f7a`
- `src/vendor/fm-abhaya.mjs`: `ab1673bfb664d55590327d33c52c966a28e82587e2ac3bb7e9f59e36c7870f1b`
- `src/vendor/kruti-map.mjs`: `eefb88ecfc6f56689446cc172f0ee94f5051cf547d33f2373f31c1a2f4df5de3`
- `src/vendor/zawgyi-u2z.js`: `0f3d962fc43de658271af2dcc00a58dd13ea4fbb4f91b29cede70f0465c50d72`
- `src/vendor/zawgyi-u2z.mjs`: `d7ddb7d37be922726e58259540f4eb1f8c6e162e480cc7ae228cd3c96497f7fd`
- `src/vendor/zawgyi-z2u.js`: `037e3f423eba800972f65e4f8f30142cc669d1b0e95f71ca02e3dbef49f96bab`
- `src/vendor/zawgyi-z2u.mjs`: `a7a3513a9745666bd2e8629d7221027e517d22bead445282dd37048a65c43067`
