export type BagmatiPrivateVehicleKind = "motorcycle" | "car";

export interface BagmatiRenewalInput {
  kind: BagmatiPrivateVehicleKind;
  engineCc: number;
}

export interface BagmatiRenewalResult {
  fiscalYear: "2083/84";
  province: "Bagmati";
  kind: BagmatiPrivateVehicleKind;
  engineCc: number;
  bracket: string;
  annualTaxNpr: bigint;
  renewalFeeNpr: bigint;
  governmentSubtotalNpr: bigint;
  excludes: readonly string[];
  sourceNote: string;
}

const MOTORCYCLE_BANDS = [
  { maxCc: 125, tax: 3_000n, label: "Up to 125 cc" },
  { maxCc: 150, tax: 5_000n, label: "126–150 cc" },
  { maxCc: 225, tax: 6_500n, label: "151–225 cc" },
  { maxCc: 400, tax: 12_000n, label: "226–400 cc" },
  { maxCc: 650, tax: 25_000n, label: "401–650 cc" },
  { maxCc: Infinity, tax: 35_000n, label: "Above 650 cc" },
] as const;

const CAR_BANDS = [
  { maxCc: 1_000, tax: 22_000n, label: "Up to 1,000 cc" },
  { maxCc: 1_500, tax: 25_000n, label: "1,001–1,500 cc" },
  { maxCc: 2_000, tax: 27_000n, label: "1,501–2,000 cc" },
  { maxCc: 2_500, tax: 37_000n, label: "2,001–2,500 cc" },
  { maxCc: 3_000, tax: 50_000n, label: "2,501–3,000 cc" },
  { maxCc: 3_500, tax: 65_000n, label: "3,001–3,500 cc" },
  { maxCc: Infinity, tax: 70_000n, label: "Above 3,500 cc" },
] as const;

/**
 * Bagmati FY 2083/84 private ICE renewal estimator.
 *
 * The current 2083 Transport Management Office publication confirms the
 * FY 2083 Economic Act is in force. ICE annual-tax bands are carried from
 * the official FY 2082 Act and cross-checked against current FY 2083/84
 * published rate references reporting these bands unchanged.
 *
 * Deliberately excludes EVs, late penalties, insurance, inspection,
 * arrears, age surcharges and concessions until each current schedule is
 * independently versioned and tested.
 */
export function calculateBagmatiPrivateRenewal2083(
  input: BagmatiRenewalInput,
): BagmatiRenewalResult {
  if (!Number.isInteger(input.engineCc) || input.engineCc <= 0) {
    throw new RangeError("Engine capacity must be a positive whole number of cc");
  }

  const bands = input.kind === "motorcycle" ? MOTORCYCLE_BANDS : CAR_BANDS;
  const selected = bands.find((band) => input.engineCc <= band.maxCc);
  if (!selected) throw new RangeError("No vehicle tax band found");

  const renewalFeeNpr = input.kind === "motorcycle" ? 300n : 500n;
  return {
    fiscalYear: "2083/84",
    province: "Bagmati",
    kind: input.kind,
    engineCc: input.engineCc,
    bracket: selected.label,
    annualTaxNpr: selected.tax,
    renewalFeeNpr,
    governmentSubtotalNpr: selected.tax + renewalFeeNpr,
    excludes: [
      "third-party insurance",
      "late penalties",
      "arrears",
      "inspection or pollution fees",
      "vehicle-age surcharges",
      "concessions and exemptions",
    ],
    sourceNote:
      "Bagmati Economic Act vehicle-tax schedule; current scope is private petrol/diesel motorcycle and car/jeep/van only.",
  };
}
