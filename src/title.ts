export const BRAND = "आफ्नै पात्रो";

export function pageTitle(page?: string | null) {
  return page ? `${page} · ${BRAND}` : `${BRAND} · आजको नेपाली पात्रो, तिथि र चाडपर्व`;
}

export const BS_MONTHS = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कात्तिक","मंसिर","पुस","माघ","फागुन","चैत"];
export const toNepaliDigits = (value: string | number) => String(value).replace(/\d/g, d => "०१२३४५६७८९"[Number(d)]);
export const calendarTitle = (year: number, month: number) => pageTitle(`${BS_MONTHS[month - 1] || month} ${toNepaliDigits(year)} · नेपाली पात्रो`);

export function setPageTitle(page?: string | null) {
  document.title = pageTitle(page);
}
