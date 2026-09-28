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
    if (!Number.isInteger(slab.rateBps) || slab.rateBps < 0 || slab.rateBps > 10_000) {
      throw new RangeError("Tax slab rate must be an integer between 0 and 10,000 basis points");
    }
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
  if ([ssf, epf, cit, insurance].some((value) => value < 0n)) {
    throw new RangeError("Tax deductions cannot be negative");
  }
  if (policy.contributionDeductionCap < 0n || policy.contributionSalaryFractionNumerator < 0n || policy.contributionSalaryFractionDenominator <= 0n) {
    throw new RangeError("Invalid contribution deduction policy");
  }
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


export const NEPAL_FY_2083_84 = Object.freeze({
  fiscalYear: "2083/84",
  firstBandScaled: 1_000_000n * SCALE,
  retirementCapOrdinaryScaled: 300_000n * SCALE,
  retirementCapSsfScaled: 500_000n * SCALE,
  lifeInsuranceCapScaled: 40_000n * SCALE,
  healthInsuranceCapScaled: 20_000n * SCALE,
  sourceVersion: "Finance Act 2083 / IRD natural-person rates published 22 Shrawan 2083",
});

export interface NepalSalaryTax2083Input {
  annualSalary: DecimalInput;
  ssf?: DecimalInput;
  epf?: DecimalInput;
  cit?: DecimalInput;
  lifeInsurance?: DecimalInput;
  healthInsurance?: DecimalInput;
  /** Must only be true when the taxpayer qualifies for the contribution-based SSF first-band exemption. */
  qualifyingSsfContributor?: boolean;
}

export interface TaxBandBreakdown {
  fromScaled: bigint;
  toScaled: bigint | null;
  rateBps: number;
  taxableScaled: bigint;
  taxScaled: bigint;
}

export interface NepalSalaryTax2083Result {
  fiscalYear: "2083/84";
  annualSalaryScaled: bigint;
  retirementContributionScaled: bigint;
  retirementDeductionCapScaled: bigint;
  retirementDeductionScaled: bigint;
  lifeInsuranceDeductionScaled: bigint;
  healthInsuranceDeductionScaled: bigint;
  taxableIncomeScaled: bigint;
  taxScaled: bigint;
  monthlyAverageTaxScaled: bigint;
  taxableIncome: string;
  annualTax: string;
  monthlyAverageTax: string;
  bands: TaxBandBreakdown[];
  sourceVersion: string;
}

function nonNegativeScaled(value: DecimalInput | undefined, label: string): bigint {
  const scaled = parseScaled(value ?? 0);
  if (scaled < 0n) throw new RangeError(`${label} cannot be negative`);
  return scaled;
}

function progressiveBreakdown(taxableIncomeScaled: bigint, slabs: readonly TaxSlab[]): TaxBandBreakdown[] {
  if (taxableIncomeScaled <= 0n) return [];
  let lower = 0n;
  const bands: TaxBandBreakdown[] = [];

  for (const slab of slabs) {
    const upper = slab.upto ?? taxableIncomeScaled;
    const taxable = (taxableIncomeScaled < upper ? taxableIncomeScaled : upper) - lower;
    if (taxable > 0n) {
      bands.push({
        fromScaled: lower,
        toScaled: slab.upto,
        rateBps: slab.rateBps,
        taxableScaled: taxable,
        taxScaled: (taxable * BigInt(slab.rateBps)) / 10_000n,
      });
    }
    if (taxableIncomeScaled <= upper || slab.upto === null) break;
    lower = upper;
  }
  return bands;
}

export function calculateNepalSalaryTax2083(
  input: NepalSalaryTax2083Input,
): NepalSalaryTax2083Result {
  const salary = nonNegativeScaled(input.annualSalary, "Annual salary");
  const ssf = nonNegativeScaled(input.ssf, "SSF contribution");
  const epf = nonNegativeScaled(input.epf, "EPF contribution");
  const cit = nonNegativeScaled(input.cit, "CIT contribution");
  const lifeInsurance = nonNegativeScaled(input.lifeInsurance, "Life insurance");
  const healthInsurance = nonNegativeScaled(input.healthInsurance, "Health insurance");

  const qualifyingSsf = input.qualifyingSsfContributor === true;
  const retirementContribution = ssf + epf + cit;
  const oneThirdCap = salary / 3n;
  const monetaryCap = qualifyingSsf
    ? NEPAL_FY_2083_84.retirementCapSsfScaled
    : NEPAL_FY_2083_84.retirementCapOrdinaryScaled;
  const retirementDeduction = minBigInt(retirementContribution, oneThirdCap, monetaryCap);
  const lifeDeduction = minBigInt(lifeInsurance, NEPAL_FY_2083_84.lifeInsuranceCapScaled);
  const healthDeduction = minBigInt(healthInsurance, NEPAL_FY_2083_84.healthInsuranceCapScaled);
  const totalDeductions = retirementDeduction + lifeDeduction + healthDeduction;
  const taxable = salary > totalDeductions ? salary - totalDeductions : 0n;

  const slabs: readonly TaxSlab[] = [
    { upto: 1_000_000n * SCALE, rateBps: qualifyingSsf ? 0 : 100 },
    { upto: 1_500_000n * SCALE, rateBps: 1_000 },
    { upto: 2_500_000n * SCALE, rateBps: 2_000 },
    { upto: 4_000_000n * SCALE, rateBps: 2_700 },
    { upto: null, rateBps: 2_900 },
  ];
  const bands = progressiveBreakdown(taxable, slabs);
  const tax = bands.reduce((sum, band) => sum + band.taxScaled, 0n);
  const monthly = tax / 12n;

  return {
    fiscalYear: "2083/84",
    annualSalaryScaled: salary,
    retirementContributionScaled: retirementContribution,
    retirementDeductionCapScaled: minBigInt(oneThirdCap, monetaryCap),
    retirementDeductionScaled: retirementDeduction,
    lifeInsuranceDeductionScaled: lifeDeduction,
    healthInsuranceDeductionScaled: healthDeduction,
    taxableIncomeScaled: taxable,
    taxScaled: tax,
    monthlyAverageTaxScaled: monthly,
    taxableIncome: formatScaled(taxable),
    annualTax: formatScaled(tax),
    monthlyAverageTax: formatScaled(monthly),
    bands,
    sourceVersion: NEPAL_FY_2083_84.sourceVersion,
  };
}
