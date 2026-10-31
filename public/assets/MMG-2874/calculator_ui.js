/* Standalone accessible browser UI. No remote services, storage, analytics or eval. */
(function () {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  function node(tag, attrs, text) {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, String(v));
    if (text !== undefined) e.textContent = String(text);
    return e;
  }
  function chart(svg, value) {
    svg.replaceChildren();
    svg.append(node('line', {x1:30, y1:100, x2:570, y2:100, stroke:'#dce5ee', 'stroke-width':8, 'stroke-linecap':'round'}));
    svg.append(node('line', {x1:300, y1:40, x2:300, y2:160, stroke:'#26344c', 'stroke-width':2}));
    for (let k = -3; k <= 3; k++) {
      const x = 300 + k * 90;
      svg.append(node('line', {x1:x, y1:94, x2:x, y2:106, stroke:'#63758a', 'stroke-width':1}));
      svg.append(node('text', {x, y:130, fill:'#34465d', 'font-size':15, 'text-anchor':'middle'}, k));
    }
    const clamped = Math.max(-3, Math.min(3, value));
    const end = 300 + 90 * clamped;
    svg.append(node('line', {x1:300, y1:100, x2:end, y2:100, stroke:value >= 0 ? '#167b80' : '#d47540', 'stroke-width':18, 'stroke-linecap':'round'}));
    svg.append(node('circle', {cx:end, cy:100, r:10, fill:value >= 0 ? '#167b80' : '#d47540'}));
    svg.append(node('text', {x:300, y:25, fill:'#17263e', 'font-size':17, 'text-anchor':'middle'}, 'Hedges g on a fixed -3 to +3 display scale'));
    if (Math.abs(value) > 3) svg.append(node('text', {x:300, y:155, fill:'#9a442d', 'font-size':14, 'text-anchor':'middle'}, 'Marker clipped at display limit; numeric result remains exact'));
  }
  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('effect-form');
    const result = document.getElementById('result');
    const plot = document.getElementById('effect-plot');
    const inputs = ['n1','n2','mean1','mean2','sd1','sd2'];
    function compute() {
      try {
        const values = Object.fromEntries(inputs.map(id => [id, document.getElementById(id).value]));
        const x = EffectSizeCore.calculate(values);
        result.textContent = `Raw mean difference: ${x.rawDifference.toFixed(4)} units. Pooled SD: ${x.pooledSD.toFixed(4)} units. Cohen d: ${x.d.toFixed(4)}. Hedges g (approximate correction): ${x.g.toFixed(4)}. J: ${x.correction.toFixed(5)}; df: ${x.df}.`;
        result.dataset.state = 'ok';
        chart(plot, x.g);
      } catch (e) {
        result.textContent = 'Input error: ' + e.message;
        result.dataset.state = 'error';
        plot.replaceChildren();
      }
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); compute(); });
    document.getElementById('swap').addEventListener('click', function () {
      for (const [a,b] of [['n1','n2'],['mean1','mean2'],['sd1','sd2']]) {
        const elA=document.getElementById(a), elB=document.getElementById(b), tmp=elA.value;
        elA.value=elB.value; elB.value=tmp;
      }
      compute();
    });
    document.getElementById('reset').addEventListener('click', function () { form.reset(); compute(); });
    compute();
  });
})();
