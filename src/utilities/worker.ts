import qrcode from "qrcode-generator";
import {
  adToBs,
  bighaToSqFt,
  calculateNepalSalaryTax2083,
  bsDateMetadata,
  bsToAd,
  formatBsDate,
  formatScaled,
  preetiToUnicode,
  ropaniToSqFt,
  sqFtScaledToBigha,
  sqFtScaledToRopani,
  sqFtToBigha,
  sqFtToRopani,
  unicodeToPreeti,
  utf8Bytes,
} from "../../packages/core/src/index";

type Request =
  | { id: number; type: "font"; direction: "preeti-to-unicode" | "unicode-to-preeti"; input: string; capitalIAsShortI?: boolean }
  | { id: number; type: "land-sqft"; sqft: string }
  | { id: number; type: "land-hill"; ropani: string; aana: string; paisa: string; dam: string }
  | { id: number; type: "land-terai"; bigha: string; kattha: string; dhur: string }
  | { id: number; type: "date-bs"; year: number; month: number; day: number }
  | { id: number; type: "date-ad"; ad: string }
  | { id: number; type: "tax-2083"; annualSalary: string; ssf: string; epf: string; cit: string; lifeInsurance: string; healthInsurance: string; qualifyingSsfContributor: boolean }
  | { id: number; type: "qr"; text: string; errorCorrectionLevel?: "L" | "M" | "Q" | "H" };

type Response = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

qrcode.stringToBytes = utf8Bytes;

function serializeHill(value: ReturnType<typeof sqFtToRopani>) {
  return {
    ropani: value.ropani.toString(),
    aana: value.aana.toString(),
    paisa: value.paisa.toString(),
    dam: formatScaled(value.damScaled),
  };
}

function serializeTerai(value: ReturnType<typeof sqFtToBigha>) {
  return {
    bigha: value.bigha.toString(),
    kattha: value.kattha.toString(),
    dhur: formatScaled(value.dhurScaled),
  };
}

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  let response: Response;

  try {
    if (request.type === "font") {
      response = {
        id: request.id,
        ok: true,
        result: request.direction === "preeti-to-unicode"
          ? preetiToUnicode(request.input, { capitalIAsShortI: request.capitalIAsShortI })
          : unicodeToPreeti(request.input),
      };
    } else if (request.type === "land-sqft") {
      response = {
        id: request.id,
        ok: true,
        result: {
          hill: serializeHill(sqFtToRopani(request.sqft || "0")),
          terai: serializeTerai(sqFtToBigha(request.sqft || "0")),
        },
      };
    } else if (request.type === "land-hill") {
      const total = ropaniToSqFt(request);
      response = {
        id: request.id,
        ok: true,
        result: {
          sqft: formatScaled(total),
          terai: serializeTerai(sqFtScaledToBigha(total)),
        },
      };
    } else if (request.type === "land-terai") {
      const total = bighaToSqFt(request);
      response = {
        id: request.id,
        ok: true,
        result: {
          sqft: formatScaled(total),
          hill: serializeHill(sqFtScaledToRopani(total)),
        },
      };
    } else if (request.type === "date-bs") {
      const bs = { year: request.year, month: request.month, day: request.day };
      response = {
        id: request.id,
        ok: true,
        result: {
          ad: bsToAd(bs),
          bs: formatBsDate(bs),
          metadata: bsDateMetadata(bs),
        },
      };
    } else if (request.type === "date-ad") {
      const bs = adToBs(request.ad);
      response = {
        id: request.id,
        ok: true,
        result: {
          ad: request.ad,
          bs: formatBsDate(bs),
          parts: bs,
          metadata: bsDateMetadata(bs),
        },
      };
    } else if (request.type === "tax-2083") {
      const tax = calculateNepalSalaryTax2083(request);
      response = {
        id: request.id,
        ok: true,
        result: {
          fiscalYear: tax.fiscalYear,
          taxableIncome: tax.taxableIncome,
          annualTax: tax.annualTax,
          monthlyAverageTax: tax.monthlyAverageTax,
          retirementDeduction: formatScaled(tax.retirementDeductionScaled),
          retirementDeductionCap: formatScaled(tax.retirementDeductionCapScaled),
          lifeInsuranceDeduction: formatScaled(tax.lifeInsuranceDeductionScaled),
          healthInsuranceDeduction: formatScaled(tax.healthInsuranceDeductionScaled),
          sourceVersion: tax.sourceVersion,
          bands: tax.bands.map((band) => ({
            rateBps: band.rateBps,
            taxable: formatScaled(band.taxableScaled),
            tax: formatScaled(band.taxScaled),
          })),
        },
      };
    } else if (request.type === "qr") {
      const text = request.text.trim();
      if (!text) throw new RangeError("QR text cannot be empty");
      const qr = qrcode(0, request.errorCorrectionLevel ?? "M");
      qr.addData(text, "Byte");
      qr.make();
      response = {
        id: request.id,
        ok: true,
        result: {
          dataUrl: qr.createDataURL(6, 24),
          modules: qr.getModuleCount(),
          bytes: utf8Bytes(text).length,
        },
      };
    }
  } catch (error) {
    response = {
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "Calculation failed",
    };
  }

  self.postMessage(response);
};

export {};
