const w=globalThis;
if(!w.MathJax?.tex2svgPromise){
  const prior=w.MathJax||{};
  w.MathJax={...prior,startup:{...(prior.startup||{}),typeset:false}};
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='/vendor/mathjax/tex-svg.js';
    s.defer=true;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('Local MathJax tex-svg runtime failed to load.'));
    document.head.appendChild(s);
  });
  await w.MathJax.startup?.promise;
}
export {};
