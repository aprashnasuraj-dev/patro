import { adToBs, bsToAd } from "../../packages/core/src/bsDate";
import type { BsAdapter } from "@/patro-tools/core/types";

function iso(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export const bsAdapter: BsAdapter = {
  toAD(bs) {
    const [year, month, day] = bsToAd(bs).split("-").map(Number);
    return { year, month, day };
  },
  toBS(ad) {
    return adToBs(iso(ad));
  },
};
