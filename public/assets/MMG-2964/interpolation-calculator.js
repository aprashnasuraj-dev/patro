/* AafnaiPatro Research Desk. Original, dependency-free two-point interpolation uncertainty engine.
 * Standard uncertainties and first-order propagation; endpoints x0/x1 treated as exact.
 * No networking, storage, analytics or external libraries.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.InterpolationUncertainty = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function compute(input) {
    const fields = ['x0', 'y0', 'u0', 'x1', 'y1', 'u1', 'x'];
    if (!input || typeof input !== 'object') throw new TypeError('Input object required');
    for (const field of fields) {
      if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) {
        throw new RangeError(field + ' must be a finite number');
      }
    }
    const rho = input.rho === undefined ? 0 : input.rho;
    const ux = input.ux === undefined ? 0 : input.ux;
    if (typeof rho !== 'number' || !Number.isFinite(rho) || rho < -1 || rho > 1) {
      throw new RangeError('rho must be a finite number from -1 to +1');
    }
    if (typeof ux !== 'number' || !Number.isFinite(ux) || ux < 0) {
      throw new RangeError('ux must be a nonnegative finite standard uncertainty');
    }
    if (input.u0 < 0 || input.u1 < 0) throw new RangeError('endpoint standard uncertainties must be nonnegative');
    if (input.x0 === input.x1) throw new RangeError('x0 and x1 must be distinct');
    const lo = Math.min(input.x0, input.x1), hi = Math.max(input.x0, input.x1);
    if (input.x < lo || input.x > hi) throw new RangeError('target x is outside the interpolation interval');
    const t = (input.x - input.x0) / (input.x1 - input.x0);
    const slope = (input.y1 - input.y0) / (input.x1 - input.x0);
    const y = (1 - t) * input.y0 + t * input.y1;
    const variance0 = (1 - t) ** 2 * input.u0 ** 2;
    const variance1 = t ** 2 * input.u1 ** 2;
    const covarianceTerm = 2 * t * (1 - t) * rho * input.u0 * input.u1;
    const xVariance = (slope * ux) ** 2;
    const rawVariance = variance0 + variance1 + covarianceTerm + xVariance;
    const scale = Math.max(variance0 + variance1 + Math.abs(covarianceTerm) + xVariance, 1);
    if (rawVariance < -1e-12 * scale) throw new RangeError('negative variance: invalid input covariance');
    const variance = Math.max(0, rawVariance);
    return {x: input.x, t, y, u: Math.sqrt(variance), variance,
      slope, variance0, variance1, covarianceTerm, xVariance,
      model: 'first-order standard uncertainty; endpoint x coordinates exact; no curvature bias'};
  }
  function series(input, points = 41) {
    if (!Number.isInteger(points) || points < 2 || points > 1001) throw new RangeError('points must be an integer from 2 to 1001');
    return Array.from({length: points}, (_, i) => {
      const x = input.x0 + (input.x1 - input.x0) * i / (points - 1);
      return compute({...input, x});
    });
  }
  return Object.freeze({compute, series, version: '1.0.0'});
});
