import { describe, expect, it } from "vitest";
import { computeTantraTime } from "../src/patro-tools/core/tantra/engine";
import { NITYA_DEVIS, PANCHA_TATWAS, YOGINI_POSITIONS } from "../src/patro-tools/core/tantra/constants";

const at = (minute: number) => new Date(Date.parse("2026-10-20T06:00:00.000Z") + minute * 60_000);

describe("Tantra Vidya chronometry", () => {
  it("maps Shukla and Krishna tithis to the forward/reverse Nitya sequence", () => {
    expect(computeTantraTime(1, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Kameshvari");
    expect(computeTantraTime(15, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Chitra");
    expect(computeTantraTime(16, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Chitra");
    expect(computeTantraTime(30, at(0), at(0), at(720), at(1440)).nityaDevi.name).toBe("Kameshvari");
    expect(computeTantraTime(16, at(0), at(0), at(720), at(1440)).paksha).toBe("Krishna");
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

  it("uses a repeatable cycle before sunrise and identifies Mahanisha window", () => {
    const result = computeTantraTime(8, at(-1), at(0), at(720), at(1440));
    expect(result.tatwaRemainingMinutes).toBe(1);
    expect(result.mahanishaKaal.start).toBe(at(696).toISOString());
    expect(result.mahanishaKaal.end).toBe(at(744).toISOString());
    expect(result.mahanishaKaal.isActive).toBe(false);
    expect(computeTantraTime(8, at(720), at(0), at(720), at(1440)).mahanishaKaal.isActive).toBe(false);
    expect(computeTantraTime(8, at(720), at(0), at(720), at(1440)).yoginiDirection).toBe(YOGINI_POSITIONS[8]);
  });

  it("rejects invalid tithis and impossible solar event order", () => {
    expect(() => computeTantraTime(0, at(0), at(0), at(720), at(1440))).toThrow("invalid_tithi");
    expect(() => computeTantraTime(31, at(0), at(0), at(720), at(1440))).toThrow("invalid_tithi");
    expect(() => computeTantraTime(1, at(0), at(0), at(0), at(1440))).toThrow("invalid_solar_window");
    expect(() => computeTantraTime(1, new Date("invalid"), at(0), at(720), at(1440))).toThrow("invalid_currentDate");
  });
});
