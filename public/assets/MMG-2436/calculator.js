/** Mission Mangal Writer 4. Local, deterministic, zero-network aperture comparison. */
export function compareApertures({diameterA, diameterB, obstructionA=0, obstructionB=0, throughputA=1, throughputB=1, baselineMagnitude=null}) {
  const values = [diameterA,diameterB,obstructionA,obstructionB,throughputA,throughputB];
  if (values.some(v=>typeof v!=='number'||!Number.isFinite(v))) throw new RangeError('All optical inputs must be finite numbers.');
  if (diameterA<=0||diameterB<=0) throw new RangeError('Aperture diameters must be positive.');
  if (obstructionA<0||obstructionA>=1||obstructionB<0||obstructionB>=1) throw new RangeError('Obstruction diameter fractions must be between 0 and 1, excluding 1.');
  if (throughputA<=0||throughputA>1||throughputB<=0||throughputB>1) throw new RangeError('Throughput fractions must be greater than 0 and at most 1.');
  if (baselineMagnitude!==null && (typeof baselineMagnitude!=='number'||!Number.isFinite(baselineMagnitude))) throw new RangeError('Baseline magnitude must be finite or omitted.');
  const areaA=Math.PI*diameterA**2*(1-obstructionA**2)/4;
  const areaB=Math.PI*diameterB**2*(1-obstructionB**2)/4;
  const ratio=areaB*throughputB/(areaA*throughputA);
  if (!Number.isFinite(ratio)||ratio<=0) throw new RangeError('Input combination exceeds numerical range.');
  const deltaMagnitude=2.5*Math.log10(ratio);
  const conditionalMagnitude=baselineMagnitude===null?null:baselineMagnitude+deltaMagnitude;
  return {areaA_mm2:areaA,areaB_mm2:areaB,photonRatio:ratio,deltaMagnitude,conditionalMagnitude};
}
function numberFrom(id){const raw=document.getElementById(id).value.trim();if(!raw)throw new RangeError('Required field '+id+' is empty.');const v=Number(raw);if(!Number.isFinite(v))throw new RangeError('Invalid numeric input in '+id);return v;}
if (typeof document!=='undefined') {
  const form=document.getElementById('comparison');
  if(form){const out=document.getElementById('result');const render=()=>{try{
    const baselineRaw=document.getElementById('baseline').value.trim();
    const r=compareApertures({diameterA:numberFrom('diameterA'),diameterB:numberFrom('diameterB'),obstructionA:numberFrom('obstructionA'),obstructionB:numberFrom('obstructionB'),throughputA:numberFrom('throughputA'),throughputB:numberFrom('throughputB'),baselineMagnitude:baselineRaw===''?null:Number(baselineRaw)});
    out.textContent=`Photon ratio B/A: ${r.photonRatio.toFixed(3)}×\nIdeal relative magnitude gain: ${r.deltaMagnitude>=0?'+':''}${r.deltaMagnitude.toFixed(3)} mag\n${r.conditionalMagnitude===null?'No absolute limit inferred (baseline omitted).':`Conditional extrapolation: ${r.conditionalMagnitude.toFixed(3)} mag (same conditions only)`}`;
    out.dataset.state='ok';
  }catch(e){out.textContent='Input error: '+e.message;out.dataset.state='error';}};
  form.addEventListener('input',render);form.addEventListener('submit',e=>{e.preventDefault();render()});render();}
}
