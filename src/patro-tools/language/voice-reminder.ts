import { convertSpokenNepaliNumbers } from './voice-numbers';
export type VoiceReminderDraft = { kind: 'reminder' | 'tithi'; title: string; date: string; time: string; eventKind?: 'shraddha' | 'tithi_birthday' | 'puja' | 'vrata' | 'custom'; warnings: string[] };
const MONTHS: Record<string, number> = { बैशाख: 1, वैशाख: 1, जेठ: 2, जेष्ठ: 2, असार: 3, आषाढ: 3, साउन: 4, श्रावण: 4, भदौ: 5, भाद्र: 5, असोज: 6, आश्विन: 6, कार्तिक: 7, कात्तिक: 7, मंसिर: 8, पौष: 9, पुष: 9, माघ: 10, फागुन: 11, चैत: 12, चैत्र: 12 };
function validDate(date: string) { const parsed = new Date(date + 'T00:00:00Z'); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date; }
function addDays(date: string, days: number) { const value = new Date(date + 'T00:00:00Z'); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }

export function parseVoiceReminder(raw: string, context: { today: string; bsYear: number; toAD: (year: number, month: number, day: number) => string }): VoiceReminderDraft | null {
  const text = convertSpokenNepaliNumbers(raw).replace(/[०-९]/g, char => String('०१२३४५६७८९'.indexOf(char))).trim();
  if (!validDate(context.today)) return null;
  const warnings: string[] = [];
  let date = '', title = text;
  const relative = /पर्सि|भोलि|आज|day after tomorrow|tomorrow|today/i.exec(text);
  const bs = new RegExp(`(?:(\\d{4})\\s*(?:साल|वर्ष)?\\s*)?(${Object.keys(MONTHS).join('|')})\\s*(\\d{1,2})\\s*(?:गते)?`).exec(text);
  const ad = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  try {
    if (bs) {
      const explicitYear = !!bs[1]; let year = explicitYear ? Number(bs[1]) : context.bsYear;
      date = context.toAD(year, MONTHS[bs[2]], Number(bs[3]));
      if (!explicitYear && date < context.today) date = context.toAD(++year, MONTHS[bs[2]], Number(bs[3]));
      if (!explicitYear) warnings.push('वर्ष नबोलिएकाले आगामी BS मिति लिइएको छ। तिथिको मूल वर्ष/मिति पक्का गर्नुहोस्।');
      title = title.replace(bs[0], '');
    } else if (ad) { date = ad[1]; title = title.replace(ad[0], ''); }
    else if (relative) {
      date = addDays(context.today, /पर्सि|day after/i.test(relative[0]) ? 2 : /भोलि|tomorrow/i.test(relative[0]) ? 1 : 0);
      title = title.replace(relative[0], '');
    }
  } catch { return null; }
  if (!validDate(date)) return null;
  const clock = /(बिहान|दिउँसो|बेलुका|साँझ|राति|morning|evening)?\s*(\d{1,2})(?::(\d{2})|\s*बजेर\s*(\d{1,2}))?\s*(?:बजे|o'clock|a\.?m\.?|p\.?m\.?)/i.exec(title);
  let time = '07:00';
  if (clock) {
    let hour = Number(clock[2]); const minute = Number(clock[3] || clock[4] || 0);
    const evening = /बेलुका|साँझ|दिउँसो|राति|evening|p\.?m/i.test(clock[0]);
    const morning = /बिहान|morning|a\.?m/i.test(clock[0]);
    if (hour > 23 || minute > 59) return null;
    if (evening && hour < 12) hour += 12;
    if ((morning || /राति/.test(clock[0])) && hour === 12) hour = 0;
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    title = title.replace(clock[0], '');
    if (!morning && !evening && hour < 12) warnings.push('बिहान/बेलुका पक्का गर्नुहोस्।');
  } else warnings.push('समय नबोलिएकाले 07:00 NPT राखिएको छ; परिवर्तन गर्न सक्नुहुन्छ।');
  title = title.replace(/\bAD\b|\bremind me\b|सम्झना राख|सम्झाउनुहोस्|पूर्णविराम|[।?]/gi, '').replace(/\s+/g, ' ').trim();
  if (!title) return null;
  return { kind: /तिथि|श्राद्ध/.test(text) ? 'tithi' : 'reminder', title: title.slice(0, 100), date, time, eventKind: /श्राद्ध/.test(text) ? 'shraddha' : /जन्म/.test(text) ? 'tithi_birthday' : 'custom', warnings };
}
