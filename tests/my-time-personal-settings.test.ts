import { describe, expect, it } from "vitest";
import {
  DEFAULT_MY_TIME_PERSONAL_SETTINGS,
  isWithinQuietHours,
  normalizeMyTimePersonalSettings,
  readMyTimePersonalSettings,
  saveMyTimePersonalSettings
} from "../src/features/my-time/my-time-personal-settings";

describe("My Time personal settings", () => {
  it("starts with an optional universal setup and all notifications off", () => {
    const value = normalizeMyTimePersonalSettings(null);
    expect(value.setupComplete).toBe(false);
    expect(value.lens).toBe("universal");
    expect(value.interests).toEqual(["general"]);
    expect(Object.values(value.notifications).filter(v => typeof v === "boolean")).toEqual([false, false, false, false]);
  });

  it("normalizes unsupported values and validates quiet-hour clocks", () => {
    const value = normalizeMyTimePersonalSettings({
      setupComplete: true, lens: "secret", interests: ["travel", "not-real"],
      notifications: { tithiTransitions: true, quietStart: "25:99", quietEnd: "06:30", frequency: "many" }
    });
    expect(value).toMatchObject({
      setupComplete: true, lens: "universal", interests: ["travel"],
      notifications: { tithiTransitions: true, quietStart: "22:00", quietEnd: "06:30", frequency: "important" }
    });
  });

  it("keeps saved events valid, bounded, and timestamp-normalized", () => {
    const events = Array.from({ length: 55 }, (_, i) => ({ id: String(i), title: "Event " + i, at: "2026-10-21T10:00:00.000Z" }));
    const value = normalizeMyTimePersonalSettings({ savedEvents: events });
    expect(value.savedEvents).toHaveLength(50);
    expect(value.savedEvents[0].id).toBe("5");
    expect(value.savedEvents[0].at).toBe("2026-10-21T10:00:00.000Z");
  });

  it("persists settings through a supplied storage adapter", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); }
    };
    saveMyTimePersonalSettings({ ...DEFAULT_MY_TIME_PERSONAL_SETTINGS, setupComplete: true, lens: "scientific" }, storage);
    expect(readMyTimePersonalSettings(storage)).toMatchObject({ setupComplete: true, lens: "scientific" });
  });

  it("respects quiet hours including ranges that cross midnight in the chosen timezone", () => {
    expect(isWithinQuietHours(new Date("2026-10-20T16:00:00.000Z"), "Asia/Kathmandu", "22:00", "07:00")).toBe(true);
    expect(isWithinQuietHours(new Date("2026-10-20T05:00:00.000Z"), "Asia/Kathmandu", "22:00", "07:00")).toBe(false);
    expect(isWithinQuietHours(new Date("2026-10-20T12:00:00.000Z"), "Asia/Kathmandu", "22:00", "07:00")).toBe(false);
  });
});
