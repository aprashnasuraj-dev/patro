const ONES=['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function u100(n:number){if(n<20)return ONES[n];const t=TENS[Math.floor(n/10)],o=n%10;return o?`${t}-${ONES[o]}`:t}
function u1000(n:number){const h=Math.floor(n/100),r=n%100;return [h?`${ONES[h]} Hundred`:'',r?u100(r):''].filter(Boolean).join(' ')}
function intl(n:number){if(n===0)return 'Zero';const scales=[['Billion',1e9],['Million',1e6],['Thousand',1e3]] as const;let x=n,out:string[]=[];for(const [name,v] of scales){const q=Math.floor(x/v);if(q){out.push(`${u1000(q)} ${name}`);x%=v}}if(x)out.push(u1000(x));return out.join(' ')}
function indian(n:number){if(n===0)return 'Zero';let x=n,out:string[]=[];const crore=Math.floor(x/1e7);if(crore){out.push(`${intl(crore)} Crore`);x%=1e7}const lakh=Math.floor(x/1e5);if(lakh){out.push(`${u100(lakh)} Lakh`);x%=1e5}const thousand=Math.floor(x/1e3);if(thousand){out.push(`${u100(thousand)} Thousand`);x%=1e3}if(x)out.push(u1000(x));return out.join(' ')}
function unit(word:string,n:number){return word.trim().slice(0,40)}
export function numberToWords(raw:string,system:'international'|'indian',majorOne:string,majorMany:string,minorOne:string,minorMany:string){
 const s=String(raw).trim();if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(s))throw new Error('Enter a non-negative amount up to 9,999,999,999 with at most 2 decimals.');
 const [a,b='']=s.split('.');const major=Number(a),minor=Number((b+'00').slice(0,2));if(major>9_999_999_999)throw new Error('Amount exceeds supported range.');
 const words=system==='indian'?indian(major):intl(major);const majLabel=major===1?unit(majorOne,major):unit(majorMany,major),minLabel=minor===1?unit(minorOne,minor):unit(minorMany,minor);
 if(!majLabel||!minLabel)throw new Error('Currency unit labels are required.');
 return {major,minor,text:`${words} ${majLabel}${minor?` and ${intl(minor)} ${minLabel}`:''} Only`};
}
