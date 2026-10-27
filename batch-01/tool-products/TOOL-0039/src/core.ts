/** Offline X.509 certificate ordering inspection. Not RFC 5280 trust-path validation. */
export type Outcome = 'ORDER_VERIFIED'|'ORDER_INCORRECT'|'LINK_FAILED'|'INCOMPLETE'|'UNSUPPORTED';
export interface CertificateSummary {
  position: number; subject: string; issuer: string; notBefore: string; notAfter: string;
  isCA: boolean; pathLen: number | null; signatureAlgorithm: string; fingerprintSHA256: string;
  validNow: boolean; keyCertSign: boolean | null;
}
export interface PairResult {child: number; issuer: number; dnMatched: boolean; signatureVerified: boolean; caAuthorized: boolean; detail: string;}
export interface ChainResult { heading: string; text: string; warnings: string[]; status: Outcome;
  certificates: CertificateSummary[]; links: PairResult[]; suggestedOrder: number[] | null; }
interface TLV {tag:number; start:number; body:number; end:number;}
interface Alg {oid:string; params?:TLV; bytes:Uint8Array;}
interface Cert {raw:Uint8Array;tbs:Uint8Array;spki:Uint8Array;spkiAlg:Alg;
 sig:Uint8Array;sigAlg:Alg;subjectDer:Uint8Array;issuerDer:Uint8Array; subject:string;issuer:string;
 notBefore:Date;notAfter:Date; isCA:boolean;pathLen:number|null;keyCertSign:boolean|null;
 unknownCritical:string[];aki?:Uint8Array;ski?:Uint8Array;}
const O={rsa:'1.2.840.113549.1.1.1',pss:'1.2.840.113549.1.1.10',ecdsa:'1.2.840.10045.2.1',ed:'1.3.101.112',mgf1:'1.2.840.113549.1.1.8',sha1:'1.3.14.3.2.26',sha256:'2.16.840.1.101.3.4.2.1',sha384:'2.16.840.1.101.3.4.2.2',sha512:'2.16.840.1.101.3.4.2.3'};
const hashes:Record<string,string>={[O.sha1]:'SHA-1',[O.sha256]:'SHA-256',[O.sha384]:'SHA-384',[O.sha512]:'SHA-512'};
const signatures:Record<string,{name:string,hash:string}>= {
 '1.2.840.113549.1.1.5':{name:'RSASSA-PKCS1-v1_5',hash:'SHA-1'},
 '1.2.840.113549.1.1.11':{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},
 '1.2.840.113549.1.1.12':{name:'RSASSA-PKCS1-v1_5',hash:'SHA-384'},
 '1.2.840.113549.1.1.13':{name:'RSASSA-PKCS1-v1_5',hash:'SHA-512'},
 '1.2.840.10045.4.1':{name:'ECDSA',hash:'SHA-1'},
 '1.2.840.10045.4.3.2':{name:'ECDSA',hash:'SHA-256'},
 '1.2.840.10045.4.3.3':{name:'ECDSA',hash:'SHA-384'},
 '1.2.840.10045.4.3.4':{name:'ECDSA',hash:'SHA-512'}
};
const curves:Record<string,{name:string,bytes:number}> = {'1.2.840.10045.3.1.7':{name:'P-256',bytes:32},'1.3.132.0.34':{name:'P-384',bytes:48},'1.3.132.0.35':{name:'P-521',bytes:66}};
function assert(x:unknown, message:string): asserts x {if(!x)throw new Error(message);}
function equal(a:Uint8Array,b:Uint8Array){return a.length===b.length && a.every((v,i)=>v===b[i]);}
function part(b:Uint8Array,n:TLV){return b.slice(n.body,n.end);}
function full(b:Uint8Array,n:TLV){return b.slice(n.start,n.end);}
function tlv(b:Uint8Array,offset:number,limit=b.length):TLV {
 assert(offset>=0&&offset+2<=limit,'Truncated DER field');const start=offset,tag=b[offset++];
 assert((tag&31)!==31,'High-tag-number ASN.1 unsupported');let size=b[offset++];
 if(size>=128){const k=size&127;assert(k>0&&k<=4&&offset+k<=limit,'Indefinite or oversized DER length');
   assert(b[offset]!==0,'Non-minimal DER length');size=0;for(let i=0;i<k;i++)size=size*256+b[offset++];assert(size>=128,'Non-minimal DER long length');}
 assert(size>=0&&offset+size<=limit,'Truncated or overlong DER value');return{tag,start,body:offset,end:offset+size};
}
function kids(b:Uint8Array,n:TLV,tag=0x30):TLV[]{assert(n.tag===tag,'Invalid X.509 ASN.1 structure');const a:TLV[]=[];
 for(let p=n.body;p<n.end;){assert(a.length<300,'Too many ASN.1 fields');const c=tlv(b,p,n.end);a.push(c);p=c.end;}return a;}
