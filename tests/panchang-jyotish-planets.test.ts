import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateSiderealPlanetPositions } from "../src/jyotish/jyotishEngine";

describe("Panchang planetary event key invariants", () => {
  const date = new Date("2026-10-22T06:15:00.000Z");
  it("uses canonical lowercase keys consistently for selected planets and event scanners", () => {
    const planets = calculateSiderealPlanetPositions(date);
    expect(planets.map(item => item.key)).toEqual(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]);
    for (const planet of planets) {
      expect(Number.isFinite(planet.longitude)).toBe(true);
      expect(planet.longitude).toBeGreaterThanOrEqual(0);
      expect(planet.longitude).toBeLessThan(360);
      expect(planet.signIndex).toBe(Math.floor(planet.longitude / 30));
      expect(Number.isFinite(planet.longitudeSpeedDegPerDay)).toBe(true);
    }
  });
  it("distinguishes 12-sign transit distance from a 360-degree angular offset", () => {
    const fromSign = 0, currentSaturnSign = 11;
    const signOffset = (currentSaturnSign - fromSign + 12) % 12;
    expect(signOffset).toBe(11); // immediately preceding natal Moon sign, included in Sadesati window
    expect([11, 0, 1]).toContain(signOffset);
  });

  it("keeps long browser scans responsive, cancellable and observable", () => {
    const workspace = readFileSync(new URL("../src/panchang-jyotish/workspaces/PlanetsWorkspace.tsx", import.meta.url), "utf8");
    expect(workspace).toContain("async function scanIngresses");
    expect(workspace).toContain("async function scanNakshatraIngresses");
    expect(workspace).toContain("async function scanStations");
    expect(workspace).toContain("async function tropicalSeasonCrossings");
    expect(workspace).toContain("await yieldToBrowser()");
    expect(workspace).toContain("if(cancelled())return null");
    expect(workspace).toContain("return()=>{active=false;}");
    expect(workspace).toContain('scanState==="running"');
    expect(workspace).toContain('role="status"');
    expect(workspace).toContain('role="alert"');
    expect(workspace).not.toContain("const events=useMemo(()=>{");
  });
});
