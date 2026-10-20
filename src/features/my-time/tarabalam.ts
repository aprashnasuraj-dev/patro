/** Traditional inclusive counting on the 27-Nakshatra wheel. Public indexes are 1-based. */
export function calculateTara(natal: number, transit: number): { distance: number; taraIndex: number } {
  if (![natal, transit].every(n => Number.isInteger(n) && n >= 1 && n <= 27)) throw new RangeError("invalid_nakshatra_index");
  const distance = ((transit - natal + 27) % 27) + 1;
  const taraIndex = ((distance - 1) % 9) + 1;
  return { distance, taraIndex };
}