function root(b:Uint8Array){const t=tlv(b,0);assert(t.end===b.length,'Trailing DER data');return t;}
function at(k:TLV[],i:number,tag?:number):TLV {assert(k[i],`Missing X.509 field ${i}`);if(tag!==undefined)assert(k[i].tag===tag,`Unexpected ASN.1 tag at field ${i}`);return k[i];}
function oid(b:Uint8Array,n:TLV):string {assert(n.tag===6,'Expected OBJECT IDENTIFIER');const x=part(b,n);assert(x.length>0&&x.length<=64,'Invalid OID');let v=0,arcs:number[]=[];
 for(let i=0;i<x.length;i++){assert(!(v===0&&x[i]===128),'Nonminimal OID encoding');v=v*128+(x[i]&127);assert(Number.isSafeInteger(v),'OID too large');if(!(x[i]&128)){arcs.push(v);v=0;}}
 assert(!(x[x.length-1]&128),'Truncated OID');assert(arcs.length>0,'Empty OID');const n0=arcs.shift()!;return [Math.min(2,Math.floor(n0/40)), n0<80?n0%40:n0-80,...arcs].join('.');}
function alg(b:Uint8Array,n:TLV):Alg {const k=kids(b,n);assert(k.length>=1&&k.length<=2,'Invalid AlgorithmIdentifier');return {oid:oid(b,at(k,0,6)),params:k[1],bytes:full(b,n)};}
function uint(b:Uint8Array,n:TLV,max=65535){assert(n.tag===2,'Expected INTEGER');const v=part(b,n);assert(v.length>0&&v.length<=5&&!(v[0]&128),'Invalid positive ASN.1 integer');
 assert(v.length===1||v[0]!==0||(v[1]&128)!==0,'Nonminimal INTEGER');let value=0;for(const c of v)value=value*256+c;assert(value<=max,'Numeric value exceeds allowed maximum');return value;}
function bits(b:Uint8Array,n:TLV):Uint8Array {assert(n.tag===3,'Expected BIT STRING');const v=part(b,n);assert(v.length>=2&&v[0]===0,'Signature bit string must be octet-aligned');return v.slice(1);}
function decodeText(tag:number,b:Uint8Array):string {try { if(tag===0x1e){assert(b.length%2===0,'Malformed BMPString');let s='';for(let i=0;i<b.length;i+=2)s+=String.fromCharCode((b[i]<<8)|b[i+1]);return s;}return new TextDecoder('utf-8',{fatal:true}).decode(b).replace(/[\u0000-\u001f\u007f]/g,'?');}catch{return '(unreadable DN value)';}}
function displayName(b:Uint8Array,n:TLV):string {const fields:string[]=[];const attrs:Record<string,string>={'2.5.4.3':'CN','2.5.4.10':'O','2.5.4.11':'OU','2.5.4.6':'C','2.5.4.7':'L','2.5.4.8':'ST'};
 for(const rdn of kids(b,n)){for(const entry of kids(b,rdn,0x31)){const a=kids(b,entry);if(a.length!==2)continue;const key=oid(b,a[0]);fields.push(`${attrs[key]||key}=${decodeText(a[1].tag,part(b,a[1]))}`);}}
 return fields.join(', ')||'(empty distinguished name)';}
function utc(b:Uint8Array,n:TLV):Date {assert(n.tag===0x17||n.tag===0x18,'Unsupported X.509 time tag');const v=new TextDecoder('ascii').decode(part(b,n));let year,mon,day,h,m,s;
 if(n.tag===0x17){assert(/^\d{12}Z$/.test(v),'UTCTime must have YYMMDDHHMMSSZ');year=+v.slice(0,2);year+=year>=50?1900:2000;mon=+v.slice(2,4);day=+v.slice(4,6);h=+v.slice(6,8);m=+v.slice(8,10);s=+v.slice(10,12)}
 else{assert(/^\d{14}Z$/.test(v),'GeneralizedTime must have YYYYMMDDHHMMSSZ');year=+v.slice(0,4);mon=+v.slice(4,6);day=+v.slice(6,8);h=+v.slice(8,10);m=+v.slice(10,12);s=+v.slice(12,14)}
 assert(year>=0&&year<=9999&&mon>=1&&mon<=12&&day>=1&&day<=31&&h<24&&m<60&&s<60,'Invalid X.509 time');const d=new Date(0);d.setUTCFullYear(year,mon-1,day);d.setUTCHours(h,m,s,0);assert(d.getUTCFullYear()===year&&d.getUTCMonth()===mon-1&&d.getUTCDate()===day,'Invalid certificate calendar date');return d;}
