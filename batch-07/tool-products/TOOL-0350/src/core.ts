export function rms(data:Uint8Array){if(!data.length)return 0;let s=0,p=0;for(const x of data){const v=(x-128)/128;s+=v*v;p=Math.max(p,Math.abs(v))}return{rms:Math.sqrt(s/data.length),peak:p}}
