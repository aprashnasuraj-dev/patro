(() => {
 const nodes = [...document.querySelectorAll('[data-fest-countdown]')];
 if (!nodes.length) return;
 const tick = () => { for (const node of nodes) {
  const end=Date.parse(node.dataset.festCountdown);
  if (!Number.isFinite(end)) {node.textContent='साइत उपलब्ध छैन';continue;}
  const seconds=Math.max(0,Math.ceil((end-Date.now())/1000));
  if(!seconds){node.textContent='निर्धारित साइतको समय भइसकेको छ · Sait time reached';continue;}
  node.textContent=`${Math.floor(seconds/86400)} दिन · ${String(Math.floor(seconds/3600)%24).padStart(2,'0')} घण्टा · ${String(Math.floor(seconds/60)%60).padStart(2,'0')} मिनेट · ${String(seconds%60).padStart(2,'0')} सेकेन्ड`;
 }};
 tick();const timer=setInterval(tick,1000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
