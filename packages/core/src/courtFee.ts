import { SCALE, type DecimalInput, formatScaled, parseScaled } from "./land";

export const NEPAL_CIVIL_COURT_FEE_SOURCE = Object.freeze({
  law: "Muluki Civil Procedure Code, 2074",
  chapter: "Chapter 6 — Court Fee",
  schedule: "Section 70 value-based schedule",
});

export interface CourtFeeBand {
  label: string;
  amountScaled: bigint;
  feeScaled: bigint;
  rateBps: number | null;
}

export interface CivilCourtFeeResult {
  claimAmountScaled: bigint;
  feeScaled: bigint;
  claimAmount: string;
  fee: string;
  bands: CourtFeeBand[];
}

export function calculateCivilCourtFee(claimAmount: DecimalInput): CivilCourtFeeResult {
  const claim = parseScaled(claimAmount);
  if (claim < 0n) throw new RangeError("Claim amount cannot be negative");
  if (claim === 0n) {
    return { claimAmountScaled: 0n, feeScaled: 0n, claimAmount: "0", fee: "0", bands: [] };
  }

  const bands: CourtFeeBand[] = [];
  let fee = 0n;
  let remaining = claim;

  const first = remaining < 25_000n * SCALE ? remaining : 25_000n * SCALE;
  if (first > 0n) {
    const firstFee = 500n * SCALE;
    fee += firstFee;
    bands.push({ label: "First NPR 25,000 (flat)", amountScaled: first, feeScaled: firstFee, rateBps: null });
    remaining -= first;
  }

  const addBand = (label: string, widthNpr: bigint | null, rateBps: number) => {
    if (remaining <= 0n) return;
    const width = widthNpr === null ? remaining : widthNpr * SCALE;
    const amount = remaining < width ? remaining : width;
    const bandFee = (amount * BigInt(rateBps)) / 10_000n;
    fee += bandFee;
    bands.push({ label, amountScaled: amount, feeScaled: bandFee, rateBps });
    remaining -= amount;
  };

  addBand("NPR 25,001–50,000", 25_000n, 500);
  addBand("NPR 50,001–100,000", 50_000n, 350);
  addBand("NPR 100,001–500,000", 400_000n, 200);
  addBand("NPR 500,001–2,500,000", 2_000_000n, 150);
  addBand("Above NPR 2,500,000", null, 100);

  return {
    claimAmountScaled: claim,
    feeScaled: fee,
    claimAmount: formatScaled(claim),
    fee: formatScaled(fee),
    bands,
  };
}
