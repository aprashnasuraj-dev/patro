import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from '../dist/core.js';
const {chains}=JSON.parse(readFileSync(new URL('../examples/fixtures.json',import.meta.url),'utf8'));
const chain=(type)=>chains[type].join('');
for(const type of ['rsa','ec','ed','pss']){
 test(`${type}: chain with two valid signatures is ORDER_VERIFIED`,async()=>{
  const r=await transform({chain:chain(type)});
  assert.equal(r.status,'ORDER_VERIFIED');assert.equal(r.certificates.length,3);
  assert.equal(r.links.length,2);assert.ok(r.links.every(l=>l.signatureVerified&&l.caAuthorized&&l.dnMatched));
  assert.match(r.warnings.join(' '),/NOT established|NOT|not established/i);
 });
}
test('tampered leaf signature is rejected',async()=>{
 const r=await transform({chain:chain('rsa_bad_signature')});
 assert.equal(r.status,'LINK_FAILED');assert.equal(r.links[0].signatureVerified,false);
});
test('issuer lacking CA authorization is rejected even if signature verifies',async()=>{
 const r=await transform({chain:chain('rsa_invalid_ca')});assert.equal(r.status,'LINK_FAILED');
 assert.equal(r.links[0].signatureVerified,true);assert.equal(r.links[0].caAuthorized,false);
});
test('reordered PEM reports incorrect order, no verified success',async()=>{
 const r=await transform({chain:chain('rsa_reverse')});assert.equal(r.status,'ORDER_INCORRECT');assert.ok(r.links.some(p=>!p.dnMatched));
});
test('single certificate reports insufficient ordering evidence',async()=>{
 const r=await transform({chain:chains.rsa[0]});assert.equal(r.status,'INCOMPLETE');assert.equal(r.links.length,0);
});
test('expired-at-inspection is disclosed without falsely labeling browser trust',async()=>{
 const r=await transform({chain:chain('rsa'),at:'2040-01-01T00:00:00Z'});
 assert.equal(r.certificates[0].validNow,false);assert.match(r.warnings.join(' '),/not valid/);
});
test('private key blocks are rejected',async()=>{
 await assert.rejects(transform({chain:chain('rsa')+'\n-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----'}),/only CERTIFICATE|Invalid PEM/);
});
test('whitespace is permitted but stray text is rejected',async()=>{
 const x=chain('ed').replaceAll('\n','\r\n');assert.equal((await transform({chain:x})).status,'ORDER_VERIFIED');
 await assert.rejects(transform({chain:'leading text\n'+chain('rsa')}),/Only CERTIFICATE/);
});
test('bogus base64 and malformed DER are rejected',async()=>{
 await assert.rejects(transform({chain:'-----BEGIN CERTIFICATE-----\n!!!\n-----END CERTIFICATE-----'}),/Invalid PEM|Malformed PEM/);
 await assert.rejects(transform({chain:'-----BEGIN CERTIFICATE-----\nAQIDBA==\n-----END CERTIFICATE-----'}),/DER|ASN.1/);
});
test('certificate count and input size bounds are enforced',async()=>{
 await assert.rejects(transform({chain:chains.rsa[0].repeat(21)}),/Maximum 20/);
 await assert.rejects(transform({chain:'x'.repeat(512001)}),/512,000/);
});
test('malformed date rejected',async()=>{
 await assert.rejects(transform({chain:chain('rsa'),at:'not-a-date'}),/Invalid inspection date/);
});
test('output contains a cryptographic fingerprint, not a trust assertion',async()=>{
 const r=await transform({chain:chain('ec')});
 assert.match(r.text,/SHA-256: ([A-F0-9]{2}:){31}[A-F0-9]{2}/);
 assert.match(r.warnings.join('\n'),/trust store/);
});
test('no processing when input is absent',async()=>{
 await assert.rejects(transform({chain:''}),/Paste a PEM/);
});
test('RFC 5280 pathLenConstraint rejects subordinate non-self-issued CA',async()=>{
 const r=await transform({chain:chain('rsa_pathlen_violation')});assert.equal(r.status,'LINK_FAILED');
 assert.match(r.warnings.join(' '),/pathLenConstraint 0 exceeded/);
});
test('unknown critical certificate extension prevents VERIFIED result',async()=>{
 const r=await transform({chain:chain('unknown_critical')});assert.equal(r.status,'UNSUPPORTED');
 assert.match(r.warnings.join(' '),/unsupported critical extension/);
});
test('repeated public certificates cannot exceed 20',async()=>{
 const r=chains.ed[0].repeat(20);await assert.rejects(transform({chain:r+'\n'+chains.ed[0]}),/Maximum 20/);
});
