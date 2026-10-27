export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
type Fraction={n:bigint;d:bigint};const pow=(n:number)=>10n**BigInt(n);
function rational(raw:string):Fraction{const m=raw.match(/^([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?\d{1,3}))?$/);if(!m)throw Error('Invalid decimal quantity');const n=BigInt(m[1]+(m[2]||''));const scale=(m[2]||'').length;const expo=Number(m[3]||'0');if(Math.abs(expo)>30||raw.length>100)throw Error('Quantity exponent exceeds limit');return expo>=scale?{n:n*pow(expo-scale),d:1n}:{n,d:pow(scale-expo)};}
function scaled(fr:Fraction,mult:Fraction):Fraction{return{n:fr.n*mult.n,d:fr.d*mult.d};}
function decimals(fr:Fraction,digits=9):string{const quotient=fr.n/fr.d;const remainder=fr.n%fr.d;if(!remainder)return quotient.toString();const fraction=(remainder*pow(digits)/fr.d).toString().padStart(digits,'0').replace(/0+$/,'');return quotient.toString()+(fraction?'.'+fraction:'');}
function quantity(s:string,kind:'cpu'|'memory'):{input:string;unit:string;quantity:string;detail:string}{const m=s.trim().match(/^([0-9]+(?:\.[0-9]+)?(?:[eE][+-]?\d{1,3})?)(Ki|Mi|Gi|Ti|Pi|Ei|n|u|m|k|M|G|T|P|E)?$/);
 if(!m)throw Error('Invalid quantity syntax '+s);const unit=m[2]||'';const binary=['Ki','Mi','Gi','Ti','Pi','Ei'];if(kind==='cpu'&&binary.includes(unit))throw Error('Binary SI suffixes are invalid for CPU');
 const decimalsSI:Record<string,number>={n:-9,u:-6,m:-3,'':0,k:3,M:6,G:9,T:12,P:15,E:18};let factor:Fraction;
 if(binary.includes(unit))factor={n:1024n**BigInt(binary.indexOf(unit)+1),d:1n};else if(Object.hasOwn(decimalsSI,unit)){const exp=decimalsSI[unit];factor=exp<0?{n:1n,d:pow(-exp)}:{n:pow(exp),d:1n};}else throw Error('Unknown unit');
 const val=scaled(rational(m[1]),factor);if(val.n.toString().length>120)throw Error('Excessive quantity magnitude');
 return {input:s,unit,quantity:decimals(val),detail:kind==='cpu'?decimals(scaled(val,{n:1000n,d:1n}))+' millicores':decimals(val)+' bytes'};}
export function convert(input:string):Result{const lines=input.split(/\r?\n/).filter(s=>s.trim());if(lines.length<1||lines.length>20)throw Error('Provide 1–20 lines');const result:Record<string,unknown>[]=[];
 for(const line of lines){const m=line.trim().match(/^(cpu|memory)\s*=\s*(\S+)$/i);if(!m)throw Error('Each line must be cpu=QUANTITY or memory=QUANTITY');const kind=m[1].toLowerCase() as 'cpu'|'memory';const q=quantity(m[2],kind);result.push({resource:kind,...q});}
 return{text:JSON.stringify(result,null,2)+'\n',details:{resources:result.length},warnings:['Displayed decimal strings may truncate after 9 fractional digits; remainders remain in intermediate exact fractions.','Kubernetes rounds finer-than-millicore CPU and sub-byte memory requests under API rules; verify against cluster behavior.']};}
