import test from "node:test";
import assert from "node:assert/strict";
import {
  JANMAPATRO_MAX_SHARE_BYTES,
  createJanmaPatroShareHash,
  createJanmaPatroShareUrl,
  decodeJanmaPatroShareState,
  encodeJanmaPatroShareState,
  readJanmaPatroShareState,
} from "../packages/engine/src/share-state.js";

const sample = {
  mode: "milan",
  language: "ne",
  primary: {
    name: "राम प्रसाद",
    date: "1994-06-18",
    time: "07:42",
    place: "काठमाडौं",
    latitude: 27.7172,
    longitude: 85.324,
    timezone: "+05:45",
  },
  partner: {
    name: "सीता",
    date: "1996-03-02",
    time: "16:15",
    place: "पोखरा",
    latitude: 28.2096,
    longitude: 83.9856,
    timezone: "+05:45",
  },
};

test("Janma Patro share state round-trips Unicode without storage", () => {
  const token = encodeJanmaPatroShareState(sample);
  const decoded = decodeJanmaPatroShareState(token);
  assert.equal(decoded.mode, "milan");
  assert.equal(decoded.primary.name, "राम प्रसाद");
  assert.equal(decoded.partner.place, "पोखरा");
});

test("share tokens are deterministic regardless of object insertion order", () => {
  const a = encodeJanmaPatroShareState({ z: 2, a: { y: true, x: "नेपाली" } });
  const b = encodeJanmaPatroShareState({ a: { x: "नेपाली", y: true }, z: 2 });
  assert.equal(a, b);
});

test("share URL stores personal input only in the fragment", () => {
  const url = createJanmaPatroShareUrl("https://aafnaipatro.com/janmapatro/", sample);
  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/janmapatro/");
  assert.equal(parsed.search, "");
  assert.match(parsed.hash, /^#jp=v1\./);
  assert.deepEqual(JSON.parse(JSON.stringify(readJanmaPatroShareState(url))), sample);
});

test("raw share hash can be restored client-side", () => {
  const hash = createJanmaPatroShareHash({ mode: "janma", name: "सुरज" });
  assert.deepEqual(JSON.parse(JSON.stringify(readJanmaPatroShareState(hash))), { mode: "janma", name: "सुरज" });
});

test("malformed, version-mismatched and unsafe values fail closed", () => {
  assert.throws(() => decodeJanmaPatroShareState("garbage"), /invalid_share_token/);
  assert.throws(() => decodeJanmaPatroShareState("v2.e30"), /unsupported_share_version/);
  assert.throws(() => encodeJanmaPatroShareState({ value: Number.NaN }), /non_finite/);
  assert.throws(() => encodeJanmaPatroShareState({ value: undefined }), /non_json/);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => encodeJanmaPatroShareState(cyclic), /cycle/);
});

test("oversized personal payloads are rejected before a share URL is produced", () => {
  const value = "क".repeat(JANMAPATRO_MAX_SHARE_BYTES);
  assert.throws(() => encodeJanmaPatroShareState({ value }), /too_large|string_too_long/);
});
