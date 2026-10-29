import { addDaysIso, isoToJdn, jdnToIso, parseIso } from "../dates";
import { esc } from "../html";
import { NYEPI, OTHER_BALI_DAYS, PURNAMA_TILEM } from "../data/bali-saka";
import { PANCAWARA, PAWUKON_CYCLE_DAYS, SAPTAWARA, SAPTAWARA_AKSARA, WUKU, palelintanganMatrix, pawukon, pawukonEvents } from "../engines/pawukon";
import { annualSasihReadiness } from "../data/bali-annual-sources";
import { BALI_PIODALAN } from "../data/bali-piodalan";
import { PEWIWAHAN_SAPTAWARA, WARIGA_DAUH_SOURCE, merthaYoga, pitraImmediateRestrictions } from "../engines/wariga";
import type { Ctx } from "../types";

const BP="/bali-calendar";
const ID_DAYS=["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const ID_MONTHS=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const TIKA_SOURCE="https://ceraken.baliprov.go.id/detail/tika-1656550642";
export const PENGALANTAKA_SOURCE="https://budaya.data.kemdikbud.go.id/wbtb/objek/AA001031";
export const INGKEL_SOURCE="https://download.garuda.kemdikbud.go.id/article.php?article=1769488&title=PENENTUAN+HARI+BAIK+PERKAWINAN+DI+BALI+BERBASIS+LOGIKA+FUZZY&val=922";

const INGKEL=[
 {name:"Wong",domain:"Manusa Yadnya",note:"Pantangan untuk memulai upacara Manusa Yadnya tertentu menurut rujukan Ingkel."},
 {name:"Sato",domain:"Hewan berkaki empat",note:"Tidak baik memulai mengambil atau memelihara hewan berkaki empat."},
 {name:"Mina",domain:"Ikan",note:"Tidak baik memulai memelihara atau mengambil ikan."},
 {name:"Manuk",domain:"Unggas",note:"Tidak baik memulai mengambil atau memelihara unggas."},
 {name:"Taru",domain:"Pohon/kayu",note:"Tidak baik memulai menanam atau menebang kayu untuk keperluan tertentu."},
 {name:"Buku",domain:"Bambu/tanaman beruas",note:"Tidak baik memulai memotong bambu atau tanaman beruas untuk bahan atau peralatan."}
] as const;

function idDate(iso:string){const p=parseIso(iso);if(!p)return iso;return ID_DAYS[new Date(Date.UTC(p.y,p.m-1,p.d)).getUTCDay()]+", "+p.d+" "+ID_MONTHS[p.m-1]+" "+p.y}
function slug(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
export function ingkelForWuku(index:number){return INGKEL[(index-1)%INGKEL.length]}
function lunar(iso:string){const pt=PURNAMA_TILEM[Number(iso.slice(0,4))];return{purnama:Boolean(pt?.purnama.includes(iso)),tilem:Boolean(pt?.tilem.includes(iso))}}
function published(iso:string){const y=Number(iso.slice(0,4)),out:string[]=[];if(NYEPI[y]?.date===iso)out.push("Nyepi");const l=lunar(iso);if(l.purnama)out.push("Purnama");if(l.tilem)out.push("Tilem");for(const x of OTHER_BALI_DAYS[y]||[])if(x.date===iso)out.push(x.name);return out}
function important(iso:string){return [...pawukonEvents(isoToJdn(iso)).filter(x=>/Galungan|Kuningan|Saraswati|Pagerwesi|Banyu Pinaruh|Tumpek|Kajeng Kliwon/.test(x)),...published(iso)]}
function bounds(iso:string){const p=parseIso(iso)!;const first=p.y+"-"+String(p.m).padStart(2,"0")+"-01",lastDay=new Date(Date.UTC(p.y,p.m,0)).getUTCDate(),last=p.y+"-"+String(p.m).padStart(2,"0")+"-"+String(lastDay).padStart(2,"0");return{year:p.y,month:p.m,key:first.slice(0,7),firstJdn:isoToJdn(first),lastJdn:isoToJdn(last)}}
function starts(iso:string){const b=bounds(iso),a=pawukon(b.firstJdn),z=pawukon(b.lastJdn),first=b.firstJdn-(a.dayInWuku-1),last=b.lastJdn-(z.dayInWuku-1),out:number[]=[];for(let j=first;j<=last;j+=7)out.push(j);return{b,out}}
export function sakaYearForDate(iso:string){
 const p=parseIso(iso);if(!p)return null;
 const nyepi=NYEPI[p.y]?.date;
 if(!nyepi)return null;
 return p.y-(iso>=nyepi?78:79);
}

export type BaliView="pawukon"|"palelintangan"|"sasih"|"gregorian";
export function baliModeNav(active:BaliView,iso:string){
 const month=iso.slice(0,7),q="?tanggal="+encodeURIComponent(iso),items:Array<[BaliView,string,string]>=[["pawukon",active==="pawukon"?BP:BP+"/"+iso,"Pawukon / Tika"],["palelintangan",BP+"/palelintangan"+q,"Palelintangan"],["sasih",BP+"/sasih-saka"+q,"Sasih / Saka"],["gregorian",BP+"/bulan/"+month,"Gregorian"]];
 return '<nav class="bali-mode-nav" aria-label="Mode Kalender Bali">'+items.map(x=>'<a href="'+x[1]+'"'+(x[0]===active?' aria-current="page" class="active"':'')+'>'+esc(x[2])+'</a>').join("")+'</nav>';
}

function monthBoard(iso:string){
 const m=starts(iso),b=m.b,cols=m.out;
 const saka=sakaYearForDate(iso),head='<div class="tika-month-corner"><span>WUKU</span><small>'+esc(ID_MONTHS[b.month-1])+" "+b.year+(saka!==null?'<b>ÇAKA '+saka+'</b>':"")+'</small></div>'+cols.map(j=>{const p=pawukon(j),i=ingkelForWuku(p.wuku.index);return '<a class="tika-month-wuku" href="'+BP+"/wuku/"+slug(p.wuku.name)+'"><span>'+p.wuku.index+". "+esc(p.wuku.name)+'</span><small>Ingkel '+esc(i.name)+"</small></a>"}).join("");
 const body=SAPTAWARA.map((sapta,row)=>{let out='<div class="tika-weekday"><strong>'+esc(sapta)+'</strong><em lang="ban-Bali">'+esc(SAPTAWARA_AKSARA[sapta])+'</em><small>'+esc(ID_DAYS[row])+'</small></div>';for(const start of cols){const jdn=start+row,date=jdnToIso(jdn),p=pawukon(jdn),events=important(date),l=lunar(date),major=events.some(x=>/Galungan|Kuningan|Saraswati|Pagerwesi|Banyu Pinaruh|Tumpek|Nyepi/.test(x)),title=p.combination+"; "+idDate(date)+(events.length?"; "+events.join(", "):"");out+='<a class="tika-month-cell'+(row===0?" redite":"")+(date.startsWith(b.key)?"":" outside")+(date===iso?" selected":"")+'" href="'+BP+"/"+date+'" title="'+esc(title)+'" aria-label="'+esc(title)+'"><div class="tika-cell-top"><span>'+esc(p.pancawara)+"</span><span>"+esc(p.triwara)+'</span></div><strong class="tika-date-number">'+Number(date.slice(-2))+'</strong><div class="tika-cell-meta"><span>'+esc(p.sadwara)+"</span><span>"+esc(p.caturwara)+'</span></div><div class="tika-cell-marks">'+(major?'<i class="major"></i>':"")+(l.purnama||l.tilem?'<i class="lunar"></i>':"")+"</div></a>"}return out}).join("");
 const ingkel='<div class="tika-ingkel-label">INGKEL</div>'+cols.map(j=>{const p=pawukon(j),i=ingkelForWuku(p.wuku.index);return '<div class="tika-ingkel"><strong>'+esc(i.name)+"</strong><small>"+esc(i.domain)+"</small></div>"}).join("");
 return '<div class="tika-board-wrap" tabindex="0"><div class="tika-month-grid" style="--tika-cols:'+cols.length+'">'+head+body+ingkel+'</div></div><div class="tika-legend"><span><i class="major"></i>rerainan utama</span><span><i class="lunar"></i>Purnama/Tilem terbit</span><span>sel redup = bulan sebelah</span></div>';
}

function eventList(iso:string){const b=bounds(iso),rows:Array<{date:string;names:string[]}>=[];for(let j=b.firstJdn;j<=b.lastJdn;j++){const date=jdnToIso(j),names=important(date);if(names.length)rows.push({date,names})}return rows.length?'<ul class="bali-event-list">'+rows.map(r=>'<li><a href="'+BP+"/"+r.date+'"><time>'+r.date.slice(5)+"</time><span>"+esc(r.names.join(", "))+"</span></a></li>").join("")+"</ul>":'<p class="muted">Tidak ada penanda besar pada lapisan data yang tersedia.</p>'}

function dewasa(iso:string){
 const p=pawukon(isoToJdn(iso)),l=lunar(iso),tom=lunar(addDaysIso(iso,1)),pit=pitraImmediateRestrictions({triwara:p.triwara,saptawara:p.saptawara,pancawara:p.pancawara,events:pawukonEvents(isoToJdn(iso)),is_tilem:l.tilem,is_purwani_purnama:tom.purnama}),mar=PEWIWAHAN_SAPTAWARA[p.saptawara],mer=merthaYoga(p),ing=ingkelForWuku(p.wuku.index);
 return '<div class="dewasa-grid"><article class="dewasa-card '+(mar.quality==="ayu"?"ayu":"ala")+'"><span>Pewiwahan</span><strong>'+(mar.quality==="ayu"?"Ayu":"Ala")+"</strong><small>"+esc(mar.source_summary)+'</small></article><article class="dewasa-card '+(pit.restricted?"ala":"neutral")+'"><span>Pitra</span><strong>'+(pit.restricted?"Ada pantangan":"Tidak ada pantangan khusus")+"</strong><small>"+(pit.restricted?esc(pit.reasons.join(", ")):"Dilihat dari kombinasi hari yang tersedia")+'</small></article><article class="dewasa-card '+(mer?"ayu":"neutral")+'"><span>Mertha Yoga</span><strong>'+(mer?"Cocok":"Tidak cocok")+'</strong><small>Pertemuan hari untuk kegiatan tertentu</small></article><article class="dewasa-card ala"><span>Ingkel '+esc(ing.name)+"</span><strong>"+esc(ing.domain)+"</strong><small>"+esc(ing.note)+'</small></article></div><p class="note">Gunakan sebagai panduan membaca hari. Penentuan hari baik dapat mempertimbangkan beberapa unsur sekaligus dan kebiasaan keluarga atau desa dapat berbeda.</p>';
}


function horizon(iso:string){
 const start=isoToJdn(iso);
 const windows=[{days:7,label:"7 hari",detail:"Wuku dekat"},{days:35,label:"35 hari",detail:"ritme Sapta × Panca"},{days:210,label:"210 hari",detail:"satu Pawukon / Oton"}];
 return '<section class="bali-return-horizon"><div class="bali-section-heading"><div><span class="bali-face-kicker">Datang kembali</span><h2>Apa yang datang berikutnya?</h2></div><p>Tiga horizon mengikuti ritme kalender Bali: satu minggu, satu pertemuan 7×5 hari, dan satu siklus Pawukon penuh.</p></div><div class="bali-horizon-grid">'+windows.map(w=>{
   const hits:Array<{date:string;name:string}>=[];
   for(let off=1;off<=w.days&&hits.length<4;off++){
     const date=jdnToIso(start+off);
     for(const name of important(date)) if(!hits.some(x=>x.date===date&&x.name===name)) hits.push({date,name});
   }
   return '<article><span>'+w.label+'</span><strong>'+esc(w.detail)+'</strong>'+(hits.length?'<ul>'+hits.map(x=>'<li><a href="'+BP+'/'+x.date+'"><time>'+x.date.slice(5)+'</time>'+esc(x.name)+'</a></li>').join("")+'</ul>':'<p class="muted">Belum ada hari besar dalam rentang ini.</p>')+'</article>';
 }).join("")+'</div></section>';
}

function puraOptions(iso:string){
 const start=isoToJdn(iso),nextByRule=new Map<string,string>();
 for(let off=1;off<=PAWUKON_CYCLE_DAYS;off++){
   const j=start+off,p=pawukon(j),key=p.saptawara+"|"+p.pancawara+"|"+p.wuku.name;
   if(!nextByRule.has(key))nextByRule.set(key,jdnToIso(j));
 }
 return BALI_PIODALAN.filter(r=>r.rule.type==="pawukon").map(r=>{
   const key=r.rule.type==="pawukon"?r.rule.saptawara+"|"+r.rule.pancawara+"|"+r.rule.wuku:"",next=nextByRule.get(key)||"";
   return '<option value="'+esc(r.slug)+'" data-name="'+esc(r.name)+'" data-locality="'+esc(r.locality)+'" data-next="'+esc(next)+'">'+esc(r.name)+' · '+esc(r.locality)+(next?' · '+next:'')+'</option>';
 }).join("");
}

function recentReturnEvents(iso:string){
 const end=isoToJdn(iso),out:Array<{date:string;name:string}>=[];
 for(let j=end-35;j<end;j++){
   const date=jdnToIso(j);
   for(const name of important(date))out.push({date,name});
 }
 return out.slice(-18);
}

function personalHub(iso:string){
 return '<section id="my-bali" class="bali-personal-hub" data-bali-today="'+esc(iso)+'" data-bali-recent="'+esc(JSON.stringify(recentReturnEvents(iso)))+'"><div class="bali-section-heading"><div><span class="bali-face-kicker">My Bali Calendar</span><h2>Kalender yang mengingat orang dan hari pentingmu</h2></div><p>Data pribadi disimpan lokal di browser ini. Tambahkan keluarga sekali; AafnaiPatro akan menampilkan Otonan berikutnya dan membuka kembali konteks yang kamu simpan.</p></div>'+
 '<div id="bali-return-summary" class="bali-return-summary" aria-live="polite"></div>'+
 '<div class="bali-personal-grid"><section><h3>Orang & Otonan</h3><form id="bali-person-form" class="bali-memory-form"><label>Nama<input name="name" maxlength="60" required placeholder="Ibu / Ayah / Wayan"></label><label>Hubungan<select name="relation"><option value="self">Saya</option><option value="parent">Orang tua</option><option value="partner">Pasangan</option><option value="child">Anak</option><option value="family">Keluarga</option><option value="other">Lainnya</option></select></label><label>Tanggal lahir<input name="birthDate" type="date" min="1929-01-01" max="'+esc(iso)+'" required></label><label>Terhadap matahari terbit<select name="boundary"><option value="unknown">Tidak tahu</option><option value="before">Sebelum matahari terbit</option><option value="after">Saat/setelah matahari terbit</option></select></label><button type="submit">Simpan Otonan</button></form><div id="bali-people-list" class="bali-memory-list"></div></section>'+
 '<section><h3>Hari tersimpan</h3><form id="bali-date-form" class="bali-memory-form"><label>Tanggal<input name="date" type="date" min="1929-01-01" max="2129-12-31" value="'+esc(iso)+'" required></label><label>Catatan<input name="label" maxlength="100" placeholder="Piodalan keluarga / hari penting"></label><button type="submit">Simpan tanggal</button></form><div id="bali-saved-dates" class="bali-memory-list"></div></section>'+
 '<section class="bali-pura-memory"><h3>My Pura</h3><form id="bali-pura-form" class="bali-memory-form bali-pura-form"><label>Pilih Pura<select name="slug" required><option value="">Pilih Pura…</option>'+puraOptions(iso)+'</select></label><button type="submit">Simpan Pura</button></form><div id="bali-pura-list" class="bali-memory-list"></div><p class="note">Jadwal Pawukon dapat ditampilkan berulang. Piodalan yang mengikuti Sasih ditampilkan ketika tanggal tahun tersebut tersedia.</p></section></div>'+
 '<div class="bali-memory-tools"><button type="button" id="bali-export-memory">Unduh cadangan</button><label class="bali-import-label">Pulihkan cadangan<input id="bali-import-memory" type="file" accept="application/json"></label><button type="button" id="bali-clear-memory" class="bali-danger-secondary">Hapus data My Bali</button></div><p class="note">Cadangan membantu memindahkan My Bali Calendar ke perangkat lain tanpa harus membuat akun.</p></section>';
}

function fullCycle(iso:string){const j=isoToJdn(iso),cur=pawukon(j),start=j-cur.day;return '<details class="bali-full-cycle"><summary>Lihat seluruh siklus Pawukon 210 hari</summary><div class="full-wuku-grid">'+WUKU.map((name,index)=>{const ing=ingkelForWuku(index+1),days=Array.from({length:7},(_,row)=>{const dj=start+index*7+row,p=pawukon(dj);return '<a class="'+(p.day===cur.day?"selected":"")+'" href="'+BP+"/"+jdnToIso(dj)+'" title="'+esc(p.combination)+'"><b>'+(row+1)+"</b><small>"+esc(p.pancawara)+"</small></a>"}).join("");return '<article class="full-wuku'+(cur.wuku.index===index+1?" current":"")+'"><header><span>'+(index+1)+"</span><strong>"+esc(name)+"</strong><small>"+esc(ing.name)+"</small></header><div>"+days+"</div></article>"}).join("")+"</div></details>"}


function baliSeoStory(iso:string){
 const p=pawukon(isoToJdn(iso));
 return '<section class="bali-seo-story"><div class="bali-section-heading"><div><span class="bali-face-kicker">Panduan Kalender Bali</span><h2>Memahami Pawukon, Wuku, Wewaran dan hari raya Bali</h2></div><p>Kalender Bali membaca beberapa siklus hari sekaligus. Karena itu satu tanggal dapat memiliki Wuku, Saptawara, Pancawara, Ingkel, rerainan dan konteks Sasih yang berbeda.</p></div><div class="bali-story-grid"><article><h3>Pawukon 210 hari</h3><p>Pawukon terdiri dari 30 Wuku, masing-masing tujuh hari. Tanggal yang dipilih berada pada Wuku <b>'+esc(p.wuku.name)+'</b>, hari ke-'+p.dayInWuku+' dalam Wuku tersebut.</p><a href="'+BP+'/wuku/'+slug(p.wuku.name)+'">Pelajari Wuku '+esc(p.wuku.name)+' →</a></article><article><h3>Wewaran</h3><p>Wewaran adalah siklus hari yang berjalan bersamaan, dari Ekawara hingga Dasawara. Kombinasi utama hari ini adalah <b>'+esc(p.saptawara)+' '+esc(p.pancawara)+'</b>.</p><a href="'+BP+'/wewaran">Pelajari Wewaran →</a></article><article><h3>Otonan & keluarga</h3><p>Otonan berulang setiap satu siklus Pawukon. Simpan tanggal lahir keluarga di My Bali Calendar untuk melihat Otonan berikutnya.</p><a href="'+BP+'/otonan">Hitung Otonan →</a></article><article><h3>Hari raya & Piodalan</h3><p>Jelajahi Galungan, Kuningan, Saraswati, Pagerwesi, Tumpek dan jadwal Piodalan yang tersedia dalam kalender.</p><a href="'+BP+'/hari-raya/'+iso.slice(0,4)+'">Lihat hari raya →</a></article></div></section>';
}

function calendarDataDetails(ready:ReturnType<typeof annualSasihReadiness>){
 return '<details class="bali-about-data"><summary>Tentang perhitungan dan data kalender</summary><div><p>Pawukon, Wuku dan Wewaran dihitung dari siklus kalender Bali. Purnama, Tilem dan Sasih ditampilkan dari kalender tahunan yang tersedia; bila tanggal tahunan belum tersedia, AafnaiPatro tidak menebaknya.</p><p>Rujukan lebih lanjut: <a href="'+TIKA_SOURCE+'" rel="nofollow noopener">Tika Bali</a>, <a href="'+PENGALANTAKA_SOURCE+'" rel="nofollow noopener">Pengalantaka</a>, <a href="'+INGKEL_SOURCE+'" rel="nofollow noopener">Ingkel</a> dan <a href="'+WARIGA_DAUH_SOURCE.url+'" rel="nofollow noopener">Wariga / Dauh</a>.</p>'+(ready.source?'<p>Kalender tahunan yang tersedia: '+esc(ready.source.version)+'.</p>':'')+'</div></details>';
}

export function renderTraditionalWorkspace(ctx:Ctx,iso:string){
 const p=pawukon(isoToJdn(iso)),ready=annualSasihReadiness(Number(iso.slice(0,4))),saka=sakaYearForDate(iso),install=ctx.flags.baliPwa?'<div class="bali-install-zone"><button id="bali-install" class="bali-install" type="button">Install Bali Calendar</button><p id="bali-install-status" class="bali-install-status" role="status" aria-live="polite"></p><div id="bali-install-guide" class="bali-install-guide" hidden><b>Instal manual:</b> iPhone/iPad: Safari - Share - Add to Home Screen. Android/desktop: Chrome/Edge menu - Install app / Add to Home screen.</div></div>':"",links=[{href:BP+"/otonan",label:"Otonan",detail:"Hitung Otonan diri dan keluarga"},...(ctx.flags.baliPiodalan?[{href:BP+"/piodalan",label:"Piodalan",detail:"Cari jadwal hari suci di Pura"}]:[]),...(ctx.flags.baliPadewasan?[{href:BP+"/padewasan?tanggal="+iso,label:"Padewasan",detail:"Panduan memilih hari untuk kegiatan"}]:[]),...(ctx.flags.baliDauhAyu?[{href:BP+"/dauh-ayu?tanggal="+iso,label:"Dauh Ayu",detail:"Pembagian waktu dalam satu hari"}]:[]),...(ctx.flags.baliRerainanSearch?[{href:BP+"/cari",label:"Cari Rerainan",detail:"Galungan, Tumpek, Kajeng Kliwon"}]:[])];
 return '<section class="bali-workspace bali-traditional-workspace"><div class="bali-workspace-head"><div><span class="bali-face-kicker">Kalender Bali · Tika · Pawukon</span><h2>Kalender Bali hari ini: Wuku, Wewaran, Tika dan hari raya</h2><p><b>'+esc(p.combination)+'</b> · Wuku '+esc(p.wuku.name)+'. Lihat susunan Tika, Ingkel, rerainan, Dewasa, Otonan dan hubungan hari ini dengan siklus Pawukon 210 hari.</p></div>'+install+'</div>'+baliModeNav("pawukon",iso)+'<div class="bali-current-band"><div><span>Wuku</span><strong>'+esc(p.wuku.name)+"</strong><small>Wuku ke-"+p.wuku.index+' dari 30</small></div><div><span>Wewaran</span><strong>'+esc(p.saptawara)+" · "+esc(p.pancawara)+"</strong><small>"+esc(p.triwara)+" · "+esc(p.sadwara)+'</small></div><div><span>Siklus Pawukon</span><strong>Hari '+p.cycleDay+" dari 210</strong><small>hari "+p.dayInWuku+' dalam Wuku</small></div><div><span>Saka / Sasih</span><strong>'+(saka!==null?"Çaka "+saka:"Kalender bulan Bali")+'</strong><small><a href="'+BP+'/sasih-saka?tanggal='+encodeURIComponent(iso)+'">Lihat Sasih, Purnama & Tilem</a></small></div></div><form class="bali-date-jump" method="get" action="'+BP+'/go"><label><span>Lihat tanggal lain</span><input type="date" name="tanggal" min="1929-01-01" max="2129-12-31" value="'+esc(iso)+'" required></label><button type="submit">Buka kalender</button><small>Pilih tanggal 1929–2129 untuk melihat Wuku dan Wewaran. Purnama, Tilem dan Sasih mengikuti kalender tahun yang tersedia.</small></form><div class="bali-calendar-layout"><div class="bali-calendar-main"><div class="bali-section-heading"><div><span class="bali-face-kicker">Tika bulanan</span><h2>Kalender Wuku dan Wewaran bulan ini</h2></div><p>Baca Wuku dari kolom dan Saptawara dari baris. Setiap tanggal menampilkan Pancawara, Triwara, Sadwara serta tanda hari raya dan Purnama/Tilem.</p></div>'+monthBoard(iso)+fullCycle(iso)+'</div><aside class="bali-calendar-rail"><section><h3>Rerainan bulan ini</h3>'+eventList(iso)+'</section><section><h3>Panduan hari dipilih</h3>'+dewasa(iso)+'</section></aside></div><div class="bali-quick-grid">'+links.map(x=>'<a href="'+x.href+'"><strong>'+esc(x.label)+"</strong><span>"+esc(x.detail)+"</span></a>").join("")+'</div>'+baliSeoStory(iso)+horizon(iso)+(ctx.flags.baliPwa?personalHub(iso):"")+'<div class="bali-home-link"><a href="/">AafnaiPatro home</a> - <a href="/advancetools/web-tools/">Advanced Tools</a></div>'+calendarDataDetails(ready)+'</section>';
}

export function renderPalelintanganView(iso:string){
 const p=pawukon(isoToJdn(iso)),matrix=palelintanganMatrix(),head='<div class="pal-corner">Sapta x Panca</div>'+PANCAWARA.map(n=>'<div class="pal-head">'+esc(n)+"</div>").join(""),rows=SAPTAWARA.map(s=>'<div class="pal-row-head"><strong>'+esc(s)+'</strong><small lang="ban-Bali">'+esc(SAPTAWARA_AKSARA[s])+"</small></div>"+PANCAWARA.map(q=>{const c=matrix.find(x=>x.saptawara===s&&x.pancawara===q)!;return '<details class="pal-cell'+(p.saptawara===s&&p.pancawara===q?" is-current":"")+'"><summary><span>'+esc(c.lintang)+"</span><small>urip "+c.urip+"</small></summary><p><b>"+esc(s)+" "+esc(q)+"</b></p><p>Lintang: <b>"+esc(c.lintang)+"</b></p><p>Patron: "+esc(c.patron)+"</p><p>Urip "+c.saptawaraUrip+" + "+c.pancawaraUrip+" = <b>"+c.urip+"</b>.</p></details>"}).join("")).join("");
 return baliModeNav("palelintangan",iso)+'<section class="palelintangan-intro"><p>Palelintangan menyorot <b>7 Saptawara x 5 Pancawara = 35 kombinasi</b>. Ini lapisan berbeda dari Tika Pawukon 210 hari.</p><p class="note">Nama 35 lintang dan patron Saptawara sudah bersumber; satwa, pohon, wayang, watak dan ramalan per-sel tetap ditahan jika tradisinya belum stabil atau sumbernya belum cukup spesifik.</p></section><section><div class="pal-grid">'+head+rows+'</div></section><section><h2>Hubungan dengan Pawukon</h2><p>Hari yang dipilih: <b>'+esc(p.combination)+"</b>. Wuku "+esc(p.wuku.name)+' dan Wewaran lain tetap berasal dari posisi Pawukon yang sama.</p></section>';
}

export function renderSasihSakaView(iso:string){
 const y=Number(iso.slice(0,4)),r=annualSasihReadiness(y),s=r.source,pt=PURNAMA_TILEM[y],annual=r.ready&&s?'<div class="tw"><table><thead><tr><th>Sasih</th><th>Purnama</th><th>Tilem</th></tr></thead><tbody>'+s.mappings.map(m=>'<tr><th>'+esc(m.sasih)+"</th><td>"+(m.purnama?'<a href="'+BP+"/"+m.purnama+'">'+esc(m.purnama)+"</a>":"-")+"</td><td>"+(m.tilem?'<a href="'+BP+"/"+m.tilem+'">'+esc(m.tilem)+"</a>":"-")+"</td></tr>").join("")+"</tbody></table></div>":'<div class="bali-fail-closed"><strong>Pemetaan Sasih '+y+' belum lengkap.</strong><p>AafnaiPatro tidak memproyeksikan tanggal Sasih yang tidak diterbitkan.</p></div>'+(s?.anchors.length?'<div class="tw"><table><tbody>'+s.anchors.map(a=>'<tr><td><a href="'+BP+"/"+a.date+'">'+esc(a.date)+"</a></td><td>"+esc(a.lunar_day)+" "+esc(a.sasih)+'</td><td><a href="'+esc(a.source_url)+'" rel="nofollow noopener">'+esc(a.authority)+"</a></td></tr>").join("")+"</tbody></table></div>":"");
 return baliModeNav("sasih",iso)+'<section><h2>Status sumber tahunan</h2><p><b>'+(r.ready?"Siap digunakan":"Fail-closed")+"</b>"+(s?" - "+esc(s.publication_authority)+" - "+esc(s.version):"")+"</p>"+annual+'</section><section><h2>Purnama / Tilem terbit</h2>'+(pt?'<p><b>Purnama:</b> '+pt.purnama.map(d=>'<a class="chip" href="'+BP+"/"+d+'">'+esc(d)+"</a>").join(" ")+'</p><p><b>Tilem:</b> '+pt.tilem.map(d=>'<a class="chip" href="'+BP+"/"+d+'">'+esc(d)+"</a>").join(" ")+'</p><p class="note">Sumber: '+esc(pt.source)+"</p>":"<p>Belum ada tabel Purnama/Tilem terbit untuk tahun ini.</p>")+"</section>";
}
