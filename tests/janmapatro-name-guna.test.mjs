import test from "node:test";
import assert from "node:assert/strict";
import { calculateNameGuna, profileFromName } from "../packages/engine/src/name-guna.js";

test("name-mode Guna Milan reproduces the validated राम × सीता reference",()=>{
  const a=profileFromName("राम");
  const b=profileFromName("सीता");
  assert.equal(a.nakshatraEn,"Chitra");
  assert.equal(a.pada,3);
  assert.equal(a.syllable,"रा");
  assert.equal(b.nakshatraEn,"Shatabhisha");
  assert.equal(b.pada,3);
  assert.equal(b.syllable,"सी");
  const result=calculateNameGuna("राम","सीता");
  assert.equal(result.total,26);
  assert.equal(result.max,36);
  assert.equal(result.items.length,8);
});

test("name profiles reject unsupported starting syllables instead of inventing a result",()=>{
  assert.throws(()=>profileFromName("XYZ"),/name_syllable_not_mapped/);
});
