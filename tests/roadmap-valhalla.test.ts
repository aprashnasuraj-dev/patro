import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

describe("first-party Nepal Valhalla deployment contract", () => {
  it("pins a dated Geofabrik Nepal snapshot instead of latest", () => {
    const source = JSON.parse(read("infra/nepal-routing/source-manifest.json"));
    expect(source.file_name).toBe("nepal-261028.osm.pbf");
    expect(source.url).toContain("/nepal-261028.osm.pbf");
    expect(source.url).not.toContain("latest");
    expect(source.expected_bytes).toBe(414755998);
    expect(source.osm_data_timestamp).toBe("2026-10-28T21:21:02Z");
  });

  it("keeps raw Valhalla loopback-only and uses local release data", () => {
    const compose = read("infra/nepal-routing/docker-compose.yml");
    expect(compose).toContain("127.0.0.1:");
    expect(compose).toContain("VALHALLA_DATA_DIR");
    expect(compose).not.toContain("nepal-latest.osm.pbf");
    expect(compose).not.toContain("tile_urls:");
  });

  it("requires bearer auth before route and health proxying", () => {
    const caddy = read("infra/nepal-routing/Caddyfile");
    expect(caddy).toContain('Authorization "Bearer {$NEPAL_ROUTING_TOKEN}"');
    expect(caddy).toContain("respond @unauthorized 401");
    expect(caddy).toContain("handle /route");
    expect(caddy).toContain("handle /healthz");
    expect(caddy).not.toMatch(/Access-Control-Allow-Origin/i);
  });

  it("has geographically diverse route, multistop and detour fixtures", () => {
    const spec = JSON.parse(read("infra/nepal-routing/fixtures/routes.json"));
    const regions = new Set(spec.fixtures.map((x: any) => x.region));
    for (const required of ["Terai","Kathmandu Valley","Hill road","Mountain road","Himalayan trek","Multi-stop","Detour"]) {
      expect(regions.has(required)).toBe(true);
    }
    expect(spec.fixtures.some((x: any) => x.kind === "route" && x.points?.length >= 3)).toBe(true);
    expect(spec.fixtures.some((x: any) => x.kind === "detour" && x.via_points?.length >= 3)).toBe(true);
  });

  it("makes promotion explicit and retains rollback state", () => {
    const promote = read("infra/nepal-routing/promote-release.sh");
    expect(promote).toContain('$DATA/previous');
    expect(promote).toContain("health_or_revert");
    expect(promote).toContain("promote)");
    expect(promote).toContain("rollback)");
  });

  it("switches route attribution to self-hosted Valhalla when that provider is selected", () => {
    const build = read("scripts/explore/nepal/build-map.mjs");
    expect(build).toContain('ROUTING_PROVIDER === "valhalla-first-party"');
    expect(build).toContain("self-hosted <a href=\"https://valhalla.github.io/valhalla/\"");
    expect(build).toContain("FOSSGIS</a> servers");
  });
});
