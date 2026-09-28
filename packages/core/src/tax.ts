import { SCALE, type DecimalInput, parseScaled, formatScaled } from "./land";

export interface TaxSlab {
  /** Inclusive cumulative taxable-income ceiling, scaled NPR. null = no upper bound. */
  upto: bigint | null;
  /** Basis points: 100 = 1%, 1000 = 10%. */
  rateBps: number;
}

export interface TaxPolicy {
  slabs: readonly TaxSlab[];
  contributionDeductionCap: bigint;
  contributionSalaryFractionNumerator: bigint;
  contributionSalaryFractionDenominator: bigint;
}

export interface PersonalTaxInput {
  annualSalary: DecimalInput;
  ssf?: DecimalInput;
  epf?: DecimalInput;
  cit?: DecimalInput;
  insuranceExemption?: DecimalInput;
}

export interface PersonalTaxResult {
  annualSalaryScaled: bigint;
  contributionDeductionScaled: bigint;
  insuranceDeductionScaled: bigint;
  taxableIncomeScaled: bigint;
  taxScaled: bigint;
  taxableIncome: string;
  tax: string;
}

function minBigInt(...values: bigint[]) {
  return values.reduce((min, current) => current < min ? current : min);
}

export function calculateProgressiveTax(taxableIncomeScaled: bigint, slabs: readonly TaxSlab[]): bigint {
  if (taxableIncomeScaled <= 0n) return 0n;
  let lower = 0n;
  let tax = 0n;

  for (const slab of slabs) {
    const upper = slab.upto ?? taxableIncomeScaled;
    if (upper <= lower) throw new RangeError("Tax slabs must be strictly increasing");
    const taxableInSlab = (taxableIncomeScaled < upper ? taxableIncomeScaled : upper) - lower;
    if (taxableInSlab > 0n) {
      tax += (taxableInSlab * BigInt(slab.rateBps)) / 10_000n;
    }
    if (taxableIncomeScaled <= upper || slab.upto === null) break;
    lower = upper;
  }

  return tax;
}

export function calculatePersonalTax(input: PersonalTaxInput, policy: TaxPolicy): PersonalTaxResult {
  const salary = parseScaled(input.annualSalary);
  if (salary < 0n) throw new RangeError("Annual salary cannot be negative");

  const ssf = parseScaled(input.ssf ?? 0);
  const epf = parseScaled(input.epf ?? 0);
  const cit = parseScaled(input.cit ?? 0);
  const insurance = parseScaled(input.insuranceExemption ?? 0);
  const contributionTotal = ssf + epf + cit;
  const salaryFractionCap =
    (salary * policy.contributionSalaryFractionNumerator) /
    policy.contributionSalaryFractionDenominator;
  const contributionDeduction = minBigInt(
    contributionTotal,
    salaryFractionCap,
    policy.contributionDeductionCap,
  );
  const taxable = salary > contributionDeduction + insurance
    ? salary - contributionDeduction - insurance
    : 0n;
  const tax = calculateProgressiveTax(taxable, policy.slabs);

  return {
    annualSalaryScaled: salary,
    contributionDeductionScaled: contributionDeduction,
    insuranceDeductionScaled: insurance,
    taxableIncomeScaled: taxable,
    taxScaled: tax,
    taxableIncome: formatScaled(taxable),
    tax: formatScaled(tax),
  };
}

export const NPR_SCALE = SCALE;
