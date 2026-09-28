import {
  adToBs,
  bighaToSqFt,
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
} from "../../packages/core/src/index";

type Request =
  | { id: number; type: "font"; direction: "preeti-to-unicode" | "unicode-to-preeti"; input: string; capitalIAsShortI?: boolean }
  | { id: number; type: "land-sqft"; sqft: string }
  | { id: number; type: "land-hill"; ropani: string; aana: string; paisa: string; dam: string }
  | { id: number; type: "land-terai"; bigha: string; kattha: string; dhur: string }
  | { id: number; type: "date-bs"; year: number; month: number; day: number }
  | { id: number; type: "date-ad"; ad: string };

type Response = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

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
    } else {
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
