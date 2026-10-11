export const number=(x,name,min=0,max=1e7)=>{const n=Number(x);if(x===''||x==null||!Number.isFinite(n)||n<min||n>max)throw Error(`${name} must be between ${min} and ${max}.`);return n;};
export const positive=(x,name)=>number(x,name,0.000001);
