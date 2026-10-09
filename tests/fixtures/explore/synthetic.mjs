// Load-test adapter: SYNTHETIC_PAGES (default 2,010,101) pages in a 4-level tree. Test-only; never deployed.
export const id = "synthetic";
export async function* records() {
  const L1 = 100, L2 = 100, L3 = Number(process.env.SYNTHETIC_LEAVES || 200);
  const facts = (n) => [1, 2, 3, 4, 5].map((k) => ({ label: `Fact ${k}`, label_ne: `तथ्य ${k}`, value: `${n * k}`, value_ne: `${n * k}` }));
  const page = (path, parent, n, title) => ({ path, parent, sort: n, title, title_ne: `${title} ने`, description: `${title}: synthetic page number ${n} used to prove the explore build and Worker scale to millions of URLs.`, summary: `Summary for ${title}.`, facts: facts(n), lastmod: "2026-10-09", source_name: "synthetic" });
  yield page("/synthetic-load", null, 0, "Load test root");
  for (let a = 0; a < L1; a++) {
    const pa = `/synthetic-load/a${a}`;
    yield page(pa, "/synthetic-load", a, `Group ${a}`);
    for (let b = 0; b < L2; b++) {
      const pb = `${pa}/b${b}`;
      yield page(pb, pa, b, `Group ${a}.${b}`);
      for (let c = 0; c < L3; c++) yield page(`${pb}/c${c}`, pb, c, `Leaf ${a}.${b}.${c}`);
    }
  }
}
