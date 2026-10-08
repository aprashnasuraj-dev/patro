import {approved,type Review} from '../place/ritual-config';
const treeSource='https://www.jharparks.org/NakshatraVan.php';
const starSource='https://paramarsh.app/patrika/nakshatras/27-nakshatras-complete-guide';
// One documented Nakshatravana tradition; other traditions use different trees.
const trees=['Amla','Banyan / Pakad','Gular','Jamun','Khair','Pakad','Bamboo','Peepal','Nagkesar','Banyan','Palash','Rudraksha','Reetha','Bael','Arjun','Vikankat','Maulsari','Pine','Sal','Ashoka','Jackfruit','Madar','Shami','Kadamba','Mango','Neem','Mahua'];
const deities=['Ashvins','Yama','Agni','Prajapati','Soma','Rudra','Aditi','Brihaspati','Nagas','Pitrs','Bhaga','Aryaman','Savitr','Tvastr','Vayu','Indra–Agni','Mitra','Indra','Nirriti','Apas','Vishvedevas','Vishnu','Vasus','Varuna','Aja Ekapada','Ahir Budhnya','Pushan'];
const symbols=['Horse head','Yoni','Flame','Chariot','Deer head','Teardrop','Bow','Udder','Serpent','Throne','Hammock','Bed','Hand','Jewel','Shoot','Arch','Lotus','Earring','Roots','Fan','Tusk','Ear','Drum','Circle','Sword','Bed legs','Fish'];
export const STAR_TRADITIONS=trees.map((tree,index)=>({index,tree,deity:deities[index],symbol:symbols[index],source:treeSource,starSource,reviewer:null as Review,nepalAlternative:null as {species:string;region:string;source:string;reviewer:Review}|null}));
export function reviewedStar(index:number){const row=STAR_TRADITIONS[index];return row&&approved(row.reviewer)?row:null;}
export const JANKU_RULES=[
 {name:'Bhimratha',years:77,months:7,days:7,source:'https://rubinmuseum.org/celebrating-77-years-7-months-and-7-days/',reviewer:null as Review},
 {name:'Chandraratha — alternative age convention',years:82,months:4,days:4,source:'https://www.yentra.com/resources/janku-celebration-age-in-newar-community.29/',reviewer:null as Review},
 {name:'Chandraratha — another convention',years:83,months:4,days:4,source:'https://searcharchives.bl.uk/catalog/041-003938814',reviewer:null as Review},
 {name:'Devaratha',years:88,months:8,days:8,source:'https://searcharchives.bl.uk/catalog/041-003938814',reviewer:null as Review},
 {name:'Divyaratha',years:99,months:9,days:9,source:'https://searcharchives.bl.uk/catalog/041-003938814',reviewer:null as Review},
];
export function estimatedAgeDate(birth:string,years:number,months:number,days:number){const [y,m,d]=birth.split('-').map(Number),first=new Date(Date.UTC(y+years,m-1+months,1)),end=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();first.setUTCDate(Math.min(d,end)+days);return first.toISOString().slice(0,10);}
