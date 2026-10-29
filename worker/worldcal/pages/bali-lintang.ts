import { isoToJdn, jdnToIso, todayIn } from "../dates";
import { esc, page } from "../html";
import { palelintanganMatrix, pawukon, SAPTAWARA_AKSARA } from "../engines/pawukon";
import { LINTANG_STORIES, lintangSlug } from "../data/bali-lintang-stories";
import type { Ctx, Rendered } from "../types";

const BP = "/bali-calendar";
const MUSEUM = "https://australian.museum/learn/cultures/international-collection/balinese/palintangan-calendar-balinese-painting-e74230/";
const AGSA = "https://www.agsa.sa.gov.au/collection-publications/about/asian-art/curators-insight-star-calendar/";
const ALL_SKIES = "https://ase.exopla.net/index.php/Balinese_(All_Terms)";
const UI_CSS = [
".lintang-portrait{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,.67fr);gap:18px;padding:24px;border:1px solid #9e783e;border-radius:22px;background:radial-gradient(circle at 75% 10%,#86602b 0,transparent 34%),linear-gradient(135deg,#281c17,#633329);color:#fff4d5;overflow:hidden;position:relative}",
".lintang-portrait:before{content:'';position:absolute;inset:12px;border:1px solid #c19c5e66;border-radius:15px;pointer-events:none}",
".lintang-portrait h2{font-size:clamp(2rem,5vw,3.1rem);color:#fff4d5;margin:4px 0 10px}.lintang-portrait p{margin:0;color:#ecd8b3}",
".lintang-portrait small{display:block;letter-spacing:.1em;text-transform:uppercase;color:#f0cc83;font-weight:700}",
".lintang-portrait .script{font-size:clamp(1.7rem,4vw,2.6rem);color:#f1d48c;line-height:1.45;margin-bottom:10px}",
".lintang-art{min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;position:relative;border:1px solid #d7b57766;border-radius:50%;aspect-ratio:1;max-width:260px;width:100%;margin:auto;background:radial-gradient(circle,#9e7a45aa 0,#4b2d23 60%,#2b1c18 100%);box-shadow:0 0 0 13px #ead09b14,0 0 0 14px #c6a26755}",
".lintang-art:before,.lintang-art:after{content:'✦';position:absolute;font-size:18px;color:#f4d489}.lintang-art:before{top:12%;left:23%}.lintang-art:after{bottom:15%;right:24%}",
".lintang-emblem{font-size:clamp(3.4rem,10vw,6rem);line-height:1.25;filter:drop-shadow(0 10px 15px #1b0f08aa)}.lintang-art strong{color:#fce9b8;letter-spacing:.07em;font-size:.75rem;text-align:center}",
".lintang-chips{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}.lintang-chips span{background:#f5ead5;border:1px solid #dbcaab;border-radius:999px;padding:5px 12px;color:#553d25;font-size:.78rem}",
".lintang-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lintang-features article{padding:19px;border:1px solid #d7c5a4;border-radius:16px;background:linear-gradient(145deg,#fffaf0,#eee1c9);color:#44301e}.lintang-features h3{font-size:1.07rem;margin:0 0 10px}.lintang-features p{line-height:1.66;margin:0}",
".lintang-inquiry{background:#f2e3c5;border-left:4px solid #805331;border-radius:12px;padding:19px;margin:18px 0;color:#513927}.lintang-inquiry p{font:600 1.18rem/1.45 var(--display);margin:8px 0 0}",
".lintang-next{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:12px 0}.lintang-next a{display:block;padding:11px 8px;background:#fbf4e5;border:1px solid #d5b888;border-radius:12px;text-align:center;text-decoration:none;color:#533b24;font-weight:700;font-size:.83rem}.lintang-next a:hover{background:#ead6b2}.lintang-next small{display:block;font-weight:500;font-size:.7rem;color:#705d48}",
".lintang-directory{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:12px}.lintang-directory a{display:flex;flex-direction:column;gap:3px;border:1px solid var(--line);border-radius:10px;padding:9px 6px;text-decoration:none;font-size:.75rem;line-height:1.35;background:var(--field)}.lintang-directory a[aria-current]{border:2px solid #914d2c;background:#f6e4c2;color:#4a2b15}.lintang-directory span{font-size:1.2rem}",
".lintang-browse{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin:12px 0}.lintang-browse a{padding:9px 12px;border:1px solid var(--line);border-radius:10px;text-decoration:none}",
".lintang-sources{font-size:.82rem;color:var(--muted)}.lintang-sources summary{cursor:pointer;font-weight:700}",
"@media(max-width:650px){.lintang-portrait{grid-template-columns:1fr;padding:19px}.lintang-art{max-width:190px;min-height:150px}.lintang-features{grid-template-columns:1fr}.lintang-directory{grid-template-columns:repeat(3,minmax(0,1fr))}.lintang-next{grid-template-columns:repeat(2,minmax(0,1fr))}}"
].join("\n");

