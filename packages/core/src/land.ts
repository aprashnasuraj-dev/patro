export const SCALE = 1_000_000n;

const SQFT = SCALE;
export const HILL = {
  ropani: 5_476n * SQFT,
  aana: 342_250_000n,
  paisa: 85_562_500n,
  dam: 21_390_625n,
} as const;

export const TERAI = {
  bigha: 72_900n * SQFT,
  kattha: 3_645n * SQFT,
  dhur: 182_250_000n,
} as const;

export type DecimalInput = string | number | bigint;

function normalizeDecimal(value: DecimalInput): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new RangeError("Value must be finite");
    return String(value);
  }
  return value.trim();
}

export function parseScaled(value: DecimalInput, decimals = 6): bigint {
  const raw = normalizeDecimal(value);
  if (!raw) return 0n;
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) throw new TypeError(`Invalid decimal value: ${raw}`);
  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fractionRaw = (match[3] ?? "").slice(0, decimals).padEnd(decimals, "0");
  const fraction = fractionRaw ? BigInt(fractionRaw) : 0n;
  return sign * (whole * 10n ** BigInt(decimals) + fraction);
}

export function formatScaled(value: bigint, decimals = 6, trim = true): string {
  const base = 10n ** BigInt(decimals);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, "0");
  if (trim) fraction = fraction.replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function assertNonNegative(value: bigint, label: string) {
  if (value < 0n) throw new RangeError(`${label} cannot be negative`);
}

function scaledUnitToSqFt(value: DecimalInput, unitSqFtScaled: bigint): bigint {
  const scaledCount = parseScaled(value);
  assertNonNegative(scaledCount, "Area");
  return (scaledCount * unitSqFtScaled) / SCALE;
}

export interface RopaniAreaInput {
  ropani?: DecimalInput;
  aana?: DecimalInput;
  paisa?: DecimalInput;
  dam?: DecimalInput;
}

export interface BighaAreaInput {
  bigha?: DecimalInput;
  kattha?: DecimalInput;
  dhur?: DecimalInput;
}

export interface RopaniBreakdown {
  ropani: bigint;
  aana: bigint;
  paisa: bigint;
  damScaled: bigint;
  remainderSqFtScaled: bigint;
}

export interface BighaBreakdown {
  bigha: bigint;
  kattha: bigint;
  dhurScaled: bigint;
  remainderSqFtScaled: bigint;
}

export function ropaniToSqFt(input: RopaniAreaInput): bigint {
  return (
    scaledUnitToSqFt(input.ropani ?? 0, HILL.ropani) +
    scaledUnitToSqFt(input.aana ?? 0, HILL.aana) +
    scaledUnitToSqFt(input.paisa ?? 0, HILL.paisa) +
    scaledUnitToSqFt(input.dam ?? 0, HILL.dam)
  );
}

export function bighaToSqFt(input: BighaAreaInput): bigint {
  return (
    scaledUnitToSqFt(input.bigha ?? 0, TERAI.bigha) +
    scaledUnitToSqFt(input.kattha ?? 0, TERAI.kattha) +
    scaledUnitToSqFt(input.dhur ?? 0, TERAI.dhur)
  );
}

export function sqFtToRopani(sqFt: DecimalInput): RopaniBreakdown {
  return sqFtScaledToRopani(parseScaled(sqFt));
}

export function sqFtToBigha(sqFt: DecimalInput): BighaBreakdown {
  return sqFtScaledToBigha(parseScaled(sqFt));
}

export function ropaniToBigha(input: RopaniAreaInput): BighaBreakdown {
  return sqFtScaledToBigha(ropaniToSqFt(input));
}

export function bighaToRopani(input: BighaAreaInput): RopaniBreakdown {
  return sqFtScaledToRopani(bighaToSqFt(input));
}

export function sqFtScaledToRopani(sqFtScaled: bigint): RopaniBreakdown {
  assertNonNegative(sqFtScaled, "Square feet");
  let remaining = sqFtScaled;
  const ropani = remaining / HILL.ropani;
  remaining %= HILL.ropani;
  const aana = remaining / HILL.aana;
  remaining %= HILL.aana;
  const paisa = remaining / HILL.paisa;
  remaining %= HILL.paisa;
  const damScaled = (remaining * SCALE) / HILL.dam;
  const represented = (damScaled * HILL.dam) / SCALE;
  return { ropani, aana, paisa, damScaled, remainderSqFtScaled: remaining - represented };
}

export function sqFtScaledToBigha(sqFtScaled: bigint): BighaBreakdown {
  assertNonNegative(sqFtScaled, "Square feet");
  let remaining = sqFtScaled;
  const bigha = remaining / TERAI.bigha;
  remaining %= TERAI.bigha;
  const kattha = remaining / TERAI.kattha;
  remaining %= TERAI.kattha;
  const dhurScaled = (remaining * SCALE) / TERAI.dhur;
  const represented = (dhurScaled * TERAI.dhur) / SCALE;
  return { bigha, kattha, dhurScaled, remainderSqFtScaled: remaining - represented };
}

export function sqFtScaledToSquareMeters(sqFtScaled: bigint): bigint {
  // 1 ft² = 0.09290304 m². Return m² scaled by 1e6.
  return (sqFtScaled * 92_903_040n) / 1_000_000_000n;
}
