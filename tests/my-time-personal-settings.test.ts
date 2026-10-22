import { describe, expect, it } from "vitest";
import { DEFAULT_MY_TIME_PERSONAL_SETTINGS, MY_TIME_PERSONAL_KEY, normalizeMyTimePersonalSettings, readMyTimePersonalSettings, saveMyTimePersonalSettings } from "../src/features/my-time/my-time-personal-settings";

describe("My Time view preferences migration", () => {
  it("keeps only working view settings, never dead alerts", () => {
    const settings = normalizeMyTimePersonalSettings({ setupComplete: true, lens: "scientific", interests: ["study", "invalid"], notifications: { savedEvents: true }, savedEvents: [{ title: "old" }] });
    expect(settings).toEqual({ setupComplete: true, lens: "scientific", interests: ["study"] });
    expect("notifications" in settings).toBe(false);
    expect("savedEvents" in settings).toBe(false);
  });
  it("normalizes invalid input without sharing the default interests array", () => {
    const first = normalizeMyTimePersonalSettings(null);
    expect(first).toEqual(DEFAULT_MY_TIME_PERSONAL_SETTINGS);
    first.interests.push("travel");
    expect(normalizeMyTimePersonalSettings(null).interests).toEqual(["general"]);
    expect(normalizeMyTimePersonalSettings({ lens:"unknown", interests:[] })).toMatchObject({lens:"universal",interests:["general"]});
  });
  it("reads a legacy persisted payload and writes a clean compatible view", () => {
    const data = new Map<string,string>([[MY_TIME_PERSONAL_KEY,JSON.stringify({lens:"panchang",interests:["work"],setupComplete:true,notifications:{timingWindows:true},savedEvents:[{title:"legacy"}]})]]);
    const storage = {getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};
    const view = readMyTimePersonalSettings(storage);
    saveMyTimePersonalSettings(view,storage);
    expect(JSON.parse(data.get(MY_TIME_PERSONAL_KEY)!)).toEqual({setupComplete:true,lens:"panchang",interests:["work"]});
  });
});
