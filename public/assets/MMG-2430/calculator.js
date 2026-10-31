/** Mission Mangal MMG-2430. Dependency-free nominal optical pixel-scale math. */
export const ARCSEC_PER_RADIAN = 180 * 3600 / Math.PI;
export const SMALL_ANGLE_FACTOR = ARCSEC_PER_RADIAN / 1000;

/** @param {{pitchUm:number,focalMm:number,multiplier:number,widthPx:number,heightPx:number,binX:number,binY:number,pitchSigmaUm?:number,focalSigmaMm?:number}} input */
export function calculatePixelScale(input) {
  const {pitchUm, focalMm, multiplier, widthPx, heightPx, binX, binY} = input;
  const pitchSigmaUm = input.pitchSigmaUm ?? 0;
  const focalSigmaMm = input.focalSigmaMm ?? 0;
  const positive = {pitchUm, focalMm, multiplier};
  for (const [name, value] of Object.entries(positive)) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be a positive finite number`);
  }
  for (const [name, value] of Object.entries({widthPx, heightPx, binX, binY})) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer`);
  }
  if (widthPx % binX !== 0 || heightPx % binY !== 0) {
    throw new RangeError('Binning must divide original detector dimensions exactly; cropping is not modeled');
  }
  for (const [name, value] of Object.entries({pitchSigmaUm, focalSigmaMm})) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
  }
  const effectiveFocalMm = focalMm * multiplier;
  if (!Number.isFinite(effectiveFocalMm) || effectiveFocalMm <= 0) throw new RangeError('Effective focal length is outside numeric range');
  const scalePhysicalArcsec = SMALL_ANGLE_FACTOR * pitchUm / effectiveFocalMm;
  const scaleXArcsec = scalePhysicalArcsec * binX;
  const scaleYArcsec = scalePhysicalArcsec * binY;
  const outputWidthPx = widthPx / binX;
  const outputHeightPx = heightPx / binY;
  const fieldWidthArcmin = outputWidthPx * scaleXArcsec / 60;
  const fieldHeightArcmin = outputHeightPx * scaleYArcsec / 60;
  const relativeSigma = Math.hypot(pitchSigmaUm / pitchUm, focalSigmaMm / focalMm);
  const result = {
    effectiveFocalMm, outputWidthPx, outputHeightPx, scalePhysicalArcsec,
    scaleXArcsec, scaleYArcsec, equivalentSquareArcsec: Math.sqrt(scaleXArcsec * scaleYArcsec),
    fieldWidthArcmin, fieldHeightArcmin,
    relativeSigma, scaleXSigmaArcsec: scaleXArcsec * relativeSigma,
    scaleYSigmaArcsec: scaleYArcsec * relativeSigma,
    assumptions: [
      'small-angle approximation', 'square physical pixels',
      'entered optical multiplier is exact', 'no cropping or resampling',
      'uncertainties are independent first-order standard uncertainties',
      'no empirical WCS, distortion, catalog or centroid errors included'
    ]
  };
  for (const [name, value] of Object.entries(result)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new RangeError(`Computed ${name} is outside numeric range`);
  }
  return result;
}
