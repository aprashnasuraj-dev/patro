import { adToBs, bsToAd } from "../../packages/core/src";
import type { BsAdapter, BsDate } from "@/patro-tools/core/types";

function iso(parts: { year: number; month: number; day: number }) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function adParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Existing BS converter returned an invalid AD date");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Adapter over Patro's existing verified BS ⇄ AD implementation.
 * This file intentionally contains no calendar table of its own.
 */
export const bsAdapter: BsAdapter = {
  toAD(bs: BsDate) {
    return adParts(bsToAd(bs));
  },
  toBS(ad) {
    return adToBs(iso(ad));
  },
};

export default bsAdapter;
