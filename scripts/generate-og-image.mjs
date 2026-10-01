import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
const W=1200,H=630;
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type);const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])}
const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){const row=y*(W*4+1);raw[row]=0;for(let x=0;x<W;x++){const i=row+1+x*4;let r=23,g=111,b=59;const dx=x-W*.5,dy=y-H*.47;if(dx*dx+dy*dy<115*115){r=245;g=247;b=244}if(dx*dx+dy*dy<72*72){r=14;g=74;b=39}raw[i]=r;raw[i+1]=g;raw[i+2]=b;raw[i+3]=255}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",ihdr),chunk("IDAT",deflateSync(raw,{level:9})),chunk("IEND",Buffer.alloc(0))]);
const dir=resolve(process.cwd(),"public/og");await mkdir(dir,{recursive:true});await writeFile(resolve(dir,"aafnai-patro-1200x630.png"),png);console.log(`Generated OG PNG ${W}x${H}`);