function hex(b:Uint8Array){return Array.from(b,c=>c.toString(16).padStart(2,'0')).join('');}
function parseCertificate(raw:Uint8Array):Cert {assert(raw.byteLength<=128000,'Certificate exceeds 128 KB DER limit');const k=kids(raw,root(raw));assert(k.length===3,'X.509 certificate must have three fields');const tbs=at(k,0,0x30),outerAlg=alg(raw,at(k,1,0x30));const signed=bits(raw,at(k,2,3));let a=kids(raw,tbs),i=0,version=1;
 if(a[i].tag===0xa0){const v=kids(raw,a[i],0xa0);assert(v.length===1,'Malformed X.509 version');version=uint(raw,v[0],2)+1;i++;}
 const serial=part(raw,at(a,i++,2));assert(serial.length>=1&&serial.length<=21&&!(serial[0]&128),'Invalid certificate serial number');const innerAlg=alg(raw,at(a,i++,0x30));
 assert(equal(innerAlg.bytes,outerAlg.bytes),'Certificate signature algorithm differs from TBS signature algorithm');
 const issuer=at(a,i++,0x30),validity=kids(raw,at(a,i++,0x30)),subject=at(a,i++,0x30),spki=at(a,i++,0x30);
 assert(validity.length===2,'Invalid validity period');const notBefore=utc(raw,validity[0]),notAfter=utc(raw,validity[1]);assert(notAfter>=notBefore,'Certificate validity interval is inverted');
 const spkiDer=full(raw,spki);const pkids=kids(spkiDer,root(spkiDer));assert(pkids.length===2&&pkids[1].tag===3,'Malformed public key');const spkiAlg=alg(spkiDer,pkids[0]);
 let isCA=false,pathLen:number|null=null,keyCertSign:boolean|null=null;const unknownCritical:string[]=[];let aki:Uint8Array|undefined,ski:Uint8Array|undefined;
 let sawExt=false;const extOids=new Set<string>();
 for(;i<a.length;i++){const n=a[i];if(n.tag!==0xa3){assert(n.tag===0x81||n.tag===0x82,'Unknown TBS certificate field');continue;}
 assert(version===3&&!sawExt,'Extensions require X.509 v3 and must appear once');sawExt=true;const wrapper=kids(raw,n,0xa3);assert(wrapper.length===1,'Malformed certificate extensions');
 for(const ex of kids(raw,wrapper[0])){const e=kids(raw,ex);assert(e.length>=2&&e.length<=3,'Malformed extension');const id=oid(raw,at(e,0,6));assert(!extOids.has(id),'Duplicate certificate extension');extOids.add(id);
 const hasCritical=e[1].tag===1;let critical=false;if(hasCritical){const v=part(raw,e[1]);assert(v.length===1&&(v[0]===0||v[0]===255),'Malformed DER boolean');critical=v[0]!==0;}
 const oct=at(e,hasCritical?2:1,4),extensionBytes=part(raw,oct);const node=root(extensionBytes);
 if(id==='2.5.29.19'){const bs=kids(extensionBytes,node);let j=0;if(bs[j]?.tag===1){const v=part(extensionBytes,bs[j++]);assert(v.length===1&&(v[0]===0||v[0]===255),'Invalid basicConstraints boolean');isCA=v[0]===255;}
 if(bs[j])pathLen=uint(extensionBytes,bs[j++],200);assert(j===bs.length,'Invalid basicConstraints structure');assert(pathLen===null||isCA,'pathLen without CA authorization');}
 else if(id==='2.5.29.15'){assert(node.tag===3,'Invalid keyUsage');const v=part(extensionBytes,node);assert(v.length>=2&&v[0]<=7,'Malformed key usage');keyCertSign=!!(v[1]&4);}
 else if(id==='2.5.29.14'){assert(node.tag===4,'Invalid subject key identifier');ski=part(extensionBytes,node);}
 else if(id==='2.5.29.35'){const ac=kids(extensionBytes,node);for(const f of ac)if(f.tag===0x80)aki=part(extensionBytes,f);}
 else if(critical)unknownCritical.push(id);
 }}
 return{raw,tbs:full(raw,tbs),spki:full(raw,spki),spkiAlg, sig:signed,sigAlg:outerAlg,
  subjectDer:full(raw,subject),issuerDer:full(raw,issuer),subject:displayName(raw,subject),issuer:displayName(raw,issuer),
  notBefore,notAfter,isCA,pathLen,keyCertSign,unknownCritical,aki,ski};}