const LINTANG_THEMES = [
  { title: "Tumbuhan, tanah, dan hasil panen", names: ["Kelapa Sunda","Lumbung","Tenggala","Lembu","Pedati Suung"], description: "Lukisan tentang kehidupan yang bertumpu pada tanah, pangan, dan perjalanan hasil bumi." },
  { title: "Hewan di sekitar kehidupan", names: ["Kuda","Gajah","Asu","Naga","Sidamalung","Banyak Angrem","Puwuh Atarung"], description: "Ragam hewan biasa dan makhluk cerita menunjukkan luasnya dunia fauna dalam kalender." },
  { title: "Air, pelayaran, dan alat tangkap", names: ["Yuyu","Gajahmina","Bubu Bosor","Prau Pegat","Perahu Sarat","Udang"], description: "Dari kepiting sungai hingga perahu sarat, cerita tentang air muncul dalam banyak bentuk." },
  { title: "Upacara dan benda pusaka", names: ["Dupa","Patrem","Salah Ukur","Bade","Atiwa-tiwa"], description: "Benda dan prosesi membantu memahami hubungan antara seni kalender dan kehidupan ritual." },
  { title: "Cahaya dan cerita langit", names: ["Kala Sungsang","Ru","Srengenge","Kartika","Kumba"], description: "Lintang juga menyimpan nama langit, cahaya, dan gambar yang kemudian diperdebatkan para peneliti." },
  { title: "Perasaan dan adegan manusia", names: ["Tangis","Sangkal Tikel","Depat","Hulanjar","Rebut Utang","Laweyan","Larung Paglangan"], description: "Sebagian petak lebih menyerupai adegan sandiwara daripada gambar benda atau hewan." },
];

const formatDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function lintangProfile(ctx: Ctx, pathSlug: string): Rendered | null {
  const matrix = palelintanganMatrix();
  const position = matrix.findIndex((item) => lintangSlug(item.lintang) === pathSlug);
  if (position < 0) return null;
  const cell = matrix[position];
  const story = LINTANG_STORIES[pathSlug];
  if (!story || story.name !== cell.lintang) return null;
  const today = todayIn("Asia/Makassar", ctx.now);
  const nowJdn = isoToJdn(today);
  let nextJdn = nowJdn;
  while (nextJdn - nowJdn < 35) {
    const candidate = pawukon(nextJdn);
    if (candidate.saptawara === cell.saptawara && candidate.pancawara === cell.pancawara) break;
    nextJdn++;
  }
  const upcoming = Array.from({length: 5}, (_, i) => jdnToIso(nextJdn + 35 * i));
  const theme = LINTANG_THEMES.find((t) => t.names.includes(cell.lintang))!;
  const companions = theme.names.filter((name) => name !== cell.lintang).slice(0, 4);
  const currentPath = BP + "/palelintangan/" + pathSlug;
  const prev = matrix[(position - 1 + matrix.length) % matrix.length];
  const next = matrix[(position + 1) % matrix.length];
  const directory = matrix.map((m) => {
    const key = lintangSlug(m.lintang);
    const item = LINTANG_STORIES[key];
    return '<a href="' + BP + '/palelintangan/' + key + '"' + (key === pathSlug ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + esc(item.emblem) + '</span>' + esc(m.lintang) + '</a>';
  }).join("");
  const body = [
    '<style>', UI_CSS, '</style>',
    '<div class="lintang-browse"><a href="' + BP + '/palelintangan">← Bagan 35 Lintang</a><a href="' + BP + '/otonan">Hitung Otonan ↗</a></div>',
    '<section class="lintang-portrait"><div><small>Palelintangan · Lintang ' + (position + 1) + ' dari 35</small>',
    '<h2>' + esc(cell.lintang) + '</h2><div class="script" lang="ban-Bali">' + esc(cell.lintangAksara) + '</div>',
    '<p>' + esc(story.motif) + ' · ' + esc(cell.saptawara) + ' × ' + esc(cell.pancawara) + '</p></div>',
    '<div class="lintang-art" role="img" aria-label="Ilustrasi modern motif ' + esc(story.motif) + ', bukan gambar lontar asli"><span class="lintang-emblem" aria-hidden="true">' + esc(story.emblem) + '</span><strong>' + esc(story.motif) + '</strong></div></section>',
    '<div class="lintang-chips"><span>Saptawara: ' + esc(cell.saptawara) + '</span><span>Pancawara: ' + esc(cell.pancawara) + '</span><span>Urip: ' + cell.saptawaraUrip + ' + ' + cell.pancawaraUrip + ' = ' + cell.urip + '</span><span>Pelindung: ' + esc(cell.patron) + '</span></div>',
    '<section><h2>Mengenal Lintang ' + esc(cell.lintang) + '</h2>',
    '<div class="lintang-features"><article><h3>Nama dan gambar</h3><p>' + esc(story.meaning) + '</p></article>',
    '<article><h3>Cerita budaya di balik motif</h3><p>' + esc(story.heritage) + '</p></article></div>',
    '<div class="lintang-inquiry"><small>Renungan untuk pengunjung · bukan ramalan</small><p>' + esc(story.question) + '</p></div></section>',
    '<section><h2>Kisah lain dalam tema ' + esc(theme.title.toLowerCase()) + '</h2><p>' + esc(theme.description) + ' Berikut beberapa lintang yang bisa dibaca berdampingan untuk mengenali perbedaan motifnya.</p><div class="lintang-next">',
    companions.map((name) => {
      const s = LINTANG_STORIES[lintangSlug(name)];
      return '<a href="' + BP + '/palelintangan/' + lintangSlug(name) + '"><span style="display:block;font-size:1.6rem">' + esc(s.emblem) + '</span>' + esc(name) + '<small>' + esc(s.motif) + '</small></a>';
    }).join(""), '</div></section>',
    '<section><h2>Nama dalam naskah dan koleksi</h2><p>Selain bentuk ' + esc(cell.lintang) + ', terdapat penyebutan lain: <strong>' + esc(story.variants) + '</strong>. Sebutan dapat berbeda menurut naskah, daerah, dan tradisi lukisan. Aksara Bali di atas mengikuti bentuk yang dipakai dalam tabel rujukan.</p>',
    '<p>Lintang ini berada pada pertemuan <strong>' + esc(cell.saptawara) + '</strong> (' + esc(SAPTAWARA_AKSARA[cell.saptawara]) + ') dan <strong>' + esc(cell.pancawara) + '</strong>, dengan patron hari <strong>' + esc(cell.patron) + '</strong>. Dalam bagan 35 hari, kombinasi yang sama muncul tiap 35 hari; untuk Otonan, Wuku dan siklus penuh 210 hari tetap diperhitungkan tersendiri.</p></section>',
    '<section><h2>Tanggal ' + esc(cell.saptawara) + ' ' + esc(cell.pancawara) + ' berikutnya</h2><p>Pilih tanggal untuk melihat Wuku, Wewaran, Ingkel dan peristiwa Pawukon hari tersebut.</p><div class="lintang-next">',
    upcoming.map((iso) => '<a href="' + BP + '/' + iso + '">' + esc(formatDate(iso)) + '<small>' + esc(pawukon(isoToJdn(iso)).wuku.name) + '</small></a>').join(""),
    '</div><p class="note">Deret tanggal dihitung dari siklus 7 × 5 hari, bukan ramalan ataupun jadwal ritual.</p></section>',
    '<section><h2>Jelajahi 35 Lintang</h2><div class="lintang-browse"><a href="' + BP + '/palelintangan/' + lintangSlug(prev.lintang) + '">← ' + esc(prev.lintang) + '</a><a href="' + BP + '/palelintangan/' + lintangSlug(next.lintang) + '">' + esc(next.lintang) + ' →</a></div><div class="lintang-directory">' + directory + '</div></section>',
    '<details class="lintang-sources"><summary>Catatan bacaan dan sumber budaya</summary><div><p>Nama dan kombinasi diambil dari tabel Palelintangan yang didokumentasikan dalam kajian All Skies Encyclopaedia. Ragam gambar, watak, dan ejaan tidak selalu identik antarnaskah. Ilustrasi simbol di halaman ini dibuat sebagai penanda modern, bukan reproduksi karya adat atau penetapan karakter kelahiran.</p>',
    '<p><a href="' + ALL_SKIES + '" rel="noopener nofollow">Daftar lintang dan varian ejaan</a> · <a href="' + MUSEUM + '" rel="noopener nofollow">Lukisan kalender: Australian Museum</a> · <a href="' + AGSA + '" rel="noopener nofollow">Kalender bintang: Art Gallery of South Australia</a></p></div></details>'
  ].join("");
  return {
    status: 200, maxAge: "midnight", tz: "Asia/Makassar", indexable: true,
    html: page({
      site: ctx.site, path: currentPath, lang: "id",
      title: "Lintang " + cell.lintang + ": Arti, Aksara Bali & Hari " + cell.saptawara + " " + cell.pancawara + " | Palelintangan",
      description: "Mengenal Lintang " + cell.lintang + ": " + story.motif + ", kombinasi " + cell.saptawara + " " + cell.pancawara + ", arti nama, variasi naskah, Aksara Bali dan tanggal berikutnya.",
      h1: "Lintang " + esc(cell.lintang) + " dalam Palelintangan Bali",
      sub: esc(story.motif) + " · " + esc(cell.saptawara) + " " + esc(cell.pancawara),
      crumbs: [{href: BP, label: "Kalender Bali"}, {href: BP + "/palelintangan", label: "35 Lintang"}, {href: currentPath, label: cell.lintang}],
      indexable: true,
      schema: [{
        "@context": "https://schema.org", "@type": "Article", headline: "Lintang " + cell.lintang + " — " + story.motif,
        mainEntityOfPage: ctx.site + currentPath, inLanguage: "id",
        about: [{ "@type": "Thing", name: "Palelintangan Bali" }, { "@type": "Thing", name: cell.lintang }],
        isAccessibleForFree: true
      }],
      body,
      footer: '<p class="note">Palelintangan adalah warisan budaya pembacaan hari, bukan kepastian nasib. Untuk upacara atau tafsir keluarga, ikuti pemangku dan adat setempat.</p>',
      ...(ctx.flags.baliPwa ? {pwa: {manifest: "/bali-calendar/manifest.webmanifest", appName: "Bali Calendar", script: "/bali-calendar/pwa.js"}} : {})
    })
  };
}
