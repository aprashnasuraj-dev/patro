import { describe, expect, it } from "vitest";
import { computeTantraTime } from "../src/patro-tools/core/tantra/engine";
import { PANCHA_TATWAS, YOGINI_NIVAS, yoginiForTithi } from "../src/patro-tools/core/tantra/constants";

const at = (minute: number) => new Date(Date.parse("2026-10-20T06:00:00.000Z") + minute * 60_000);

describe("Tantra Vidya chronometry", () => {
  it("maps the requested forward/reverse Nitya sequence", () => {
    expect(computeTantraTime(1, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Kameshvari");
    expect(computeTantraTime(15, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Chitra");
    expect(computeTantraTime(16, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Chitra");
    expect(computeTantraTime(30, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Kameshvari");
    expect(computeTantraTime(16, at(0), at(0), at(720), at(1440)).paksha).toBe("Krishna");
  });

  it("uses a named eight-Yogini direction table on both pakshas", () => {
    expect(YOGINI_NIVAS).toHaveLength(8);
    expect(yoginiForTithi(1)).toMatchObject({ name: "Mangala", direction: "North", tithis: [1, 9] });
    expect(yoginiForTithi(9).name).toBe("Mangala");
    expect(yoginiForTithi(15).name).toBe("Siddha");
    expect(computeTantraTime(16, at(0), at(0), at(720), at(1440)).yogini.name).toBe("Mangala");
    expect(computeTantraTime(23, at(0), at(0), at(720), at(1440)).yogini.name).toBe("Sankata");
    expect(() => yoginiForTithi(16)).toThrow("invalid_tithi_within_paksha");
  });

  it("advances through five 24-minute Tatwas and reports the active window", () => {
    const result = computeTantraTime(4, at(49), at(0), at(720), at(1440));
    expect(result.activeTatwa.id).toBe("tejas");
    expect(result.tatwaElapsedMinutes).toBe(1);
    expect(result.tatwaRemainingMinutes).toBe(23);
    expect(result.tatwaWindow.start).toBe(at(48).toISOString());
    expect(result.tatwaWindow.end).toBe(at(72).toISOString());
    expect(PANCHA_TATWAS).toHaveLength(5);
  });

  it("uses a repeatable cycle before sunrise and identifies approximate Mahanisha", () => {
    const result = computeTantraTime(8, at(-1), at(0), at(720), at(1440));
    expect(result.tatwaRemainingMinutes).toBe(1);
    expect(result.mahanishaKaal.start).toBe(at(1056).toISOString());
    expect(result.mahanishaKaal.end).toBe(at(1104).toISOString());
    expect(result.mahanishaKaal.isActive).toBe(false);
    expect(computeTantraTime(8, at(1080), at(0), at(720), at(1440)).mahanishaKaal.isActive).toBe(true);
  });

  it("rejects invalid tithis and impossible solar event order", () => {
    expect(() => computeTantraTime(0, at(0), at(0), at(720), at(1440))).toThrow("invalid_tithi");
    expect(() => computeTantraTime(31, at(0), at(0), at(720), at(1440))).toThrow("invalid_tithi");
    expect(() => computeTantraTime(1, at(0), at(0), at(0), at(1440))).toThrow("invalid_solar_window");
    expect(() => computeTantraTime(1, new Date("invalid"), at(0), at(720), at(1440))).toThrow("invalid_currentDate");
  });
});