function pem(input:string):Uint8Array[]{assert(input.length<=512000,'PEM input exceeds 512,000 characters');
 const normalized=input.replace(/\r\n?/g,'\n').trim();assert(normalized.length>0,'Paste a PEM certificate chain');
 const re=/-----BEGIN CERTIFICATE-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END CERTIFICATE-----/g;
 const out:Uint8Array[]=[];let last=0,m:RegExpExecArray|null;
 while((m=re.exec(normalized))!==null){assert(!normalized.slice(last,m.index).trim(),'Only CERTIFICATE PEM blocks are accepted; no keys or trailing text');last=re.lastIndex;
 assert(out.length<20,'Maximum 20 certificates');const body=m[1].replace(/\s/g,'');assert(body.length>0&&body.length<175000&&body.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(body),'Malformed PEM base64');
 const bin=atob(body),data=Uint8Array.from(bin,c=>c.charCodeAt(0));assert(btoa(bin)===body,'Noncanonical PEM base64');out.push(data);}
 assert(!normalized.slice(last).trim()&&out.length>0,'Invalid PEM framing or unexpected non-certificate text');return out;}
function decodeSig(sig:Uint8Array,n:number):Uint8Array{const t=root(sig),a=kids(sig,t);assert(a.length===2&&a.every(v=>v.tag===2),'Invalid ECDSA DER signature');
 const joined=new Uint8Array(2*n);a.forEach((v,k)=>{let val=part(sig,v);assert(val.length>0&&!(val[0]&128),'Invalid ECDSA signature integer');while(val.length>1&&val[0]===0)val=val.slice(1);assert(val.length<=n,'ECDSA signature value too wide');joined.set(val,n*k+n-val.length);});return joined;}
function pss(b:Uint8Array,n?:TLV){assert(n&&n.tag===0x30,'RSA-PSS parameters required');const fields=kids(b,n),seen=new Set<number>();let hash='SHA-1',mgf='SHA-1',salt=20,trailer=1;
 for(const item of fields){assert(item.tag>=0xa0&&item.tag<=0xa3&&!seen.has(item.tag),'Invalid or repeated RSA-PSS parameter');seen.add(item.tag);const v=kids(b,item,item.tag);assert(v.length===1,'Malformed RSA-PSS parameter');
 if(item.tag===0xa0){const q=alg(b,v[0]);hash=hashes[q.oid];assert(hash,'Unsupported RSA-PSS digest');}
 if(item.tag===0xa1){const q=alg(b,v[0]);assert(q.oid===O.mgf1&&q.params,'Only MGF1 supported');const t=alg(b,q.params);mgf=hashes[t.oid];assert(mgf,'Unsupported MGF1 digest');}
 if(item.tag===0xa2)salt=uint(b,v[0],512);if(item.tag===0xa3)trailer=uint(b,v[0],1);}
 assert(hash===mgf,'RSA-PSS MGF1 hash differs from message hash; WebCrypto cannot verify this combination');assert(trailer===1,'Unsupported RSA-PSS trailer');return{hash,salt};}
function algorithm(c:Cert){if(c.sigAlg.oid===O.ed)return{kind:'Ed25519',label:'Ed25519'};
 if(c.sigAlg.oid===O.pss){const p=pss(c.raw,c.sigAlg.params);return{kind:'RSA-PSS',label:`RSA-PSS ${p.hash}`,hash:p.hash,salt:p.salt};}
 const def=signatures[c.sigAlg.oid];assert(def,`Unsupported signature algorithm OID ${c.sigAlg.oid}`);
 return{kind:def.name,label:`${def.name} ${def.hash}`,hash:def.hash};}
