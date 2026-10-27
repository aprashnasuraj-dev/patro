export function dof(f:number,N:number,c:number,sM:number){if(!(f>0&&N>0&&c>0&&sM>0))throw new Error('All inputs must be positive.');const s=sM*1000,H=f*f/(N*c)+f,near=H*s/(H+(s-f)),den=H-(s-f),far=den<=0?Infinity:H*s/den;return{H:H/1000,near:near/1000,far:Number.isFinite(far)?far/1000:Infinity,dof:Number.isFinite(far)?(far-near)/1000:Infinity}}

