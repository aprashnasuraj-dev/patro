import { describe, expect, it } from "vitest";
import { routeFeatureCollection, routeGeoJson, routeGpx, routeKml } from "../scripts/explore/nepal/map/export-core.mjs";

const input = {
  from: { lat: 27.7, lng: 85.3, label: "A & Start" },
  to: { lat: 27.8, lng: 85.4, label: "B < End" },
  stops: [{ lat: 27.75, lng: 85.35, label: "Temple, Stop" }],
  places: [],
  route: {
    distance: 1234,
    duration: 600,
    geometry: { type: "LineString", coordinates: [[85.3,27.7],[85.35,27.75],[85.4,27.8]] },
  },
};

describe("Nepal route exports", () => {
  it("emits attributed GeoJSON from the canonical route model", () => {
    const fc = routeFeatureCollection(input);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.properties.attribution).toContain("OpenStreetMap");
    expect(fc.features[0].properties.role).toBe("route");
    expect(JSON.parse(routeGeoJson(input)).features).toHaveLength(4);
  });

  it("emits GPX 1.1 with escaped names and ODbL license", () => {
    const xml = routeGpx(input);
    expect(xml).toContain('version="1.1"');
    expect(xml).toContain("A &amp; Start");
    expect(xml).toContain("Temple\, Stop".replace("\\,", ","));
    expect(xml).toContain("opendatacommons.org/licenses/odbl/1-0");
    expect(xml).toContain("<trkseg>");
  });

  it("emits KML with route and escaped placemarks", () => {
    const xml = routeKml(input);
    expect(xml).toContain('xmlns="http://www.opengis.net/kml/2.2"');
    expect(xml).toContain("B &lt; End");
    expect(xml).toContain("<LineString>");
    expect(xml).toContain("OpenStreetMap contributors");
  });
});
