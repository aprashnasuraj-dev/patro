export interface VaccineMilestone {
  days: number;
  label: string;
  note?: string;
}

export const NEPAL_VACCINE_SCHEDULE_SOURCE = {
  authority: "Government of Nepal · Department of Health Services · Family Welfare Division",
  verifiedAt: "2026-09-29",
  url: "https://fwd.gov.np/",
  note: "Routine schedules can change. Confirm with the child's vaccination card or health worker.",
} as const;

export const NEPAL_VACCINE_SCHEDULE: VaccineMilestone[] = [
  { days: 0, label: "BCG", note: "जन्ममा वा स्वास्थ्य संस्थासँग पहिलो सम्पर्कमा" },
  { days: 42, label: "Pentavalent-1 · OPV-1 · PCV-1 · Rotavirus-1 · fIPV-1" },
  { days: 70, label: "Pentavalent-2 · OPV-2 · PCV-2 · Rotavirus-2" },
  { days: 98, label: "Pentavalent-3 · OPV-3 · fIPV-2" },
  { days: 274, label: "MR-1 · PCV-3", note: "करिब ९ महिना" },
  { days: 365, label: "JE", note: "करिब १२ महिना" },
  { days: 456, label: "MR-2 · TCV", note: "करिब १५ महिना" },
];