async function verify(child:Cert,parent:Cert):Promise<boolean>{const s=algorithm(child);let importAlg:AlgorithmIdentifier|RsaHashedImportParams|EcKeyImportParams;
 let verifyAlg:AlgorithmIdentifier|RsaPssParams|EcdsaParams;let signature=child.sig;
 if(s.kind==='Ed25519'){assert(parent.spkiAlg.oid===O.ed,'Parent key is not Ed25519');assert(!parent.spkiAlg.params,'Ed25519 SPKI must omit parameters');importAlg={name:'Ed25519'};verifyAlg={name:'Ed25519'};}
 else if(s.kind==='ECDSA'){assert(parent.spkiAlg.oid===O.ecdsa&&parent.spkiAlg.params,'Parent key is not EC with named curve');const curve=curves[oid(parent.spki,parent.spkiAlg.params)];assert(curve,'Unsupported EC named curve');importAlg={name:'ECDSA',namedCurve:curve.name};verifyAlg={name:'ECDSA',hash:s.hash!};signature=decodeSig(child.sig,curve.bytes);}
 else {assert(parent.spkiAlg.oid===O.rsa||parent.spkiAlg.oid===O.pss,'Parent key is not RSA');if(parent.spkiAlg.oid===O.pss){assert(s.kind==='RSA-PSS','RSA-PSS-restricted issuer key incompatible with PKCS1 signature');if(parent.spkiAlg.params){const restrictions=pss(parent.spki,parent.spkiAlg.params);assert(restrictions.hash===s.hash&&s.salt!>=restrictions.salt,'RSA-PSS key restrictions not met');}}
 importAlg={name:s.kind,hash:s.hash!};verifyAlg=s.kind==='RSA-PSS'?{name:'RSA-PSS',saltLength:s.salt!}:{name:'RSASSA-PKCS1-v1_5'};}
 try{const key=await crypto.subtle.importKey('spki',parent.spki.buffer as ArrayBuffer,importAlg,false,['verify']);return await crypto.subtle.verify(verifyAlg,key,signature.buffer as ArrayBuffer,child.tbs.buffer as ArrayBuffer);}
 catch(e){if(e instanceof DOMException&&e.name==='NotSupportedError')throw Error(`Browser does not support cryptographic algorithm ${s.label}`);
 if(e instanceof DOMException&&e.name==='DataError')throw Error(`Issuer public key import failed (${s.label})`);throw e;}}
