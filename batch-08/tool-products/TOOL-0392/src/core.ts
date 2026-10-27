export function crop(sensorW:number,sensorH:number,f:number,N:number){if(!(sensorW>0&&sensorH>0&&f>0&&N>0))throw new Error('All values must be positive.');const diag=Math.hypot(sensorW,sensorH),ff=Math.hypot(36,24),cf=ff/diag,eq=f*cf,eqN=N*cf;const a=(d:number)=>2*Math.atan(d/(2*f))*180/Math.PI;return{diag,cf,eq,eqN,hfov:a(sensorW),vfov:a(sensorH),dfov:a(diag)}}

