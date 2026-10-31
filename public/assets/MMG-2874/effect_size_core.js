/* Original browser-side arithmetic for two independent groups only. No network calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EffectSizeCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function calculate(input) {
    const keys = ['n1', 'n2', 'mean1', 'mean2', 'sd1', 'sd2'];
    const v = {};
    for (const key of keys) {
      if (input[key] === '' || input[key] === null || input[key] === undefined) {
        throw new Error('Missing value: ' + key);
      }
      v[key] = Number(input[key]);
      if (!Number.isFinite(v[key])) throw new Error('Non-finite value: ' + key);
    }
    for (const k of ['n1', 'n2']) {
      if (!Number.isSafeInteger(v[k]) || v[k] < 2) throw new Error(k + ' must be an integer of at least 2');
    }
    for (const k of ['sd1', 'sd2']) {
      if (!(v[k] > 0)) throw new Error(k + ' must be positive');
    }
    const df = v.n1 + v.n2 - 2;
    const pooledVariance = ((v.n1 - 1) * v.sd1 * v.sd1 + (v.n2 - 1) * v.sd2 * v.sd2) / df;
    const pooledSD = Math.sqrt(pooledVariance);
    if (!Number.isFinite(pooledSD) || !(pooledSD > 0)) throw new Error('Invalid pooled variance; check SD scale and sample sizes');
    const rawDifference = v.mean1 - v.mean2;
    const d = rawDifference / pooledSD;
    const correction = 1 - 3 / (4 * df - 1);
    const g = correction * d;
    if (![rawDifference, d, g, correction].every(Number.isFinite)) throw new Error('Numerical overflow; rescale inputs');
    return Object.freeze({rawDifference, pooledSD, df, d, correction, g, method: 'independent-pooled-SD', correctionType: 'Hedges J approximation'});
  }
  return Object.freeze({calculate});
});