async function fingerprint(raw:Uint8Array){const a=new Uint8Array(await crypto.subtle.digest('SHA-256',raw.buffer as ArrayBuffer));return hex(a).match(/.{2}/g)!.join(':').toUpperCase();}
export async function transform(x:Record<string,string>):Promise<ChainResult>{
 assert(typeof x.chain==='string','Missing PEM chain');assert(globalThis.crypto?.subtle,'WebCrypto requires an HTTPS or localhost secure browser context');
 const certs=pem(x.chain).map(parseCertificate);const now=x.at?new Date(x.at):new Date();assert(Number.isFinite(now.getTime()),'Invalid inspection date');
 const warnings:string[]=['ORDER_VERIFIED is not browser trust: no system trust store, hostname/SAN, EKU, policies, name constraints, revocation (OCSP/CRL), or cross-sign trust-path discovery is evaluated.'];
 const summaries:CertificateSummary[]=await Promise.all(certs.map(async(c,i)=>({position:i+1,subject:c.subject,issuer:c.issuer,notBefore:c.notBefore.toISOString(),notAfter:c.notAfter.toISOString(),isCA:c.isCA,pathLen:c.pathLen,signatureAlgorithm:algorithm(c).label,fingerprintSHA256:await fingerprint(c.raw),validNow:c.notBefore<=now&&now<=c.notAfter,keyCertSign:c.keyCertSign})));
 let unsupported=false;for(let i=0;i<certs.length;i++){const c=certs[i];if(!summaries[i].validNow)warnings.push(`Certificate ${i+1}: not valid at ${now.toISOString()}`);
 if(c.unknownCritical.length){unsupported=true;warnings.push(`Certificate ${i+1}: unsupported critical extension(s) ${c.unknownCritical.join(', ')}`);}
 if(algorithm(c).hash==='SHA-1')warnings.push(`Certificate ${i+1}: legacy SHA-1 signature; not recommended for trust validation.`);}
 const pairs:PairResult[]=[];let invalid=false,wrongOrder=false;
 for(let i=0;i<certs.length-1;i++){const child=certs[i],parent=certs[i+1];const nameOK=equal(child.issuerDer,parent.subjectDer);
 const caOK=parent.isCA&&parent.keyCertSign!==false;
 let signatureVerified=false;let detail='';
 if(!nameOK){wrongOrder=true;detail='Issuer DN differs from the following certificate subject DN';}
 else{try{signatureVerified=await verify(child,parent);detail=signatureVerified?'Cryptographic signature verified':'Cryptographic signature verification returned false';}catch(e){unsupported=true;detail=e instanceof Error?e.message:String(e);}}
 if(!signatureVerified&&nameOK)invalid=true;
 if(!caOK){invalid=true;detail+='; next certificate is not authorized as a CA (basicConstraints/keyCertSign)';}
 if(child.aki&&parent.ski&&!equal(child.aki,parent.ski)){invalid=true;detail+='; AKI/SKI mismatch';}
 pairs.push({child:i+1,issuer:i+2,dnMatched:nameOK,signatureVerified,caAuthorized:caOK,detail});}
 for(let i=1;i<certs.length;i++){const c=certs[i];if(c.pathLen===null)continue;
 // Count non-self-issued CA certs BELOW this issuer, not including the leaf.
 const caBelow=certs.slice(1,i).filter(t=>t.isCA&&!equal(t.subjectDer,t.issuerDer)).length;
 if(caBelow>c.pathLen){invalid=true;warnings.push(`Certificate ${i+1}: pathLenConstraint ${c.pathLen} exceeded by ${caBelow} subordinate non-self-issued CAs`);}}
 let suggestedOrder:number[]|null=null;
 if(wrongOrder&&certs.length>1){const parents=certs.map((c,i)=>certs.map((p,j)=>i!==j&&equal(c.issuerDer,p.subjectDer)?j:-1).filter(j=>j>=0));
 const hasChild=new Set(parents.flat());const leaves=certs.map((_,i)=>i).filter(i=>!hasChild.has(i));
 if(leaves.length===1){const result:number[]=[];const visited=new Set<number>();let cur=leaves[0];
 while(!visited.has(cur)){visited.add(cur);result.push(cur+1);const choices=parents[cur].filter(j=>!visited.has(j));if(choices.length!==1)break;cur=choices[0];}
 if(result.length===certs.length)suggestedOrder=result;}}
 const last=certs[certs.length-1];const selfIssued=equal(last.subjectDer,last.issuerDer);
 if(!selfIssued)warnings.push('Topmost provided certificate is not self-issued: missing issuer/trust anchor may be normal; chain completeness cannot be established.');
 else{try{const selfSigned=await verify(last,last);if(!selfSigned){invalid=true;warnings.push('Topmost self-issued certificate failed self-signature verification.');}
 else warnings.push('Topmost certificate is self-signed, but its trustworthiness is NOT established.');}
 catch(e){unsupported=true;warnings.push('Could not verify topmost self-signature: '+(e instanceof Error?e.message:String(e)));}}
 if(certs.length===1)warnings.push('Only one certificate supplied; there are no adjacent certificate links to verify.');
 // This is an ordering tool, not an RFC 5280 acceptance engine. Do not claim complete trust.
 const status:Outcome=unsupported?'UNSUPPORTED':wrongOrder?'ORDER_INCORRECT':invalid?'LINK_FAILED':certs.length===1?'INCOMPLETE':'ORDER_VERIFIED';
 const line=status==='ORDER_VERIFIED'?'Adjacent issuer names, signatures, CA authorization, and basic path length checks succeeded.':status==='ORDER_INCORRECT'?'The supplied certificate sequence has issuer/subject ordering mismatches.':status==='LINK_FAILED'?'A matched link failed cryptographic or CA authorization checks.':status==='UNSUPPORTED'?'Some verification checks could not be completed. No success claimed.':'A single certificate cannot establish chain order.';
 const text=[`Status: ${status}`,line,'',...summaries.map(c=>`#${c.position} ${c.subject}\n  Issuer: ${c.issuer}\n  Valid: ${c.notBefore} to ${c.notAfter}\n  Algorithm: ${c.signatureAlgorithm}; CA: ${c.isCA}; keyCertSign: ${c.keyCertSign??'not present'}\n  SHA-256: ${c.fingerprintSHA256}`),...pairs.map(p=>`#${p.child} → #${p.issuer}: DN ${p.dnMatched?'MATCH':'MISMATCH'} / signature ${p.signatureVerified?'VERIFIED':'NOT VERIFIED'} / CA ${p.caAuthorized?'YES':'NO'}\n  ${p.detail}`),...(suggestedOrder?[`Suggested DN-based order (unverified): ${suggestedOrder.join(' → ')}`]:[])].join('\n');
 return {heading:'Cryptographic certificate-chain order inspection',text,warnings,status,certificates:summaries,links:pairs,suggestedOrder};}
